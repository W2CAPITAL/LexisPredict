"use client";

import { useMemo, useState } from "react";
import { usePlano } from "@/hooks/use-plano";
import { useAdmin } from "@/hooks/use-admin";
import {
  PLAN_IDS,
  PLAN_LABEL,
  PLAN_PACOTES,
  type PlanId,
} from "@/lib/planos-pacotes";
import {
  PLANOS_PRECOS,
  formatBRL,
  mensalDoAnual,
  economiaAnual,
} from "@/lib/planos-precos";
import { trocarMeuPlanoAction } from "@/app/actions/planos-actions";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  Clock3,
  Crown,
  Loader2,
  Minus,
  ShieldCheck,
  Sparkles,
  WalletCards,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const PLAN_STYLE: Record<PlanId, {
  accent: string;
  iconWrap: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}> = {
  essencial: {
    accent: "from-slate-500/10 via-transparent to-transparent",
    iconWrap: "bg-slate-500/10 text-slate-600 dark:text-slate-300",
    icon: ShieldCheck,
    label: "Base sólida",
  },
  operacional: {
    accent: "from-sky-500/15 via-cyan-500/5 to-transparent",
    iconWrap: "bg-sky-500/10 text-sky-600 dark:text-sky-300",
    icon: Zap,
    label: "Operação jurídica",
  },
  financeiro: {
    accent: "from-emerald-500/15 via-teal-500/5 to-transparent",
    iconWrap: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
    icon: WalletCards,
    label: "Gestão financeira",
  },
  maximo: {
    accent: "from-violet-500/20 via-fuchsia-500/8 to-transparent",
    iconWrap: "bg-violet-500/10 text-violet-600 dark:text-violet-300",
    icon: Crown,
    label: "Gabinete completo",
  },
};

const COMPARISON = [
  { label: "Carteira, tarefas, equipe e notas", essencial: true, operacional: true, financeiro: true, maximo: true },
  { label: "Importação e exportação XLSX/CSV", essencial: true, operacional: true, financeiro: true, maximo: true },
  { label: "DataJud, DJEN e scanner judicial", essencial: false, operacional: true, financeiro: false, maximo: true },
  { label: "Gerador de processos e automações", essencial: false, operacional: true, financeiro: false, maximo: true },
  { label: "BA, cumprimentos, peças, OCR e IA", essencial: false, operacional: true, financeiro: false, maximo: true },
  { label: "CRM, cobrança e funil comercial", essencial: false, operacional: false, financeiro: true, maximo: true },
  { label: "Finanças, cálculos e analytics", essencial: false, operacional: false, financeiro: true, maximo: true },
  { label: "Operacional + financeiro integrados", essencial: false, operacional: false, financeiro: false, maximo: true },
] as const;

export function PlanosEmpresaPanel() {
  const {
    plan,
    isExpired,
    isBlocked,
    expiresLabel,
    daysLeft,
    setupRequired,
    serverError,
  } = usePlano();
  const { profile, isAdmin, isSuperAdmin } = useAdmin();
  const { toast } = useToast();
  const [ciclo, setCiclo] = useState<"mensal" | "anual">("mensal");
  const [busy, setBusy] = useState<PlanId | null>(null);

  const currentPlan: PlanId = isSuperAdmin ? "maximo" : plan;
  const canChange = !!(isAdmin || isSuperAdmin) && !setupRequired;

  const acao = (id: PlanId) => {
    if (id === currentPlan) return "atual";
    const atuais = PLAN_PACOTES[currentPlan];
    const destino = PLAN_PACOTES[id];
    if (atuais.every((pacote) => destino.includes(pacote))) return "upgrade";
    if (destino.every((pacote) => atuais.includes(pacote))) return "downgrade";
    return "troca";
  };

  const status = setupRequired
    ? { label: "Configuração inicial", className: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20" }
    : isBlocked
      ? { label: "Suspenso", className: "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20" }
      : isExpired
        ? { label: "Expirado", className: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20" }
        : { label: "Ativo", className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20" };

  const maxSaving = useMemo(
    () => Math.max(...PLAN_IDS.map((id) => economiaAnual(id))),
    []
  );

  const onEscolher = async (id: PlanId) => {
    if (id === currentPlan || busy) return;

    if (setupRequired) {
      toast({
        title: "Empresa ainda não configurada",
        description: "Cadastre ou vincule a empresa antes de solicitar um plano.",
      });
      return;
    }

    if (!canChange) {
      toast({
        title: "Sem permissão",
        description: "Só administrador da empresa pode solicitar mudança de plano.",
      });
      return;
    }

    setBusy(id);
    try {
      const r = await trocarMeuPlanoAction(id, ciclo);
      if (!r.ok) {
        toast({
          title: r.setupRequired ? "Configuração necessária" : "Não foi possível solicitar",
          description: r.error || "Falha ao gravar a solicitação.",
          variant: r.setupRequired ? "default" : "destructive",
        });
        return;
      }
      toast({
        title: "Solicitação registrada",
        description: PLAN_LABEL[id] + " · " + ciclo + ". A alteração entra após ativação comercial.",
      });
    } finally {
      setBusy(null);
    }
  };

  return (
    <section aria-label="Planos e assinatura" className="space-y-6">
      <div className="relative overflow-hidden rounded-[26px] border bg-card shadow-sm">
        <div className="absolute inset-x-0 top-0 h-44 bg-gradient-to-r from-primary/12 via-violet-500/8 to-cyan-500/8" />
        <div className="relative p-5 sm:p-7">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-2xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border bg-background/80 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-primary">
                  LexisPredict Commercial
                </span>
                <Badge variant="outline" className={cn("rounded-full px-3 py-1 text-[10px] font-bold", status.className)}>
                  {status.label}
                </Badge>
              </div>

              <h2 className="mt-4 text-2xl font-black tracking-tight sm:text-3xl">
                Plano sob medida para a operação jurídica
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
                Escolha apenas os módulos que a empresa precisa agora. O plano Máximo une operação judicial, CRM, cobrança e inteligência em um único ambiente.
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                <div className="rounded-xl border bg-background/70 px-3 py-2">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Plano atual</p>
                  <p className="mt-0.5 text-sm font-black">{PLAN_LABEL[currentPlan]}</p>
                </div>
                <div className="rounded-xl border bg-background/70 px-3 py-2">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Validade</p>
                  <p className="mt-0.5 text-sm font-black">
                    {setupRequired ? "Aguardando empresa" : expiresLabel || "Sem prazo definido"}
                  </p>
                </div>
                <div className="rounded-xl border bg-background/70 px-3 py-2">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Dias restantes</p>
                  <p className="mt-0.5 text-sm font-black">
                    {daysLeft === null ? "—" : Math.max(0, daysLeft)}
                  </p>
                </div>
              </div>
            </div>

            <div className="w-full max-w-sm rounded-2xl border bg-background/75 p-2 shadow-sm backdrop-blur xl:w-auto">
              <div className="grid grid-cols-2 gap-1">
                <button
                  type="button"
                  onClick={() => setCiclo("mensal")}
                  className={cn(
                    "min-h-11 rounded-xl px-4 text-sm font-bold transition",
                    ciclo === "mensal"
                      ? "bg-foreground text-background shadow-sm"
                      : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  Mensal
                </button>
                <button
                  type="button"
                  onClick={() => setCiclo("anual")}
                  className={cn(
                    "min-h-11 rounded-xl px-4 text-sm font-bold transition",
                    ciclo === "anual"
                      ? "bg-foreground text-background shadow-sm"
                      : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  Anual
                </button>
              </div>
              <div className="mt-2 flex items-center gap-2 rounded-xl bg-emerald-500/8 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300">
                <Sparkles className="h-3.5 w-3.5 shrink-0" />
                <span>Anual economiza até {formatBRL(maxSaving)}</span>
              </div>
            </div>
          </div>

          {setupRequired ? (
            <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-sky-500/20 bg-sky-500/5 p-4 sm:flex-row sm:items-center">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/10">
                <Building2 className="h-5 w-5 text-sky-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold">Nenhuma empresa vinculada ainda</p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  Isso não é bloqueio. Cadastre a primeira empresa ou conclua o vínculo do perfil para ativar um plano.
                </p>
              </div>
              {serverError ? (
                <span className="text-[10px] text-muted-foreground">{serverError}</span>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <div className="grid items-stretch gap-4 md:grid-cols-2 2xl:grid-cols-4">
        {PLAN_IDS.map((id) => {
          const p = PLANOS_PRECOS[id];
          const meta = PLAN_STYLE[id];
          const Icon = meta.icon;
          const atual = id === currentPlan;
          const tipo = acao(id);
          const valor = ciclo === "mensal" ? p.valorMensal : p.valorAnual;
          const eq = ciclo === "anual" ? mensalDoAnual(id) : null;
          const eco = economiaAnual(id);
          const discountPct = Math.round((eco / (p.valorMensal * 12)) * 100);

          return (
            <article
              key={id}
              data-plan={id}
              className={cn(
                "group relative flex min-w-0 flex-col overflow-hidden rounded-[24px] border bg-card shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl",
                atual ? "border-primary ring-1 ring-primary/25" : "border-border/70"
              )}
            >
              <div className={cn("absolute inset-x-0 top-0 h-36 bg-gradient-to-br", meta.accent)} />
              <div className="relative flex h-full flex-col p-5 sm:p-6">
                <div className="flex items-start justify-between gap-3">
                  <div className={cn("flex h-11 w-11 items-center justify-center rounded-2xl", meta.iconWrap)}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {p.selo ? (
                      <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-primary">
                        {p.selo}
                      </span>
                    ) : null}
                    {atual ? (
                      <span className="rounded-full border bg-background/80 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider">
                        Atual
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="mt-5">
                  <p className="text-[9px] font-black uppercase tracking-[0.18em] text-muted-foreground">{meta.label}</p>
                  <h3 className="mt-1 text-xl font-black tracking-tight">{PLAN_LABEL[id]}</h3>
                  <p className="mt-2 min-h-[42px] text-sm leading-relaxed text-muted-foreground">{p.tagline}</p>
                </div>

                <div className="mt-5 border-y py-4">
                  <div className="flex items-end gap-1">
                    <span className="text-3xl font-black tracking-tight tabular-nums">{formatBRL(valor)}</span>
                    <span className="pb-1 text-[10px] font-medium text-muted-foreground">
                      /{ciclo === "mensal" ? "mês" : "ano"}
                    </span>
                  </div>
                  {ciclo === "anual" && eq !== null ? (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="text-xs text-muted-foreground">{formatBRL(eq)}/mês equivalente</span>
                      <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-black text-emerald-700 dark:text-emerald-300">
                        -{discountPct}%
                      </span>
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Anual: {formatBRL(p.valorAnual)} · economize {formatBRL(eco)}
                    </p>
                  )}
                </div>

                <ul className="mt-5 flex-1 space-y-2.5">
                  {p.beneficios.slice(0, 6).map((b) => (
                    <li key={b} className="flex gap-2 text-sm leading-snug">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>

                {p.naoInclui?.length ? (
                  <div className="mt-5 rounded-xl bg-muted/40 p-3">
                    <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Fora deste plano</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{p.naoInclui.join(" · ")}</p>
                  </div>
                ) : (
                  <div className="mt-5 rounded-xl bg-violet-500/8 p-3">
                    <div className="flex items-center gap-2 text-violet-700 dark:text-violet-300">
                      <Crown className="h-4 w-4" />
                      <p className="text-xs font-bold">Todos os módulos comerciais inclusos</p>
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  disabled={atual || !!busy || !canChange}
                  onClick={() => void onEscolher(id)}
                  className={cn(
                    "mt-5 flex min-h-11 w-full items-center justify-center rounded-xl px-3 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-55",
                    atual
                      ? "border bg-muted text-muted-foreground"
                      : id === "maximo"
                        ? "bg-violet-600 text-white hover:bg-violet-700"
                        : "bg-foreground text-background hover:opacity-90"
                  )}
                >
                  {busy === id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : atual ? (
                    "Plano atual"
                  ) : (
                    <>
                      {tipo === "upgrade"
                        ? "Solicitar upgrade"
                        : tipo === "downgrade"
                          ? "Solicitar downgrade"
                          : "Solicitar troca"}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            </article>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-[24px] border bg-card shadow-sm">
        <div className="flex flex-col gap-2 border-b p-5 sm:flex-row sm:items-end sm:justify-between sm:p-6">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-primary">Comparativo</p>
            <h3 className="mt-1 text-lg font-black tracking-tight">O que cada plano libera</h3>
          </div>
          <p className="max-w-lg text-xs leading-relaxed text-muted-foreground">
            A diferença entre os planos é modular. O Máximo combina os pacotes Operacional e Financeiro sem duplicar a base Essencial.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left">
            <thead>
              <tr className="border-b bg-muted/20">
                <th className="px-5 py-4 text-[10px] font-black uppercase tracking-wider text-muted-foreground">Recurso</th>
                {PLAN_IDS.map((id) => (
                  <th key={id} className="px-4 py-4 text-center text-[10px] font-black uppercase tracking-wider">
                    {PLAN_LABEL[id]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map((row) => (
                <tr key={row.label} className="border-b last:border-0">
                  <td className="px-5 py-4 text-sm font-medium">{row.label}</td>
                  {PLAN_IDS.map((id) => {
                    const enabled = row[id];
                    return (
                      <td key={id} className="px-4 py-4 text-center">
                        {enabled ? (
                          <span className="mx-auto flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                            <Check className="h-4 w-4" />
                          </span>
                        ) : (
                          <span className="mx-auto flex h-7 w-7 items-center justify-center rounded-full bg-muted text-muted-foreground/60">
                            <Minus className="h-4 w-4" />
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border bg-card p-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <p className="text-sm font-bold">Sem falso bloqueio</p>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            Empresa inexistente aparece como configuração inicial, não como inadimplência.
          </p>
        </div>
        <div className="rounded-2xl border bg-card p-4">
          <div className="flex items-center gap-2">
            <Clock3 className="h-4 w-4 text-primary" />
            <p className="text-sm font-bold">Ativação controlada</p>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            Mudanças de plano são solicitadas no app e ativadas pelo servidor.
          </p>
        </div>
        <div className="rounded-2xl border bg-card p-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <p className="text-sm font-bold">Upgrade sem migração</p>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            O tenant permanece o mesmo; apenas os módulos liberados mudam conforme o plano.
          </p>
        </div>
      </div>

      <p className="text-xs leading-relaxed text-muted-foreground">
        {profile?.email ? "Conta: " + profile.email + ". " : ""}
        Valores exibidos são do catálogo comercial atual. Solicitações não alteram a assinatura automaticamente até a ativação no Supabase.
      </p>
    </section>
  );
}
