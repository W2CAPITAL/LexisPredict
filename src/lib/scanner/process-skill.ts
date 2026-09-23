import { fetchDataJud, resolveDataJudAlias } from '@/lib/datajud';
import { fetchDjenComunicacoes, type DjenComunicacao } from '@/lib/djen';
import { classifyRuntimeError, recoveryChecklist } from '@/lib/agent-runtime/error-recovery';
import type { LexisAgentTrace } from '@/lib/agent-runtime/types';

export type ProcessScannerSourceStatus = {
  source: 'DataJud' | 'DJEN';
  ok: boolean;
  found: boolean;
  count: number;
  latencyMs?: number;
  error?: string;
  recovery?: string[];
};

export type ProcessScannerSkillResult = {
  success: boolean;
  partial: boolean;
  protocolo: string;
  digits: string;
  tribunalAlias: string;
  headline: string;
  datajud: any;
  djen: {
    success: boolean;
    count: number;
    items: DjenComunicacao[];
    error?: string;
    isGeoBlocked?: boolean;
    isRateLimited?: boolean;
  };
  sources: ProcessScannerSourceStatus[];
  trace: LexisAgentTrace[];
  hypotheses: string[];
  nextSteps: string[];
  fetchedAt: string;
};

function maskCnj(digits: string) {
  return `${digits.slice(0, 7)}-${digits.slice(7, 9)}.${digits.slice(9, 13)}.${digits.slice(13, 14)}.${digits.slice(14, 16)}.${digits.slice(16, 20)}`;
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function djenWithRecovery(protocolo: string) {
  const first = await fetchDjenComunicacoes(protocolo);
  if (first.success) return first;

  // 403 de geo não melhora com retry imediato. 429/timeout/transiente pode.
  if (first.isGeoBlocked) return first;
  if (first.isRateLimited) await wait(5_500);
  else await wait(900);

  const second = await fetchDjenComunicacoes(protocolo);
  return second.success ? second : first;
}

export async function runProcessScannerSkill(protocolo: string): Promise<ProcessScannerSkillResult> {
  const digits = String(protocolo || '').replace(/\D/g, '');
  if (digits.length !== 20) throw new Error('CNJ inválido: informe 20 dígitos.');

  const masked = maskCnj(digits);
  const tribunalAlias = resolveDataJudAlias(digits);
  const trace: LexisAgentTrace[] = [
    { id: 'route', phase: 'route', label: 'Roteamento CNJ', ok: true, detail: `${masked} → ${tribunalAlias.toUpperCase()}` },
  ];

  const t0 = Date.now();
  const [djState, djenState] = await Promise.allSettled([
    fetchDataJud(masked, 1, { fast: false }),
    djenWithRecovery(masked),
  ]);

  const datajud = djState.status === 'fulfilled'
    ? djState.value
    : { numeroProcesso: masked, movimentos: [], error: true, message: String(djState.reason?.message || djState.reason || 'Falha DataJud') };

  const djen = djenState.status === 'fulfilled'
    ? djenState.value
    : { success: false, count: 0, items: [], error: String(djenState.reason?.message || djenState.reason || 'Falha DJEN') };

  const djMovements = Array.isArray(datajud?.movimentos) ? datajud.movimentos : [];
  const djOk = !datajud?.error;
  const djenOk = !!djen?.success;
  const djFound = djOk && (!!datajud?.classe || !!datajud?.orgaoJulgador || djMovements.length > 0);
  const djenFound = djenOk && Number(djen?.count || djen?.items?.length || 0) > 0;

  const sources: ProcessScannerSourceStatus[] = [];

  if (djOk) {
    sources.push({ source: 'DataJud', ok: true, found: djFound, count: djMovements.length, latencyMs: datajud?.latency });
    trace.push({
      id: 'datajud',
      phase: 'tool',
      label: 'DataJud',
      ok: true,
      detail: djFound ? `${djMovements.length} movimento(s); processo localizado.` : 'Consulta concluída sem metadado público suficiente.',
      tool: 'scan_datajud',
      durationMs: datajud?.latency,
    });
  } else {
    const shape = classifyRuntimeError(datajud?.message || 'Falha DataJud');
    sources.push({ source: 'DataJud', ok: false, found: false, count: 0, latencyMs: datajud?.latency, error: datajud?.message, recovery: recoveryChecklist(shape) });
    trace.push({ id: 'datajud', phase: 'recover', label: 'DataJud', ok: false, detail: shape.userMessage, tool: 'scan_datajud', durationMs: datajud?.latency });
  }

  if (djenOk) {
    const count = Number(djen?.count || djen?.items?.length || 0);
    sources.push({ source: 'DJEN', ok: true, found: djenFound, count });
    trace.push({
      id: 'djen',
      phase: 'tool',
      label: 'DJEN',
      ok: true,
      detail: count ? `${count} publicação(ões) encontrada(s).` : 'Consulta concluída sem publicações na janela.',
      tool: 'scan_djen',
    });
  } else {
    const status = djen?.isGeoBlocked ? 403 : djen?.isRateLimited ? 429 : undefined;
    const shape = classifyRuntimeError(djen?.error || 'Falha DJEN', status);
    sources.push({ source: 'DJEN', ok: false, found: false, count: 0, error: djen?.error, recovery: recoveryChecklist(shape) });
    trace.push({ id: 'djen', phase: 'recover', label: 'DJEN', ok: false, detail: shape.userMessage, tool: 'scan_djen' });
  }

  const bothFailed = !djOk && !djenOk;
  const anyFound = djFound || djenFound;
  const partial = (djOk !== djenOk) || (!djOk || !djenOk);

  const hypotheses: string[] = [];
  if (!anyFound) {
    hypotheses.push('O processo pode ainda não estar indexado/publicado nas fontes consultadas.');
    hypotheses.push('Pode haver atraso de indexação, sigilo, migração de sistema ou indisponibilidade temporária.');
    hypotheses.push('O número pode estar correto e ainda assim não produzir dados públicos; ausência em API não prova inexistência.');
  }
  if (!djOk) hypotheses.push('DataJud falhou nesta execução; o resultado DJEN, se houver, continua válido de forma independente.');
  if (!djenOk) hypotheses.push('DJEN falhou nesta execução; metadados DataJud, se houver, continuam válidos de forma independente.');
  if ((djen as any)?.isGeoBlocked) hypotheses.push('O DJEN pode ter bloqueado o egress do datacenter; o app deve preferir gru1 e oferecer fallback de consulta direta pelo navegador.');

  const nextSteps = [
    'Conferir o CNJ com a fonte original antes de qualquer decisão de prazo.',
    anyFound ? 'Abrir o inteiro teor das publicações/decisões relevantes antes de concluir mérito ou prazo.' : 'Consultar também o portal oficial do tribunal quando a decisão depender da existência ou do conteúdo do ato.',
    (!djenOk && (djen as any)?.isGeoBlocked) ? 'Tentar o caminho direto do navegador do usuário para o DJEN, sem burlar WAF/CAPTCHA.' : 'Repetir somente a fonte que falhou com backoff; não refazer as fontes que já responderam.',
  ];

  trace.push({
    id: 'verify',
    phase: 'verify',
    label: 'Verificação cruzada',
    ok: !bothFailed,
    detail: bothFailed
      ? 'As duas fontes falharam; nenhum sucesso foi inventado.'
      : `Resultado ${partial ? 'parcial' : 'completo'} preservado em ${Date.now() - t0}ms.`,
    durationMs: Date.now() - t0,
  });

  return {
    success: !bothFailed,
    partial,
    protocolo: masked,
    digits,
    tribunalAlias,
    headline: anyFound
      ? `Processo ${masked}: evidência pública localizada.`
      : `Processo ${masked}: nenhuma evidência pública conclusiva nesta execução.`,
    datajud,
    djen,
    sources,
    trace,
    hypotheses,
    nextSteps,
    fetchedAt: new Date().toISOString(),
  };
}

export function formatProcessScannerSkill(result: ProcessScannerSkillResult) {
  const lines: string[] = [
    '## Processo consultado',
    `**${result.protocolo} · ${result.tribunalAlias.toUpperCase()}**`,
    '',
  ];

  const failed = result.sources.filter((s) => !s.ok);
  const ok = result.sources.filter((s) => s.ok);
  if (ok.length) {
    lines.push(
      ok.map((s) => `${s.source}: ${s.found ? `${s.count} registro(s) relevante(s)` : 'consulta concluída sem resultado público relevante'}`).join(' · ')
    );
  }
  if (failed.length) {
    lines.push(
      failed.map((s) => `${s.source}: não respondeu nesta consulta${s.error ? ` (${s.error})` : ''}`).join(' · ')
    );
  }

  const movements = Array.isArray(result.datajud?.movimentos) ? result.datajud.movimentos : [];
  if (movements.length) {
    lines.push('', '### Movimentos DataJud');
    for (const m of movements.slice(-8).reverse()) {
      const name = String(m?.nome || m?.descricao || 'Movimento');
      const date = String(m?.dataHora || m?.data_hora || '');
      lines.push(`- ${date ? date + ' · ' : ''}${name}`);
    }
  }

  if (result.djen?.items?.length) {
    lines.push('', '### Publicações DJEN');
    for (const p of result.djen.items.slice(0, 5)) {
      const text = String(p.texto || '').replace(/\s+/g, ' ').slice(0, 420);
      lines.push(`- ${p.data_disponibilizacao || 'sem data'} · ${p.tipoComunicacao || 'Publicação'} · ${text}`);
    }
  }

  if (!movements.length && !result.djen?.items?.length) {
    lines.push('', 'Não apareceu evidência pública conclusiva nas fontes que responderam.');
    if (result.hypotheses.length) {
      for (const h of result.hypotheses.slice(0, 3)) lines.push(`- ${h}`);
    }
  }

  // Só mostra orientação adicional quando a consulta ficou parcial/vazia.
  if (result.partial || (!movements.length && !result.djen?.items?.length)) {
    const useful = result.nextSteps.filter((x) => !/repetir somente a fonte/i.test(x)).slice(0, 2);
    if (useful.length) {
      lines.push('', '### Para confirmar');
      useful.forEach((x, i) => lines.push(`${i + 1}. ${x}`));
    }
  }

  return lines.join('\n').trim();
}
