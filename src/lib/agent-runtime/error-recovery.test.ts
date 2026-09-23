import { describe, expect, it } from 'vitest';
import { classifyRuntimeError, recoveryChecklist } from './error-recovery';

describe('runtime error recovery', () => {
  it('classifies DJEN geo block', () => {
    const x = classifyRuntimeError('DJEN geo-block CloudFront', 403);
    expect(x.kind).toBe('geo-block');
    expect(x.retryable).toBe(true);
    expect(recoveryChecklist(x).join(' ')).toMatch(/gru1/);
  });

  it('classifies rate limit', () => {
    const x = classifyRuntimeError('429');
    expect(x.kind).toBe('rate-limit');
    expect(x.waitMs).toBeGreaterThanOrEqual(60000);
  });

  it('does not retry invalid input', () => {
    const x = classifyRuntimeError('CNJ inválido');
    expect(x.kind).toBe('invalid-input');
    expect(x.retryable).toBe(false);
  });
});
