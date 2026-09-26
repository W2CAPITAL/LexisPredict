import { COGNITIVE_CAPABILITIES } from './registry';
import type { CapabilityId, CognitiveIntent, CognitivePlan, CognitivePlanStep } from './types';

const RULES: Array<{ intent: CognitiveIntent; patterns: RegExp[] }> = [
  { intent: 'document-ocr', patterns: [/ocr/i, /extrair texto/i, /imagem.*texto/i, /documento escaneado/i] },
  { intent: 'legal-research', patterns: [/pesquis/i, /jurisprud/i, /doutrina/i, /fonte/i, /precedente/i] },
  { intent: 'case-analysis', patterns: [/processo/i, /cnj/i, /djen/i, /datajud/i, /liminar/i, /senten[cç]a/i] },
  { intent: 'automation', patterns: [/automat/i, /cron/i, /rotina/i, /workflow/i] },
  { intent: 'web-monitor', patterns: [/monitor/i, /mudan[cç]a/i, /acompanhar site/i, /vigiar/i] },
  { intent: 'browser-task', patterns: [/navegador/i, /browser/i, /clicar/i, /preencher site/i] },
  { intent: 'presentation', patterns: [/ppt/i, /slides?/i, /apresenta[cç][aã]o/i] },
  { intent: 'report', patterns: [/relat[oó]rio/i, /dossi[eê]/i, /executivo/i] },
  { intent: 'voice', patterns: [/voz/i, /[aá]udio/i, /narra[cç][aã]o/i] },
  { intent: 'image-enhance', patterns: [/upscal/i, /melhorar imagem/i, /nitidez/i, /resolu[cç][aã]o/i] },
  { intent: 'visual-generation', patterns: [/anime/i, /render/i, /gerar imagem/i, /visual/i] },
  { intent: 'developer', patterns: [/c[oó]digo/i, /bug/i, /build/i, /typescript/i, /react/i, /next\.js/i] },
  { intent: 'knowledge', patterns: [/wiki/i, /conhecimento/i, /mem[oó]ria/i, /lembr/i] },
];

export function inferCognitiveIntent(text: string, hints?: { hasImage?: boolean; hasDocument?: boolean }): CognitiveIntent {
  if (hints?.hasDocument || hints?.hasImage) {
    if (/ocr|texto|extrair|ler/i.test(text)) return 'document-ocr';
  }
  for (const rule of RULES) {
    if (rule.patterns.some((p) => p.test(text))) return rule.intent;
  }
  return 'chat';
}

function step(capability: CapabilityId, reason: string, required = true): CognitivePlanStep {
  return { capability, reason, required };
}

const INTENT_STEPS: Record<CognitiveIntent, CognitivePlanStep[]> = {
  chat: [
    step('memory-v2', 'Recuperar contexto útil sem gastar tokens.'),
    step('model-cascade', 'Gerar a resposta quando regra local não for suficiente.'),
    step('quality-gate', 'Validar a saída antes de entregar.'),
  ],
  'legal-research': [
    step('memory-v2', 'Reusar contexto e decisões existentes.'),
    step('research', 'Separar perguntas, fontes e evidências.'),
    step('council', 'Revisar fatos, contrapontos e implicações.'),
    step('quality-gate', 'Bloquear afirmações sem suporte suficiente.'),
  ],
  'case-analysis': [
    step('lexis-rules', 'Aplicar regras de CNJ, carteira, permissões e dados primeiro.'),
    step('memory-v2', 'Trazer histórico relevante do caso.'),
    step('council', 'Analisar por lentes operacional, jurídica e crítica.'),
    step('quality-gate', 'Checar coerência e evidência.'),
  ],
  'document-ocr': [
    step('ocr', 'Extrair texto com motor local/self-host e fallback.'),
    step('document-understanding', 'Estruturar conteúdo sem misturar extração e interpretação.'),
    step('quality-gate', 'Sinalizar baixa confiança ou campos ausentes.'),
  ],
  automation: [
    step('lexis-rules', 'Resolver a maior parte da automação por regra determinística.'),
    step('observability', 'Registrar execução e falhas.'),
    step('model-cascade', 'Usar IA apenas na parte sem regra estável.', false),
  ],
  'web-monitor': [
    step('change-watch', 'Gerar snapshots e diffs antes de interpretar mudanças.'),
    step('research', 'Interpretar somente mudanças relevantes.', false),
    step('observability', 'Registrar quando e por que houve alerta.'),
  ],
  'browser-task': [
    step('browser-agent', 'Executar navegação em ambiente isolado e observável.'),
    step('quality-gate', 'Confirmar resultado em vez de confiar só no clique.'),
  ],
  report: [
    step('memory-v2', 'Reusar dados e contexto já conhecidos.'),
    step('report-engine', 'Montar narrativa e seções estruturadas.'),
    step('council', 'Revisar achados e contrapontos.', false),
    step('quality-gate', 'Checar números, fontes e lacunas.'),
  ],
  presentation: [
    step('report-engine', 'Estruturar fatos e mensagem antes do layout.'),
    step('presentation-engine', 'Converter narrativa em slides.'),
    step('quality-gate', 'Checar consistência entre dados e slides.'),
  ],
  voice: [
    step('voice-studio', 'Usar worker de voz apenas quando configurado.', false),
    step('quality-gate', 'Validar texto/roteiro antes da síntese.'),
  ],
  'image-enhance': [
    step('image-enhance', 'Executar upscale fora do bundle principal.', false),
    step('quality-gate', 'Confirmar que o conteúdo não foi alterado indevidamente.'),
  ],
  'visual-generation': [
    step('visual-render', 'Usar render/estilização em worker dedicado.', false),
    step('quality-gate', 'Verificar aderência ao pedido.'),
  ],
  developer: [
    step('memory-v2', 'Recuperar decisões técnicas anteriores.'),
    step('council', 'Planejar, revisar riscos e testar mudança.'),
    step('quality-gate', 'Exigir evidência de teste/build antes de concluir.'),
  ],
  knowledge: [
    step('memory-v2', 'Recuperar e deduplicar conhecimento existente.'),
    step('research', 'Expandir conhecimento quando necessário.', false),
    step('quality-gate', 'Separar memória, inferência e evidência.'),
  ],
};

export function buildCognitivePlan(input: {
  text: string;
  hasImage?: boolean;
  hasDocument?: boolean;
}): CognitivePlan {
  const intent = inferCognitiveIntent(input.text, input);
  const steps = INTENT_STEPS[intent].filter((s) => Boolean(COGNITIVE_CAPABILITIES[s.capability]));
  return {
    intent,
    steps,
    zeroTokenFirst: steps.length > 0 && COGNITIVE_CAPABILITIES[steps[0].capability].zeroToken,
    requiresModel: steps.some((s) => s.required && !COGNITIVE_CAPABILITIES[s.capability].zeroToken),
  };
}
