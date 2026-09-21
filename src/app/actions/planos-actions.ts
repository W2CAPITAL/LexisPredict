"use server";

import { getUserContext } from "@/lib/server-db";
import { normalizePlanId, type PlanId } from "@/lib/planos-pacotes";

export type EmpresaPlanoRow = {
  id: string;
  nome: string;
  plano?: string;
  plano_expira_em?: string | null;
  plano_bloqueado?: boolean;
  plano_bloqueio_motivo?: string | null;
};

/** Assinatura da empresa do usuário logado (fonte de verdade no banco). */
export async function getMinhaAssinaturaAction(): Promise<{
  ok: boolean;
  empresaId?: string;
  plan?: PlanId;
  expiresAt?: string | null;
  blocked?: boolean;
  blockedReason?: string | null;
  error?: string;
  missingColumns?: boolean;
}> {
  try {
    const ctx = await getUserContext();
    const empresaId = String(ctx?.empresa_id || "").trim();
    if (!empresaId) return { ok: false, error: "Sem empresa" };

    const { getSupabaseAdmin } = await import("@/lib/server-db");
    const admin = await getSupabaseAdmin();
    if (!admin) return { ok: false, error: "Sem admin client" };

    const { data, error } = await admin
      .from("empresas")
      .select("id, nome, plano, plano_expira_em, plano_bloqueado, plano_bloqueio_motivo")
      .eq("id", empresaId)
      .maybeSingle();

    if (error) {
      const msg = String(error.message || "");
      const missing =
        /plano_bloqueado|plano_expira|column .* does not exist/i.test(msg);
      return { ok: false, error: msg, missingColumns: missing, empresaId };
    }

    return {
      ok: true,
      empresaId,
      plan: data?.plano ? normalizePlanId(data.plano) : "essencial",
      expiresAt: data?.plano_expira_em ?? null,
      blocked: !!data?.plano_bloqueado,
      blockedReason: data?.plano_bloqueio_motivo ?? null,
    };
  } catch (e: any) {
    return { ok: false, error: e?.message || "falha" };
  }
}

export async function listEmpresasParaPlanosAction(): Promise<EmpresaPlanoRow[]> {
  const ctx = await getUserContext();
  if (!ctx?.isSuperAdmin) {
    const id = String(ctx?.empresa_id || "");
    if (!id) return [];
    const mine = await getMinhaAssinaturaAction();
    return [
      {
        id,
        nome: "Minha empresa",
        plano: mine.plan,
        plano_expira_em: mine.expiresAt ?? null,
        plano_bloqueado: !!mine.blocked,
        plano_bloqueio_motivo: mine.blockedReason ?? null,
      },
    ];
  }
  try {
    const { listAllEmpresasSystem } = await import("@/lib/server-db");
    const rows = await listAllEmpresasSystem();
    return (rows || []).map((r: any) => ({
      id: String(r.id),
      nome: String(r.nome || r.id),
      plano: r.plano ? normalizePlanId(r.plano) : undefined,
      plano_expira_em: r.plano_expira_em ?? null,
      plano_bloqueado: !!r.plano_bloqueado,
      plano_bloqueio_motivo: r.plano_bloqueio_motivo ?? null,
    }));
  } catch {
    return [];
  }
}

export async function salvarPlanoEmpresaAction(empresaId: string, plan: PlanId) {
  const ctx = await getUserContext();
  if (!ctx?.isSuperAdmin) {
    return { ok: false, persisted: false, error: "Só Superadmin altera plano de empresa." };
  }
  const id = String(empresaId || "").trim();
  const p = normalizePlanId(plan);
  if (!id) return { ok: false, persisted: false, error: "empresa inválida" };
  try {
    const { getSupabaseAdmin } = await import("@/lib/server-db");
    const admin = await getSupabaseAdmin();
    if (!admin) return { ok: false, persisted: false, error: "Service role ausente" };
    const { error } = await admin.from("empresas").update({ plano: p }).eq("id", id);
    if (error) {
      return {
        ok: false,
        persisted: false,
        error: error.message,
        plan: p,
        missingColumns: /column .* does not exist/i.test(error.message || ""),
      };
    }
    return { ok: true, persisted: true, plan: p };
  } catch (e: any) {
    return { ok: false, persisted: false, error: e?.message || "falha", plan: p };
  }
}

export async function bloquearEmpresaPlanoAction(empresaId: string, motivo?: string) {
  const ctx = await getUserContext();
  if (!ctx?.isSuperAdmin) return { ok: false, persisted: false, error: "Só Superadmin" };
  const id = String(empresaId || "").trim();
  if (!id) return { ok: false, persisted: false, error: "empresa inválida" };
  try {
    const { getSupabaseAdmin } = await import("@/lib/server-db");
    const admin = await getSupabaseAdmin();
    if (!admin) return { ok: false, persisted: false, error: "Service role ausente (SUPABASE_SERVICE_ROLE_KEY)" };
    const { data, error } = await admin
      .from("empresas")
      .update({
        plano_bloqueado: true,
        plano_bloqueio_motivo: motivo || "inadimplencia",
        billing_status: "suspended",
      })
      .eq("id", id)
      .select("id, plano, plano_bloqueado")
      .maybeSingle();
    if (error) {
      return {
        ok: false,
        persisted: false,
        error: error.message,
        missingColumns: /column .* does not exist|plano_bloqueado/i.test(error.message || ""),
      };
    }
    if (!data) {
      return { ok: false, persisted: false, error: "Empresa não encontrada ou update sem efeito" };
    }
    try {
      await admin.from("assinaturas").upsert(
        { empresa_id: id, plano: normalizePlanId((data as any).plano || "essencial"), status: "suspended", updated_at: new Date().toISOString() },
        { onConflict: "empresa_id" }
      );
    } catch {
      // espelho de assinatura é best-effort; o estado da empresa já foi persistido.
    }
    return { ok: true, persisted: true, blocked: true };
  } catch (e: any) {
    return { ok: false, persisted: false, error: e?.message || "falha" };
  }
}

export async function liberarEmpresaPlanoAction(
  empresaId: string,
  plan: PlanId,
  expiresAt: string
) {
  const ctx = await getUserContext();
  if (!ctx?.isSuperAdmin) return { ok: false, persisted: false, error: "Só Superadmin" };
  const id = String(empresaId || "").trim();
  const p = normalizePlanId(plan);
  if (!id) return { ok: false, persisted: false, error: "empresa inválida" };
  try {
    const { getSupabaseAdmin } = await import("@/lib/server-db");
    const admin = await getSupabaseAdmin();
    if (!admin) return { ok: false, persisted: false, error: "Service role ausente" };
    const { data, error } = await admin
      .from("empresas")
      .update({
        plano: p,
        plano_bloqueado: false,
        plano_bloqueio_motivo: null,
        plano_expira_em: expiresAt,
        billing_status: "active",
      })
      .eq("id", id)
      .select("id, plano, plano_bloqueado, plano_expira_em")
      .maybeSingle();
    if (error) {
      return {
        ok: false,
        persisted: false,
        error: error.message,
        missingColumns: /column .* does not exist|plano_/i.test(error.message || ""),
      };
    }
    if (!data) {
      return { ok: false, persisted: false, error: "Empresa não encontrada ou update sem efeito" };
    }
    try {
      await admin.from("assinaturas").upsert(
        {
          empresa_id: id,
          plano: p,
          status: "active",
          ciclo: "manual",
          provider: "manual",
          current_period_start: new Date().toISOString(),
          current_period_end: expiresAt,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "empresa_id" }
      );
    } catch {
      // espelho de assinatura é best-effort; o estado da empresa já foi persistido.
    }
    try {
      await admin
        .from("solicitacoes_assinatura")
        .update({ status: "approved", decided_at: new Date().toISOString(), decided_by: ctx.auth_id })
        .eq("empresa_id", id)
        .eq("status", "pending");
    } catch {
      // aprovação pendente também é best-effort.
    }
    return {
      ok: true,
      persisted: true,
      plan: p,
      expiresAt: data.plano_expira_em,
      blocked: false,
    };
  } catch (e: any) {
    return { ok: false, persisted: false, error: e?.message || "falha" };
  }
}


export async function trocarMeuPlanoAction(plan: PlanId, ciclo?: "mensal" | "anual") {
  const ctx = await getUserContext();
  const empresaId = String(ctx?.empresa_id || "").trim();
  if (!empresaId) return { ok: false, error: "Sem empresa" };
  const pode =
    !!(ctx as any)?.isSuperAdmin ||
    !!(ctx as any)?.isAdministrador ||
    !!(ctx as any)?.isSupervisor;
  if (!pode) return { ok: false, error: "Só administrador da empresa solicita troca de plano." };

  const p = normalizePlanId(plan);
  const c = ciclo === "anual" ? "anual" : "mensal";

  try {
    const { getSupabaseAdmin } = await import("@/lib/server-db");
    const admin = await getSupabaseAdmin();
    if (!admin) return { ok: false, error: "Service role ausente" };

    const { data: existing } = await admin
      .from("solicitacoes_assinatura")
      .select("id")
      .eq("empresa_id", empresaId)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing?.id) {
      const { error } = await admin
        .from("solicitacoes_assinatura")
        .update({ plano: p, ciclo: c, solicitado_por: ctx.auth_id, observacao: "Alteração de plano solicitada pelo painel" })
        .eq("id", existing.id);
      if (error) return { ok: false, error: error.message };
      return { ok: true, pending: true, requestId: existing.id, plan: p, ciclo: c };
    }

    const { data, error } = await admin
      .from("solicitacoes_assinatura")
      .insert({
        empresa_id: empresaId,
        solicitado_por: ctx.auth_id,
        plano: p,
        ciclo: c,
        status: "pending",
        observacao: "Alteração de plano solicitada pelo painel",
      })
      .select("id")
      .single();
    if (error) return { ok: false, error: error.message };

    await admin.from("commercial_audit_log").insert({
      empresa_id: empresaId,
      actor_user_id: ctx.auth_id,
      event: "subscription.change_requested",
      payload: { plan: p, ciclo: c },
    });

    return { ok: true, pending: true, requestId: data?.id, plan: p, ciclo: c };
  } catch (e: any) {
    return { ok: false, error: e?.message || "falha" };
  }
}
