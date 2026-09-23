import { describe, expect, it } from 'vitest';
import { extractCnj, planLexisTask } from './routing';

describe('agent runtime routing', () => {
  it('routes CNJ to scanner skill', () => {
    const cnj = extractCnj('analise 4000338-89.2026.8.26.0002');
    expect(cnj).toBe('4000338-89.2026.8.26.0002');
    const plan = planLexisTask('analise 4000338-89.2026.8.26.0002');
    expect(plan.route).toBe('scanner-processual');
    expect(plan.tools).toContain('scan_datajud');
    expect(plan.tools).toContain('scan_djen');
  });

  it('routes failures to recovery', () => {
    expect(planLexisTask('DJEN deu erro 403').route).toBe('scanner-processual');
    expect(planLexisTask('o build falhou com timeout').route).toBe('error-recovery');
  });

  it('marks filing as high risk and human gated', () => {
    const plan = planLexisTask('como ajuizar e protocolar uma petição');
    expect(plan.risk).toBe('high');
    expect(plan.requiresHumanGate).toBe(true);
    expect(plan.requiresCouncil).toBe(true);
  });
});
