"use client";

import {
  applyBrowserDjenResultAction,
  scanSingleCaseAction,
} from "@/app/actions/case-actions";
import { djenBuscaProcesso, type DjenClientResult } from "@/lib/djen-client";

export type InteractiveScanMode = "datajud" | "djen" | "both";

export type InteractiveScanSourceStatus = {
  requested: boolean;
  ok: boolean;
  via?: "browser" | "server";
  error?: string | null;
  empty?: boolean;
};

export type InteractiveScanResult = {
  success: boolean;
  offline: boolean;
  partial: boolean;
  error?: string;
  message?: string;
  case?: any;
  casePatch?: Record<string, any>;
  movimentos: any[];
  comunicacoes: any[];
  sourceStatus: {
    datajud: InteractiveScanSourceStatus;
    djen: InteractiveScanSourceStatus;
  };
};

function isDataJudOk(result: any) {
  return result?.sourceStatus?.datajud?.ok === true && result?.offline !== true;
}

function isDjenServerOk(result: any) {
  return result?.sourceStatus?.djen?.ok === true && result?.offline !== true;
}

function mergeCasePatch(...patches: Array<Record<string, any> | null | undefined>) {
  return Object.assign({}, ...patches.filter(Boolean));
}

/**
 * Scanner interativo comercial:
 * - DataJud fica no servidor;
 * - DJEN tenta primeiro direto no browser (IP do usuário);
 * - se o browser não conseguir consultar, tenta fallback server-side;
 * - uma fonte indisponível nunca apaga o resultado válido da outra.
 */
export async function scanInteractiveCase(
  protocolo: string,
  options: {
    mode?: InteractiveScanMode;
    fast?: boolean;
    useClaudeAi?: boolean;
    dataInicioDjen?: string;
  } = {}
): Promise<InteractiveScanResult> {
  const mode = options.mode || "both";
  const wantsDataJud = mode === "datajud" || mode === "both";
  const wantsDjen = mode === "djen" || mode === "both";

  let datajudResult: any = null;
  let djenClient: DjenClientResult | null = null;
  let djenPersisted: any = null;
  let djenFallback: any = null;

  const tasks: Promise<void>[] = [];

  if (wantsDataJud) {
    tasks.push(
      (async () => {
        datajudResult = await scanSingleCaseAction(protocolo, {
          mode: "datajud",
          fast: options.fast === true,
          useClaudeAi: options.useClaudeAi === true,
        });
      })()
    );
  }

  if (wantsDjen) {
    tasks.push(
      (async () => {
        djenClient = await djenBuscaProcesso({
          protocolo,
          dataInicio: options.dataInicioDjen,
        });

        if (djenClient.ok) {
          djenPersisted = await applyBrowserDjenResultAction(protocolo, {
            items: djenClient.items,
            count: djenClient.count,
          });
          return;
        }

        // Fallback para situações em que o navegador está bloqueado por
        // extensão, proxy corporativo ou política local. O fallback não
        // substitui o fluxo principal browser-first.
        djenFallback = await scanSingleCaseAction(protocolo, {
          mode: "djen",
          fast: false,
          useClaudeAi: false,
        });
      })()
    );
  }

  await Promise.all(tasks);

  const datajudOk = wantsDataJud ? isDataJudOk(datajudResult) : true;
  const djenBrowserOk = !!(djenClient?.ok && djenPersisted?.success);
  const djenServerOk = !!(!djenBrowserOk && isDjenServerOk(djenFallback));
  const djenOk = wantsDjen ? djenBrowserOk || djenServerOk : true;

  const movimentos = Array.isArray(datajudResult?.movimentos)
    ? datajudResult.movimentos
    : [];

  const comunicacoes = djenBrowserOk
    ? Array.isArray(djenPersisted?.comunicacoes)
      ? djenPersisted.comunicacoes
      : []
    : Array.isArray(djenFallback?.comunicacoes)
      ? djenFallback.comunicacoes
      : [];

  const casePatch = mergeCasePatch(
    datajudResult?.casePatch,
    djenBrowserOk ? djenPersisted?.casePatch : djenFallback?.casePatch
  );

  const caseData =
    (djenBrowserOk ? djenPersisted?.case : djenFallback?.case) ||
    datajudResult?.case ||
    null;

  const requestedOk = datajudOk && djenOk;
  const atLeastOneOk =
    (!wantsDataJud || datajudOk) || (!wantsDjen || djenOk);

  const datajudError =
    wantsDataJud && !datajudOk
      ? String(
          datajudResult?.error ||
            datajudResult?.message ||
            "DataJud indisponível nesta tentativa."
        )
      : null;

  const djenError =
    wantsDjen && !djenOk
      ? String(
          djenClient?.error ||
            djenFallback?.error ||
            djenFallback?.message ||
            "DJEN indisponível nesta tentativa."
        )
      : null;

  const statusParts: string[] = [];
  if (wantsDataJud) {
    statusParts.push(
      datajudOk
        ? movimentos.length
          ? `DataJud: ${movimentos.length} movimento(s)`
          : "DataJud: consulta concluída, sem movimento novo"
        : "DataJud: indisponível"
    );
  }
  if (wantsDjen) {
    statusParts.push(
      djenOk
        ? comunicacoes.length
          ? `DJEN: ${comunicacoes.length} publicação(ões)`
          : "DJEN: consulta concluída, sem publicação no período"
        : "DJEN: indisponível"
    );
  }

  return {
    success: atLeastOneOk,
    offline: !atLeastOneOk,
    partial: atLeastOneOk && !requestedOk,
    error:
      !atLeastOneOk
        ? [datajudError, djenError].filter(Boolean).join(" · ")
        : undefined,
    message: statusParts.join(" · "),
    case: caseData,
    casePatch,
    movimentos,
    comunicacoes,
    sourceStatus: {
      datajud: {
        requested: wantsDataJud,
        ok: datajudOk,
        via: wantsDataJud ? "server" : undefined,
        error: datajudError,
        empty: wantsDataJud && datajudOk && movimentos.length === 0,
      },
      djen: {
        requested: wantsDjen,
        ok: djenOk,
        via: djenBrowserOk ? "browser" : djenServerOk ? "server" : undefined,
        error: djenError,
        empty: wantsDjen && djenOk && comunicacoes.length === 0,
      },
    },
  };
}
