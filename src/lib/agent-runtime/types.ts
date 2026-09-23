export type LexisAgentId =
  | 'lexis-autodev'
  | 'scanner-processual'
  | 'document'
  | 'case-review'
  | 'data'
  | 'artifact'
  | 'research'
  | 'error-recovery'
  | 'codebase-investigator'
  | 'qa'
  | 'self-improve';

export type LexisToolRisk = 'read' | 'write' | 'external' | 'privileged';
export type PolicyDecision = 'allow' | 'ask' | 'deny';

export interface LexisToolDescriptor {
  id: string;
  description: string;
  risk: LexisToolRisk;
  runtime: 'server' | 'browser' | 'cli' | 'any';
  requiresHumanConfirmation?: boolean;
}

export interface LexisAgentDescriptor {
  id: LexisAgentId;
  name: string;
  description: string;
  tools: string[];
  runtime: 'server' | 'browser' | 'cli' | 'any';
  deterministic?: boolean;
}

export interface LexisAgentTrace {
  id: string;
  phase: 'recall' | 'route' | 'plan' | 'tool' | 'recover' | 'verify' | 'capture';
  label: string;
  ok: boolean;
  detail: string;
  tool?: string;
  durationMs?: number;
}

export interface LexisTaskPlan {
  route: LexisAgentId;
  reason: string;
  tools: string[];
  requiresCouncil: boolean;
  requiresHumanGate: boolean;
  risk: 'low' | 'medium' | 'high';
}

export interface RuntimeErrorShape {
  kind: 'timeout' | 'rate-limit' | 'geo-block' | 'auth' | 'network' | 'invalid-input' | 'upstream' | 'unknown';
  retryable: boolean;
  waitMs: number;
  userMessage: string;
}
