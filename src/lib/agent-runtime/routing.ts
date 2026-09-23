import type { LexisAgentId, LexisTaskPlan } from './types';

export function extractCnj(text: string): string | null {
  const m = String(text || '').match(/\b\d{7}-?\d{2}\.?\d{4}\.?\d\.?\d{2}\.?\d{4}\b/);
  if (!m) return null;
  const digits = m[0].replace(/\D/g, '');
  if (digits.length !== 20) return null;
  return `${digits.slice(0, 7)}-${digits.slice(7, 9)}.${digits.slice(9, 13)}.${digits.slice(13, 14)}.${digits.slice(14, 16)}.${digits.slice(16, 20)}`;
}

export function planLexisTask(prompt: string, requested?: string): LexisTaskPlan {
  const q = String(prompt || '').toLowerCase();
  const cnj = extractCnj(prompt);
  let route: LexisAgentId = 'lexis-autodev';
  let reason = 'Orquestração geral Lexis';

  if (requested === 'scanner-processual' || cnj || /datajud|djen|scanner|tribunal|publica[cç][aã]o/.test(q)) {
    route = 'scanner-processual';
    reason = cnj ? 'CNJ detectado: usar scanner DataJud + DJEN' : 'Consulta processual/tribunal detectada';
  } else if (/erro|falhou|timeout|429|403|bug|quebrou|exception/.test(q)) {
    route = 'error-recovery';
    reason = 'Sintomas de falha detectados';
  } else if (/teste|e2e|regress[aã]o|qa|validar build|smoke/.test(q)) {
    route = 'qa';
    reason = 'Validação/regressão detectada';
  } else if (/c[oó]digo|arquitetura|repo|reposit[oó]rio|depend[eê]ncia|refator/.test(q)) {
    route = 'codebase-investigator';
    reason = 'Investigação de código/arquitetura detectada';
  } else if (/documento|pdf|dossi[eê]|contrato|pe[cç]a/.test(q)) {
    route = 'document';
    reason = 'Documento/dossiê detectado';
  } else if (/sql|banco|dados|kpi|relat[oó]rio|carteira/.test(q)) {
    route = 'data';
    reason = 'Consulta de dados detectada';
  } else if (/pesquis|jurisprud|fonte oficial|web/.test(q)) {
    route = 'research';
    reason = 'Pesquisa externa detectada';
  }

  const high = /protocol|assinar|ajuizar|processar|peti[cç][aã]o|custas|acordo|produ[cç][aã]o/.test(q);
  const council = high || /council|x10|red.?team|stress|pressure|lado ruim|risco/.test(q);

  return {
    route,
    reason,
    tools: toolSetFor(route),
    requiresCouncil: council,
    requiresHumanGate: high,
    risk: high ? 'high' : route === 'scanner-processual' || route === 'error-recovery' ? 'medium' : 'low',
  };
}

function toolSetFor(route: LexisAgentId): string[] {
  switch (route) {
    case 'scanner-processual': return ['scan_datajud', 'scan_djen', 'normalize_timeline', 'failure_recovery'];
    case 'error-recovery': return ['classify_error', 'retry_plan', 'fallback_plan'];
    case 'qa': return ['typecheck', 'unit_tests', 'e2e', 'security_scan'];
    case 'codebase-investigator': return ['project_rules', 'dependency_map', 'hot_files', 'architecture_review'];
    case 'document': return ['read_document', 'extract_evidence', 'summarize_with_citations'];
    case 'data': return ['read_scoped_data', 'compute_kpis', 'explain_evidence'];
    case 'research': return ['official_source_search', 'cross_check', 'source_summary'];
    case 'self-improve': return ['collect_signals', 'candidate_patch', 'eval', 'draft_pr'];
    default: return ['recall', 'route', 'deterministic_tools', 'ai_cascade', 'verify'];
  }
}
