import { describe, expect, it } from 'vitest';
import { formatProcessScannerSkill, runProcessScannerSkill } from './process-skill';

describe('process scanner skill', () => {
  it('rejects invalid CNJ before external calls', async () => {
    await expect(runProcessScannerSkill('123')).rejects.toThrow(/CNJ inválido/);
  });

  it('formats partial evidence without claiming nonexistence', () => {
    const text = formatProcessScannerSkill({
      success: true,
      partial: true,
      protocolo: '4000338-89.2026.8.26.0002',
      digits: '40003388920268260002',
      tribunalAlias: 'tjsp',
      headline: 'nenhuma evidência pública conclusiva nesta execução.',
      datajud: { movimentos: [], error: false },
      djen: { success: false, count: 0, items: [], error: '403' },
      sources: [],
      trace: [{ id: 'djen', phase: 'recover', label: 'DJEN', ok: false, detail: 'geo-block' }],
      hypotheses: ['Ausência em API não prova inexistência.'],
      nextSteps: ['Consultar portal oficial.'],
      fetchedAt: new Date(0).toISOString(),
    });
    expect(text).toContain('Ausência em API não prova inexistência');
    expect(text).toContain('Consultar portal oficial');
  });
});
