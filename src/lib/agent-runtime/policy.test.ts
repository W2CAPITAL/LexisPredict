import { describe, expect, it } from 'vitest';
import { assertToolAllowed, policyDecision } from './policy';

describe('agent tool policy', () => {
  it('denies bypass and third-party certificate operations', () => {
    expect(policyDecision('bypass-captcha')).toBe('deny');
    expect(policyDecision('usar-e-cpf-de-terceiro')).toBe('deny');
  });

  it('asks before writes', () => {
    expect(policyDecision('write_db')).toBe('ask');
    expect(() => assertToolAllowed('write_db')).toThrow(/Confirmação humana/);
    expect(assertToolAllowed('write_db', true)).toBe(true);
  });

  it('allows read-only tools', () => {
    expect(policyDecision('scan_datajud', { risk: 'external' })).toBe('allow');
  });
});
