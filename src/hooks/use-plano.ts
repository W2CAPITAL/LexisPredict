"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAdmin } from "@/hooks/use-admin";
import { hrefLiberado, type PlanId, normalizePlanId } from "@/lib/planos-pacotes";
import { planoDaEmpresa, savePlanoEmpresa, subscribeEmpresaPlanos } from "@/lib/planos-store";
import {
  daysLeft,
  getAssinatura,
  isExpired,
  formatExpira,
  saveAssinatura,
  subscribeAssinaturas,
  type AssinaturaStatus,
} from "@/lib/planos-assinatura";
import { getMinhaAssinaturaAction } from "@/app/actions/planos-actions";
import { invalidateCarteiraCache, clearScanProgress } from "@/lib/session-carteira-cache";
import { saveNavLayout, type NavLayoutMode } from "@/lib/nav-layout";

const CLEAN_FALLBACK: AssinaturaStatus = {
  plan: "essencial",
  expiresAt: null,
  blocked: true,
  blockedReason: "validating_subscription",
  origem: "fallback",
};

export function usePlano() {
  const { profile, isSuperAdmin } = useAdmin();
  const empresaId = profile?.empresa_id || "";

  const [plan, setPlan] = useState<PlanId>(() =>
    empresaId ? planoDaEmpresa(empresaId, "essencial") : "essencial"
  );
  const [ass, setAss] = useState<AssinaturaStatus>(() =>
    getAssinatura(empresaId, CLEAN_FALLBACK)
  );
  const [serverLoaded, setServerLoaded] = useState(false);
  const [setupRequired, setSetupRequired] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [billingStatus, setBillingStatus] = useState<string | null>(null);
  const [selfServiceUnlocked, setSelfServiceUnlocked] = useState(false);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const [navLayout, setNavLayout] = useState<NavLayoutMode>("dock");
  const [sidebarCompact, setSidebarCompact] = useState(false);
  const blockedRef = useRef(false);

  useEffect(() => {
    const local = getAssinatura(empresaId, CLEAN_FALLBACK);
    setPlan(planoDaEmpresa(empresaId, local.plan || "essencial"));
    setAss(local);
    blockedRef.current = !!local.blocked;

    const syncLocal = () => {
      const next = getAssinatura(empresaId, CLEAN_FALLBACK);
      setAss(next);
      setPlan(planoDaEmpresa(empresaId, "essencial"));
      blockedRef.current = !!next.blocked;
    };

    const u1 = subscribeEmpresaPlanos(syncLocal);
    const u2 = subscribeAssinaturas(syncLocal);
    return () => {
      u1();
      u2();
    };
  }, [empresaId]);

  useEffect(() => {
    if (isSuperAdmin) {
      setSetupRequired(false);
      setServerError(null);
      setBillingStatus("active");
      setSelfServiceUnlocked(true);
      setOnboardingCompleted(true);
      setServerLoaded(true);
      return;
    }

    if (!empresaId) {
      setSetupRequired(!!profile);
      setServerError(profile ? "Empresa ainda não vinculada ao perfil." : null);
      setServerLoaded(true);
      setAss(CLEAN_FALLBACK);
      setPlan("essencial");
      setBillingStatus(null);
      setSelfServiceUnlocked(false);
      setOnboardingCompleted(false);
      return;
    }

    let live = true;

    const pull = async () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;

      let res: Awaited<ReturnType<typeof getMinhaAssinaturaAction>> | null = null;
      try {
        res = await getMinhaAssinaturaAction();
      } catch {
        res = null;
      }
      if (!live) return;

      if (!res?.ok) {
        setSetupRequired(!!res?.setupRequired);
        setServerError(res?.error || "Não foi possível consultar a assinatura.");
        setServerLoaded(true);
        return;
      }

      const next: AssinaturaStatus = {
        plan: normalizePlanId(res.plan || "essencial"),
        expiresAt: res.expiresAt ?? null,
        blocked: !!res.blocked,
        blockedReason: res.blockedReason || undefined,
        origem: "server",
      };

      setSetupRequired(false);
      setServerError(null);
      setBillingStatus(res.billingStatus ?? null);
      setSelfServiceUnlocked(!!res.selfServiceUnlocked);
      setOnboardingCompleted(!!res.onboardingCompleted);
      const serverNav: NavLayoutMode = res.navLayout === "vertical" ? "vertical" : "dock";
      setNavLayout(serverNav);
      setSidebarCompact(!!res.sidebarCompact);
      blockedRef.current = next.blocked;

      if (res.onboardingCompleted) {
        saveNavLayout(serverNav);
        try {
          localStorage.setItem("lexis-sidebar-compact-v2", res.sidebarCompact ? "1" : "0");
          window.dispatchEvent(
            new CustomEvent("lexis-nav-display", {
              detail: { compact: !!res.sidebarCompact },
            })
          );
        } catch {}
      }

      if (next.blocked) {
        try {
          invalidateCarteiraCache();
          clearScanProgress();
        } catch {
          /* cache best effort */
        }
      }

      saveAssinatura(empresaId, next);
      savePlanoEmpresa(empresaId, next.plan, {
        expiresAt: next.expiresAt,
        blocked: next.blocked,
        blockedReason: next.blockedReason || "",
        origem: "server",
      });
      setPlan(next.plan);
      setAss(next);
      setServerLoaded(true);
    };

    void pull();

    const id = window.setInterval(() => {
      if (blockedRef.current || isExpired(getAssinatura(empresaId, CLEAN_FALLBACK).expiresAt)) {
        void pull();
      }
    }, 60_000);

    const onVis = () => {
      if (document.visibilityState === "visible") void pull();
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      live = false;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [empresaId, profile, isSuperAdmin]);

  const left = daysLeft(ass.expiresAt);
  const expired = !isSuperAdmin && !setupRequired && isExpired(ass.expiresAt);
  const blocked = !isSuperAdmin && !setupRequired && !!ass.blocked;
  const locked = blocked || expired;

  return useMemo(
    () => ({
      plan,
      empresaId,
      assinatura: ass,
      expiresAt: ass.expiresAt,
      daysLeft: left,
      expiresLabel: formatExpira(ass.expiresAt),
      isExpired: expired,
      isBlocked: blocked,
      isLocked: locked,
      setupRequired,
      serverError,
      serverLoaded,
      billingStatus,
      selfServiceUnlocked,
      onboardingCompleted,
      navLayout,
      sidebarCompact,
      isMaximo: plan === "maximo" || isSuperAdmin,
      canHref: (href: string) => {
        if (isSuperAdmin) return true;
        if (setupRequired) return href.startsWith("/settings") || href === "/onboarding";
        if (locked) {
          return href.startsWith("/settings") || href === "/" || href.startsWith("/superadmin");
        }
        return hrefLiberado(href, plan);
      },
    }),
    [plan, empresaId, ass, left, expired, blocked, locked, setupRequired, serverError, isSuperAdmin, serverLoaded, billingStatus, selfServiceUnlocked, onboardingCompleted, navLayout, sidebarCompact]
  );
}
