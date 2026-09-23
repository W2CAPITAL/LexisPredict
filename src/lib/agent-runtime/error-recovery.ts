import type { RuntimeErrorShape } from './types';

export function classifyRuntimeError(error: unknown, status?: number): RuntimeErrorShape {
  const msg = String((error as any)?.message || error || '').toLowerCase();
  const code = Number(status || (error as any)?.status || 0);

  if (code === 429 || /rate.?limit|taxa excedida|429/.test(msg)) {
    return { kind: 'rate-limit', retryable: true, waitMs: 60_000, userMessage: 'A fonte pediu uma pausa. A consulta deve ser retomada com backoff.' };
  }
  if (code === 403 && /djen|geo|cloudfront|pje/.test(msg)) {
    return { kind: 'geo-block', retryable: true, waitMs: 15_000, userMessage: 'O DJEN bloqueou a origem de rede. Use gru1 e, se necessário, consulta direta pelo navegador do usuário.' };
  }
  if (code === 401 || /unauthor|token|api.?key|credencial/.test(msg)) {
    return { kind: 'auth', retryable: false, waitMs: 0, userMessage: 'Credencial/configuração inválida. Não repetir até corrigir o ambiente.' };
  }
  if (/abort|timeout|tempo esgotado|timed out/.test(msg)) {
    return { kind: 'timeout', retryable: true, waitMs: 1_500, userMessage: 'A fonte excedeu o tempo. Repetir com backoff e preservar o resultado das outras fontes.' };
  }
  if (/cnj inv[aá]lido|query vazia|invalid input|payload/.test(msg)) {
    return { kind: 'invalid-input', retryable: false, waitMs: 0, userMessage: 'A entrada precisa ser corrigida antes de nova execução.' };
  }
  if (code >= 500 || /upstream|gateway|503|502|504/.test(msg)) {
    return { kind: 'upstream', retryable: true, waitMs: 2_000, userMessage: 'Serviço externo instável. Repetir e acionar fallback sem apagar evidências já obtidas.' };
  }
  if (/fetch failed|network|rede|enotfound|econn/.test(msg)) {
    return { kind: 'network', retryable: true, waitMs: 1_500, userMessage: 'Falha de rede. Tentar novamente e manter fallback.' };
  }
  return { kind: 'unknown', retryable: false, waitMs: 0, userMessage: 'Falha não classificada. Registrar evidência e não inventar sucesso.' };
}

export function recoveryChecklist(shape: RuntimeErrorShape): string[] {
  const base = ['preservar resultados parciais', 'registrar a fonte que falhou', 'não converter ausência em inexistência'];
  if (shape.retryable) base.push(`aguardar pelo menos ${shape.waitMs}ms antes do retry`);
  if (shape.kind === 'geo-block') base.push('tentar caminho server gru1 e fallback browser direto');
  if (shape.kind === 'auth') base.push('verificar variável de ambiente sem expor segredo');
  return base;
}
