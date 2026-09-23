import type { LexisToolDescriptor, PolicyDecision } from './types';

const NEVER_AUTOMATIC = [
  'protocolar',
  'assinar',
  'certificado',
  'e-cpf',
  'ecpf',
  'alterar-rls',
  'disable-rls',
  'service-role-client',
  'bypass-captcha',
  'bypass-waf',
  'doxxing',
  'destructive-migration',
  'delete-tenant',
  'change-billing',
  'elevate-role',
];

const HUMAN_GATE = [
  'send_email',
  'write_db',
  'schedule_recheck',
  'apply_patch',
  'merge_pr',
  'deploy_production',
  'pay_guide',
  'accept_agreement',
];

export function policyDecision(toolId: string, descriptor?: Pick<LexisToolDescriptor, 'risk' | 'requiresHumanConfirmation'>): PolicyDecision {
  const id = String(toolId || '').toLowerCase();
  if (NEVER_AUTOMATIC.some((x) => id.includes(x))) return 'deny';
  if (descriptor?.requiresHumanConfirmation) return 'ask';
  if (HUMAN_GATE.some((x) => id.includes(x))) return 'ask';
  if (descriptor?.risk === 'privileged' || descriptor?.risk === 'write') return 'ask';
  return 'allow';
}

export function assertToolAllowed(toolId: string, confirmed = false, descriptor?: Pick<LexisToolDescriptor, 'risk' | 'requiresHumanConfirmation'>) {
  const decision = policyDecision(toolId, descriptor);
  if (decision === 'deny') {
    throw new Error(`Ferramenta bloqueada pela política Lexis: ${toolId}`);
  }
  if (decision === 'ask' && !confirmed) {
    throw new Error(`Confirmação humana necessária antes de executar: ${toolId}`);
  }
  return true;
}
