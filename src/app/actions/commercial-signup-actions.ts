"use server";

import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import { getSupabaseAdmin, getUserContext } from "@/lib/server-db";
import { normalizePlanId, type PlanId } from "@/lib/planos-pacotes";

const DEFAULT_COURTESY_TOKEN_SHA256 =
  "8d8365b5b095690c4dc361ee071fe6635858e087e250a6ee07ef96b0d4af0875";

function courtesyTokenHash() {
  return String(
    process.env.LEXIS_COURTESY_TOKEN_SHA256 || DEFAULT_COURTESY_TOKEN_SHA256
  ).trim().toLowerCase();
}

function isValidCourtesyToken(raw?: string | null) {
  const token = String(raw || "").trim();
  if (!token) return false;

  const got = createHash("sha256").update(token, "utf8").digest();
  const expectedHex = courtesyTokenHash();
  if (!/^[a-f0-9]{64}$/i.test(expectedHex)) return false;

  const expected = Buffer.from(expectedHex, "hex");
  return got.length === expected.length && timingSafeEqual(got, expected);
}

export async function validateCourtesyTokenAction(token: string) {
  return { ok: true, valid: isValidCourtesyToken(token) };
}

export type CommercialSignupInput = {
  empresa: string;
  email: string;
  password: string;
  nome?: string;
  plan?: PlanId;
  courtesyToken?: string;
  termosVersao: string;
  termosAceitosEm: string;
};

export async function createCommercialAccountAction(input: CommercialSignupInput) {
  const empresaNome = String(input.empresa || "").trim();
  const email = String(input.email || "").trim().toLowerCase();
  const password = String(input.password || "");
  const nome = String(input.nome || email.split("@")[0] || "ADMINISTRADOR").trim();
  const requestedPlan = normalizePlanId(input.plan || "essencial");
  const courtesy = isValidCourtesyToken(input.courtesyToken);

  if (!empresaNome) return { ok: false as const, error: "Informe o nome da empresa." };
  if (!email || !email.includes("@")) return { ok: false as const, error: "Informe um e-mail válido." };
  if (password.length < 6) return { ok: false as const, error: "A senha precisa ter pelo menos 6 caracteres." };

  const admin = await getSupabaseAdmin();
  const empresaId = randomUUID();

  const { data: createdAuth, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: nome.toUpperCase(),
      empresa_nome: empresaNome.toUpperCase(),
      plano_solicitado: requestedPlan,
      lexis_signup: "commercial",
      termos_versao: String(input.termosVersao || "2026-09-21"),
      termos_aceitos_em: String(input.termosAceitosEm || new Date().toISOString()),
      consentimento_dados: true,
      consentimento_ia_revisao_humana: true,
    },
    app_metadata: {
      lexis_commercial: true,
    },
  });

  if (authError || !createdAuth.user) {
    const msg = String(authError?.message || "Falha ao criar usuário.");
    if (/already.*registered|already.*exists|user.*exists/i.test(msg)) {
      return {
        ok: false as const,
        code: "already_exists",
        error: "Este e-mail já possui conta. Use a tela de login.",
      };
    }
    return { ok: false as const, error: msg };
  }

  const authUserId = createdAuth.user.id;
  const effectivePlan = courtesy ? requestedPlan : "essencial";
  const billingStatus = courtesy ? "active" : "pending";

  const rollback = async () => {
    try {
      await admin.from("empresas").delete().eq("id", empresaId);
    } catch {}
    try {
      await admin.auth.admin.deleteUser(authUserId);
    } catch {}
  };

  const { error: empresaError } = await admin.from("empresas").insert({
    id: empresaId,
    nome: empresaNome.toUpperCase(),
    plano: effectivePlan,
    ativo: true,
    plano_bloqueado: false,
    plano_bloqueio_motivo: null,
    plano_expira_em: null,
    billing_status: billingStatus,
  });

  if (empresaError) {
    await rollback();
    return { ok: false as const, error: empresaError.message };
  }

  const { error: profileError } = await admin.from("usuarios").insert({
    id: randomUUID(),
    auth_user_id: authUserId,
    empresa_id: empresaId,
    nome: nome.toUpperCase(),
    email,
    cargo: "Administrador",
    role: "admin",
  });

  if (profileError) {
    await rollback();
    return { ok: false as const, error: profileError.message };
  }

  const now = new Date().toISOString();

  if (courtesy) {
    const { error: assinaturaError } = await admin.from("assinaturas").upsert(
      {
        empresa_id: empresaId,
        plano: requestedPlan,
        status: "active",
        ciclo: "cortesia",
        provider: "courtesy_token",
        current_period_start: now,
        current_period_end: null,
        updated_at: now,
      },
      { onConflict: "empresa_id" }
    );

    if (assinaturaError) {
      await rollback();
      return { ok: false as const, error: assinaturaError.message };
    }

    try {
      await admin.from("solicitacoes_assinatura").insert({
        empresa_id: empresaId,
        solicitado_por: authUserId,
        plano: requestedPlan,
        ciclo: "cortesia",
        status: "approved",
        observacao: "Plano liberado por token de cortesia",
        decided_at: now,
        decided_by: authUserId,
      });
    } catch {}
  } else {
    try {
      await admin.from("assinaturas").upsert(
        {
          empresa_id: empresaId,
          plano: "essencial",
          status: "pending",
          ciclo: "mensal",
          provider: "manual",
          current_period_start: now,
          current_period_end: null,
          updated_at: now,
        },
        { onConflict: "empresa_id" }
      );
    } catch {}

    try {
      await admin.from("solicitacoes_assinatura").insert({
        empresa_id: empresaId,
        solicitado_por: authUserId,
        plano: requestedPlan,
        ciclo: "mensal",
        status: "pending",
        observacao: "Solicitação inicial criada pelo cadastro comercial",
      });
    } catch {}
  }

  try {
    await admin.from("commercial_audit_log").insert({
      empresa_id: empresaId,
      actor_user_id: authUserId,
      event: courtesy ? "subscription.courtesy_token_activated" : "tenant.signup_created",
      payload: {
        requested_plan: requestedPlan,
        effective_plan: effectivePlan,
        billing_status: billingStatus,
        terms_version: String(input.termosVersao || "2026-09-21"),
      },
    });
  } catch {}

  return {
    ok: true as const,
    empresaId,
    plan: effectivePlan,
    requestedPlan,
    courtesy,
    billingStatus,
  };
}

export async function activateCourtesyPlanAction(token: string, plan: PlanId) {
  const ctx = await getUserContext();
  if (!ctx?.empresa_id || !ctx?.auth_id) {
    return { ok: false as const, error: "Sessão empresarial não encontrada." };
  }

  if (!isValidCourtesyToken(token)) {
    return { ok: false as const, error: "Token inválido." };
  }

  const selectedPlan = normalizePlanId(plan);
  const admin = await getSupabaseAdmin();
  const now = new Date().toISOString();

  const { data: empresa, error: empresaError } = await admin
    .from("empresas")
    .update({
      plano: selectedPlan,
      plano_bloqueado: false,
      plano_bloqueio_motivo: null,
      plano_expira_em: null,
      billing_status: "active",
    })
    .eq("id", ctx.empresa_id)
    .select("id")
    .maybeSingle();

  if (empresaError || !empresa) {
    return {
      ok: false as const,
      error: empresaError?.message || "Empresa não encontrada.",
    };
  }

  const { error: assinaturaError } = await admin.from("assinaturas").upsert(
    {
      empresa_id: ctx.empresa_id,
      plano: selectedPlan,
      status: "active",
      ciclo: "cortesia",
      provider: "courtesy_token",
      current_period_start: now,
      current_period_end: null,
      updated_at: now,
    },
    { onConflict: "empresa_id" }
  );

  if (assinaturaError) {
    return { ok: false as const, error: assinaturaError.message };
  }

  try {
    await admin
      .from("solicitacoes_assinatura")
      .update({
        status: "approved",
        decided_at: now,
        decided_by: ctx.auth_id,
      })
      .eq("empresa_id", ctx.empresa_id)
      .eq("status", "pending");
  } catch {}

  try {
    await admin.from("commercial_audit_log").insert({
      empresa_id: ctx.empresa_id,
      actor_user_id: ctx.auth_id,
      event: "subscription.courtesy_token_activated",
      payload: { plan: selectedPlan },
    });
  } catch {}

  return { ok: true as const, plan: selectedPlan };
}
