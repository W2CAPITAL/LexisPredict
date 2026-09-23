import { classifyRuntimeError, recoveryChecklist } from './error-recovery';
import type { LexisTaskPlan } from './types';

export function buildRuntimeBrief(plan: LexisTaskPlan, prompt: string) {
  const lines = [
    '## Lexis AutoDev Runtime',
    `**Rota:** ${plan.route}`,
    `**Motivo:** ${plan.reason}`,
    `**Risco:** ${plan.risk}`,
    `**Ferramentas:** ${plan.tools.join(', ')}`,
  ];

  if (plan.route === 'error-recovery') {
    const shape = classifyRuntimeError(prompt);
    lines.push(
      '',
      '### Recovery',
      `Tipo: **${shape.kind}** · retryable: **${shape.retryable ? 'sim' : 'não'}**`,
      shape.userMessage,
      ...recoveryChecklist(shape).map((x) => `- ${x}`)
    );
  } else if (plan.route === 'qa') {
    lines.push(
      '',
      '### Gates',
      '- pnpm run typecheck',
      '- pnpm test',
      '- pnpm run build',
      '- pnpm run security',
      '- E2E adicional para auth/tenant/billing/process scope',
      '',
      'Falha em qualquer gate impede a declaração de pronto.'
    );
  } else if (plan.route === 'codebase-investigator') {
    lines.push(
      '',
      '### Investigação',
      '- Regras: AGENTS.md',
      '- Núcleo: src/lib',
      '- Rotas: src/app',
      '- UI: src/components',
      '- IA: src/lib/ai',
      '- Scanner: src/lib/datajud.ts + src/lib/djen.ts + src/lib/scanner',
      '- Autoaprimoramento: scripts/selfimprove',
      '',
      'Mudança proposta deve identificar hot files, dependências, regressões e rollback.'
    );
  } else if (plan.route === 'self-improve') {
    lines.push(
      '',
      '### Self Improve',
      'feedback/erro → collect → diagnóstico → patch candidato → eval → PR → human gate → deploy',
      'Produção nunca é reescrita silenciosamente pelo próprio app.'
    );
  }

  if (plan.requiresCouncil) {
    lines.push('', '### Council X10', 'A tarefa exige FORGE + AEGIS antes da síntese final.');
  }
  if (plan.requiresHumanGate) {
    lines.push('', '### Human gate', 'Há ação sensível; preparar até o ponto de confirmação e parar antes do ato externo.');
  }

  return lines.join('\n');
}
