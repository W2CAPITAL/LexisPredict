'use server';

import { formatDateToISO, type LegalCase } from '@/lib/case-logic';
import { getSupabaseAdmin, getUserContext } from '@/lib/server-db';
import { sheetRowsToLegalCases } from '@/lib/hybrid/sheets-case-map';
import { sheetsListProcessos, sheetsWebhookConfigured } from '@/lib/hybrid/sheets-server';

type CompanyUser = {
  auth_user_id: string | null;
  nome: string | null;
  email: string | null;
};

export type PlanilhaCarteiraSeedResult = {
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  totalBefore: number;
  sourceRows: number;
  inserted: number;
  assigned: number;
  unassigned: number;
  rebound: number;
  unresolvedAssistentes: string[];
};

function normalizePerson(value: unknown): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9@]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase();
}

function assistantLabel(c: LegalCase): string {
  return String((c as any).assistente || (c as any).atendente || '').trim();
}

function resolveAssistantOwner(label: string, users: CompanyUser[]): string | null {
  const normalized = normalizePerson(label);
  if (!normalized) return null;

  // A tabela processos ainda possui um único created_by. Atribuições compartilhadas
  // ("KRIS / DRIKA") permanecem sem owner técnico até o modelo suportar N:N.
  if (/[\/;,|&+]/.test(label)) return null;

  const candidates = users.filter((u) => {
    if (!u.auth_user_id) return false;
    const name = normalizePerson(u.nome);
    const email = normalizePerson(u.email);
    if (!name && !email) return false;
    if (normalized === name || normalized === email) return true;

    // Compatibilidade: perfil atual pode estar como "DAVI" enquanto a planilha
    // usa "DAVI ALVES FIGUEREDO". Só aceita quando a correspondência é única.
    if (name && (normalized.startsWith(name + ' ') || name.startsWith(normalized + ' '))) {
      return true;
    }
    return false;
  });

  return candidates.length === 1 ? String(candidates[0].auth_user_id) : null;
}

function dateOrNull(value: unknown): string | null {
  const out = formatDateToISO(value as any);
  return out && /^\d{4}-\d{2}-\d{2}$/.test(out) ? out : null;
}

function dbPayload(c: LegalCase, empresaId: string, ownerId: string | null) {
  const assistente = assistantLabel(c);
  const legacyCreatedBy = String((c as any).created_by || '').trim() || null;
  const dados = {
    ...(c as any),
    assistente: assistente || null,
    atendente: assistente || null,
    carteira_owner_source: 'Assistente',
    carteira_owner_label: assistente || null,
    created_by_legacy: legacyCreatedBy,
    created_by: ownerId,
  };

  return {
    empresa_id: empresaId,
    protocolo_ref: String(c.protocolo || '').trim(),
    created_by: ownerId,
    status: c.status || 'Sem Prazo',
    risco: (c as any).risco || 'Normal',
    tribunal: c.tribunal || 'Outros',
    advogado: c.advogado || 'NÃO ATRIBUÍDO',
    escritorio: c.escritorio || null,
    telefone: c.telefone || '',
    observacoes: c.observacao || '',
    ultimo_retorno: dateOrNull(c.ultimoRetorno),
    proximo_retorno: dateOrNull(c.proximoPrazo),
    atendido_por: (c as any).atendido_por || null,
    status_interno: c.situacao || null,
    datajud_ultimo_nome: (c as any).datajud_ultimo_nome || null,
    datajud_encerrado_tribunal: !!(c as any).datajud_encerrado_tribunal,
    em_cumprimento_sentenca: !!(c as any).em_cumprimento_sentenca,
    indicio_busca_apreensao: !!(c as any).indicio_busca_apreensao,
    djen_ultimo_resumo: (c as any).djen_ultimo_resumo || null,
    dados,
  };
}

async function rebindUnassigned(
  admin: Awaited<ReturnType<typeof getSupabaseAdmin>>,
  empresaId: string,
  users: CompanyUser[]
): Promise<number> {
  const { data, error } = await admin
    .from('processos')
    .select('id,dados')
    .eq('empresa_id', empresaId)
    .is('created_by', null)
    .limit(5000);

  if (error) throw error;

  const idsByOwner = new Map<string, Array<number | string>>();
  for (const row of data || []) {
    const d = row?.dados && typeof row.dados === 'object' ? row.dados : {};
    const label = String(d.assistente || d.atendente || d.carteira_owner_label || '').trim();
    const ownerId = resolveAssistantOwner(label, users);
    if (!ownerId) continue;
    const ids = idsByOwner.get(ownerId) || [];
    ids.push(row.id);
    idsByOwner.set(ownerId, ids);
  }

  let rebound = 0;
  for (const [ownerId, ids] of idsByOwner) {
    for (let i = 0; i < ids.length; i += 250) {
      const slice = ids.slice(i, i + 250);
      const { data: updated, error: updateError } = await admin
        .from('processos')
        .update({ created_by: ownerId })
        .in('id', slice)
        .is('created_by', null)
        .select('id');
      if (updateError) throw updateError;
      rebound += updated?.length || 0;
    }
  }
  return rebound;
}

/**
 * Bootstrap idempotente Planilha -> Postgres.
 *
 * Regra de carteira:
 * - Assistente = atribuição operacional (fonte autoritativa na planilha)
 * - created_by = UUID técnico usado pelo RLS enquanto o schema legado não possui assigned_user_id
 * - AtendidoPor = crédito de atendimento, nunca troca o dono
 *
 * Registros já existentes no Postgres são preservados.
 */
export async function ensurePlanilhaCarteiraSeededAction(): Promise<PlanilhaCarteiraSeedResult> {
  const empty: PlanilhaCarteiraSeedResult = {
    ok: false,
    totalBefore: 0,
    sourceRows: 0,
    inserted: 0,
    assigned: 0,
    unassigned: 0,
    rebound: 0,
    unresolvedAssistentes: [],
  };

  const ctx = await getUserContext();
  if (!ctx?.empresa_id || !ctx?.auth_id) {
    return { ...empty, reason: 'Sessão expirada.' };
  }

  if (!(ctx.isAdministrador || ctx.isSupervisor || ctx.isSuperAdmin)) {
    return { ...empty, skipped: true, reason: 'Perfil sem permissão para sincronizar a carteira.' };
  }

  const admin = await getSupabaseAdmin();
  const empresaId = String(ctx.empresa_id);

  // Isolamento multiempresa: um webhook de Sheets aponta para uma carteira concreta.
  // Em instalação single-tenant podemos inferir com segurança. Ao existir mais de
  // uma empresa, a variável abaixo passa a ser obrigatória.
  const configuredEmpresaId = String(process.env.LEXIS_SHEETS_EMPRESA_ID || '').trim();
  if (configuredEmpresaId && configuredEmpresaId !== empresaId) {
    return {
      ...empty,
      skipped: true,
      reason: 'A planilha configurada pertence a outra empresa.',
    };
  }
  if (!configuredEmpresaId) {
    const { count: companyCount, error: companyCountError } = await admin
      .from('empresas')
      .select('id', { count: 'exact', head: true });
    if (companyCountError) throw companyCountError;
    if (Number(companyCount || 0) !== 1) {
      return {
        ...empty,
        skipped: true,
        reason: 'Defina LEXIS_SHEETS_EMPRESA_ID antes do bootstrap em ambiente multiempresa.',
      };
    }
  }

  const { data: usersRaw, error: usersError } = await admin
    .from('usuarios')
    .select('auth_user_id,nome,email')
    .eq('empresa_id', empresaId);
  if (usersError) throw usersError;
  const users = (usersRaw || []) as CompanyUser[];

  // Sempre tenta reatribuir registros sem dono. Assim novas contas de assistentes
  // passam a enxergar sua carteira sem reimportar ou apagar dados.
  let rebound = await rebindUnassigned(admin, empresaId, users);

  const { count, error: countError } = await admin
    .from('processos')
    .select('id', { count: 'exact', head: true })
    .eq('empresa_id', empresaId);
  if (countError) throw countError;
  const totalBefore = Number(count || 0);

  // Depois do primeiro bootstrap, o Postgres é a fonte de verdade operacional.
  // Evita reintroduzir dados antigos da planilha sobre edições feitas no app.
  if (totalBefore >= 100) {
    return {
      ...empty,
      ok: true,
      skipped: true,
      reason: 'Carteira já inicializada; somente rebind de assistentes foi executado.',
      totalBefore,
      rebound,
    };
  }

  if (!sheetsWebhookConfigured()) {
    return {
      ...empty,
      totalBefore,
      rebound,
      skipped: true,
      reason: 'Webhook da planilha não configurado.',
    };
  }

  const listed = await sheetsListProcessos({ limit: 5000 });
  if (!listed.ok) {
    return {
      ...empty,
      totalBefore,
      rebound,
      reason: listed.error || 'Falha ao ler a planilha.',
    };
  }

  const cases = sheetRowsToLegalCases(listed.rows || []);
  const { data: existingRaw, error: existingError } = await admin
    .from('processos')
    .select('protocolo_ref')
    .eq('empresa_id', empresaId)
    .limit(5000);
  if (existingError) throw existingError;

  const existing = new Set(
    (existingRaw || []).map((r: any) => String(r.protocolo_ref || '').trim()).filter(Boolean)
  );

  const unresolved = new Set<string>();
  let assigned = 0;
  let unassigned = 0;

  const payload = cases.flatMap((c) => {
    const protocolo = String(c.protocolo || '').trim();
    if (!protocolo || existing.has(protocolo)) return [];

    const label = assistantLabel(c);
    const ownerId = resolveAssistantOwner(label, users);
    if (ownerId) assigned++;
    else {
      unassigned++;
      if (label) unresolved.add(label);
    }
    return [dbPayload(c, empresaId, ownerId)];
  });

  let inserted = 0;
  for (let i = 0; i < payload.length; i += 250) {
    const chunk = payload.slice(i, i + 250);
    const { data: written, error: writeError } = await admin
      .from('processos')
      .upsert(chunk, {
        onConflict: 'empresa_id,protocolo_ref',
        ignoreDuplicates: true,
      })
      .select('id');
    if (writeError) throw writeError;
    inserted += written?.length || 0;
  }

  // Um perfil pode ter sido criado enquanto o lote era gravado; rebind é barato
  // e mantém o fluxo idempotente.
  rebound += await rebindUnassigned(admin, empresaId, users);

  return {
    ok: true,
    totalBefore,
    sourceRows: cases.length,
    inserted,
    assigned,
    unassigned,
    rebound,
    unresolvedAssistentes: Array.from(unresolved).sort(),
  };
}
