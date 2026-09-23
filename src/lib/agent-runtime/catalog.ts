import type { LexisAgentDescriptor, LexisToolDescriptor } from './types';

export const LEXIS_TOOLS: LexisToolDescriptor[] = [
  { id: 'scan_datajud', description: 'Consulta metadados/movimentos na API Pública DataJud.', risk: 'external', runtime: 'server' },
  { id: 'scan_djen', description: 'Consulta comunicações oficiais do DJEN.', risk: 'external', runtime: 'server' },
  { id: 'normalize_timeline', description: 'Normaliza eventos e preserva origem.', risk: 'read', runtime: 'any' },
  { id: 'failure_recovery', description: 'Classifica timeout/403/429 e escolhe fallback.', risk: 'read', runtime: 'any' },
  { id: 'read_scoped_data', description: 'Lê apenas dados autorizados do tenant atual.', risk: 'read', runtime: 'server' },
  { id: 'ai_cascade', description: 'Usa cascata configurada sem depender de um único modelo.', risk: 'external', runtime: 'server' },
  { id: 'collect_signals', description: 'Coleta CI, testes, TODOs e feedback para melhoria.', risk: 'read', runtime: 'cli' },
  { id: 'candidate_patch', description: 'Gera patch candidato em branch/sandbox.', risk: 'write', runtime: 'cli', requiresHumanConfirmation: true },
  { id: 'apply_patch', description: 'Aplica patch validado localmente.', risk: 'write', runtime: 'cli', requiresHumanConfirmation: true },
  { id: 'merge_pr', description: 'Mescla PR depois dos gates.', risk: 'privileged', runtime: 'cli', requiresHumanConfirmation: true },
];

export const LEXIS_AGENT_CATALOG: LexisAgentDescriptor[] = [
  { id: 'lexis-autodev', name: 'Lexis AutoDev Orchestrator', description: 'Orquestra skills, ferramentas, recuperação de erro e verificação.', tools: ['recall','route','ai_cascade','failure_recovery'], runtime: 'any' },
  { id: 'scanner-processual', name: 'Scanner Processual', description: 'DataJud + DJEN com trace, retry e resultado parcial.', tools: ['scan_datajud','scan_djen','normalize_timeline','failure_recovery'], runtime: 'server', deterministic: true },
  { id: 'document', name: 'Document Agent', description: 'Extrai fatos, provas e estrutura de documentos.', tools: ['read_document','extract_evidence'], runtime: 'server' },
  { id: 'case-review', name: 'Case Review Agent', description: 'Revisa caso, riscos e inconsistências.', tools: ['read_scoped_data','ai_cascade'], runtime: 'server' },
  { id: 'data', name: 'Data Agent', description: 'KPIs e consultas estruturadas com evidência.', tools: ['read_scoped_data'], runtime: 'server', deterministic: true },
  { id: 'artifact', name: 'Artifact Agent', description: 'Gera dossiês, relatórios e artefatos.', tools: ['ai_cascade'], runtime: 'server' },
  { id: 'research', name: 'Research Agent', description: 'Prioriza fontes oficiais e cruza evidência.', tools: ['ai_cascade'], runtime: 'server' },
  { id: 'error-recovery', name: 'Error Recovery Agent', description: 'Classifica falhas e executa plano de recuperação.', tools: ['failure_recovery'], runtime: 'any', deterministic: true },
  { id: 'codebase-investigator', name: 'Codebase Investigator', description: 'Mapeia arquitetura, dependências e arquivos quentes.', tools: ['collect_signals'], runtime: 'cli' },
  { id: 'qa', name: 'QA / E2E Agent', description: 'Gates de typecheck, testes, build, segurança e E2E.', tools: ['collect_signals'], runtime: 'cli' },
  { id: 'self-improve', name: 'Self Improve Agent', description: 'Feedback → hipótese → patch → eval → PR.', tools: ['collect_signals','candidate_patch'], runtime: 'cli' },
];

export function getLexisAgent(id: string) {
  return LEXIS_AGENT_CATALOG.find((x) => x.id === id) || LEXIS_AGENT_CATALOG[0];
}

export function getLexisTool(id: string) {
  return LEXIS_TOOLS.find((x) => x.id === id);
}
