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
  billing_status?: string | null;
  plan_self_service_unlocked?: boolean;
  onboarding_completed?: boolean;
  nav_layout?: "dock" | "vertical" | null;
  sidebar_compact?: boolean;
};

export type MinhaAssinaturaResult = {
  ok: boolean;
  empresaId?: string;
  plan?: PlanId;
  expiresAt?: string | null;
  blocked?: boolean;
  blockedReason?: string | null;
  billingStatus?: string | null;
  selfServiceUnlocked?: boolean;
  onboardingCompleted?: boolean;
  navLayout?: "dock" | "vertical";
  sidebarCompact?: boolean;
  setupRequired?: boolean;
  error?: string;
  missingColumns?: boolean;
};

/** Assinatura da empresa do usuário logado (fonte de verdade no banco). */
export async function getMinhaAssinaturaAction(): Promise<MinhaAssinaturaResult> {
  try {
    const ctx = await getUserContext();
    const empresaId = String(ctx?.empresa_id || "").trim();

    if (!empresaId) {
      return {
        ok: false,
        setupRequired: true,
        error: "Empresa ainda não vinculada ao perfil.",
      };
    }

    const { getSupabaseAdmin } = await import("@/lib/server-db");
    const admin = await getSupabaseAdmin();
    if (!admin) return { ok: false, error: "Cliente administrativo indisponível." };

    const { data, error } = await admin
      .from("empresas")
      .select("id, nome, plano, plano_expira_em, plano_bloqueado, plano_bloqueio_motivo, billing_status, plan_self_service_unlocked, onboarding_completed, nav_layout, sidebar_compact")
      .eq("id", empresaId)
      .maybeSingle();

    if (error) {
      const msg = String(error.message || "");
      const missing =
        /plano_bloqueado|plano_expira|billing_status|column .* does not exist/i.test(msg);
      return { ok: false, error: msg, missingColumns: missing, empresaId };
    }

    if (!data) {
      return {
        ok: false,
        empresaId,
        setupRequired: true,
        error: "Empresa ainda não cadastrada no Supabase.",
      };
    }

    const billingStatus = String(data.billing_status || "").trim().toLowerCase();
    const blockedByBilling = ["past_due", "suspended", "canceled"].includes(billingStatus);

    return {
      ok: true,
      empresaId,
      plan: data.plano ? normalizePlanId(data.plano) : "essencial",
      expiresAt: data.plano_expira_em ?? null,
      blocked: !!data.plano_bloqueado || blockedByBilling,
      blockedReason:
        data.plano_bloqueio_motivo ??
        (blockedByBilling ? billingStatus : null),
      billingStatus: data.billing_status ?? null,
      selfServiceUnlocked: !!data.plan_self_service_unlocked,
      onboardingCompleted: !!data.onboarding_completed,
      navLayout: data.nav_layout === "vertical" ? "vertical" : "dock",
      sidebarCompact: !!data.sidebar_compact,
      setupRequired: false,
    };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Falha ao consultar assinatura." };
  }
}

export async function listEmpresasParaPlanosAction(): Promise<EmpresaPlanoRow[]> {
  const ctx = await getUserContext();

  if (!ctx?.isSuperAdmin) {
    const mine = await getMinhaAssinaturaAction();
    if (!mine.ok || !mine.empresaId) return [];
    return [
      {
        id: mine.empresaId,
        nome: "Minha empresa",
        plano: mine.plan,
        plano_expira_em: mine.expiresAt ?? null,
        plano_bloqueado: !!mine.blocked,
        plano_bloqueio_motivo: mine.blockedReason ?? null,
        billing_status: mine.billingStatus ?? null,
        plan_self_service_unlocked: !!mine.selfServiceUnlocked,
        onboarding_completed: !!mine.onboardingCompleted,
        nav_layout: mine.navLayout || "dock",
        sidebar_compact: !!mine.sidebarCompact,
      },
    ];
  }

  try {
    const { listAllEmpresasSystem } = await import("@/lib/server-db");
    const rows = await listAllEmpresasSystem();
    return (rows || []).map((r: any) => ({
      id: String(r.id),
      nome: String(r.nome || r.id),
      plano: r.plano ? normalizePlanId(r.plano) : "essencial",
      plano_expira_em: r.plano_expira_em ?? null,
      plano_bloqueado: !!r.plano_bloqueado,
      plano_bloqueio_motivo: r.plano_bloqueio_motivo ?? null,
      billing_status: r.billing_status ?? null,
      plan_self_service_unlocked: !!r.plan_self_service_unlocked,
      onboarding_completed: !!r.onboarding_completed,
      nav_layout: r.nav_layout === "vertical" ? "vertical" : "dock",
      sidebar_compact: !!r.sidebar_compact,
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
  if (!id) return { ok: false, persisted: false, error: "Empresa inválida." };

  try {
    const { getSupabaseAdmin } = await import("@/lib/server-db");
    const admin = await getSupabaseAdmin();
    if (!admin) return { ok: false, persisted: false, error: "Service role ausente." };

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
    return { ok: false, persisted: false, error: e?.message || "Falha.", plan: p };
  }
}

export async function bloquearEmpresaPlanoAction(empresaId: string, motivo?: string) {
  const ctx = await getUserContext();
  if (!ctx?.isSuperAdmin) return { ok: false, persisted: false, error: "Só Superadmin." };

  const id = String(empresaId || "").trim();
  if (!id) return { ok: false, persisted: false, error: "Empresa inválida." };

  try {
    const { getSupabaseAdmin } = await import("@/lib/server-db");
    const admin = await getSupabaseAdmin();
    if (!admin) return { ok: false, persisted: false, error: "Service role ausente." };

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
      return { ok: false, persisted: false, error: "Empresa não encontrada ou update sem efeito." };
    }

    try {
      await admin.from("assinaturas").upsert(
        {
          empresa_id: id,
          plano: normalizePlanId((data as any).plano || "essencial"),
          status: "suspended",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "empresa_id" }
      );
    } catch {
      /* espelho best-effort */
    }

    return { ok: true, persisted: true, blocked: true };
  } catch (e: any) {
    return { ok: false, persisted: false, error: e?.message || "Falha." };
  }
}

export async function liberarEmpresaPlanoAction(
  empresaId: string,
  plan: PlanId,
  expiresAt: string
) {
  const ctx = await getUserContext();
  if (!ctx?.isSuperAdmin) return { ok: false, persisted: false, error: "Só Superadmin." };

  const id = String(empresaId || "").trim();
  const p = normalizePlanId(plan);
  if (!id) return { ok: false, persisted: false, error: "Empresa inválida." };

  try {
    const { getSupabaseAdmin } = await import("@/lib/server-db");
    const admin = await getSupabaseAdmin();
    if (!admin) return { ok: false, persisted: false, error: "Service role ausente." };

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
      return { ok: false, persisted: false, error: "Empresa não encontrada ou update sem efeito." };
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
      /* espelho best-effort */
    }

    try {
      await admin
        .from("solicitacoes_assinatura")
        .update({
          status: "approved",
          decided_at: new Date().toISOString(),
          decided_by: ctx.auth_id,
        })
        .eq("empresa_id", id)
        .eq("status", "pending");
    } catch {
      /* aprovação pendente best-effort */
    }

    return {
      ok: true,
      persisted: true,
      plan: p,
      expiresAt: data.plano_expira_em,
      blocked: false,
    };
  } catch (e: any) {
    return { ok: false, persisted: false, error: e?.message || "Falha." };
  }
}

export async function trocarMeuPlanoAction(plan: PlanId, ciclo?: "mensal" | "anual") {
  const ctx = await getUserContext();
  const empresaId = String(ctx?.empresa_id || "").trim();
  if (!empresaId) {
    return { ok: false, setupRequired: true, error: "Cadastre ou vincule uma empresa antes de escolher o plano." };
  }

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
    if (!admin) return { ok: false, error: "Service role ausente." };

    const { data: empresa, error: empresaError } = await admin
      .from("empresas")
      .select("plan_self_service_unlocked, billing_status")
      .eq("id", empresaId)
      .maybeSingle();

    if (empresaError) return { ok: false, error: empresaError.message };

    if (empresa?.plan_self_service_unlocked) {
      const now = new Date().toISOString();

      const { error: updateError } = await admin
        .from("empresas")
        .update({
          plano: p,
          plano_bloqueado: false,
          plano_bloqueio_motivo: null,
          billing_status: "active",
        })
        .eq("id", empresaId);

      if (updateError) return { ok: false, error: updateError.message };

      const { error: assinaturaError } = await admin.from("assinaturas").upsert(
        {
          empresa_id: empresaId,
          plano: p,
          status: "active",
          ciclo: "cortesia",
          provider: "courtesy_token",
          current_period_start: now,
          current_period_end: null,
          updated_at: now,
        },
        { onConflict: "empresa_id" }
      );

      if (assinaturaError) return { ok: false, error: assinaturaError.message };

      try {
        await admin.from("commercial_audit_log").insert({
          empresa_id: empresaId,
          actor_user_id: ctx.auth_id,
          event: "subscription.self_service_plan_changed",
          payload: { plan: p, source: "courtesy_entitlement" },
        });
      } catch {}

      return {
        ok: true,
        pending: false,
        selfService: true,
        plan: p,
        ciclo: "cortesia" as const,
      };
    }

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
        .update({
          plano: p,
          ciclo: c,
          solicitado_por: ctx.auth_id,
          observacao: "Alteração de plano solicitada pelo painel",
        })
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

    try {
      await admin.from("commercial_audit_log").insert({
        empresa_id: empresaId,
        actor_user_id: ctx.auth_id,
        event: "subscription.change_requested",
        payload: { plan: p, ciclo: c },
      });
    } catch {
      /* auditoria comercial best-effort */
    }

    return { ok: true, pending: true, requestId: data?.id, plan: p, ciclo: c };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Falha." };
  }
}
