'use server';

/**
 * Assistente Lexis — qualquer tema, PDF/imagem, thinking limpo, respostas rapidas.
 * Helpers sincronos ficam em chat-parse.ts (sem use server).
 */
import { runCascade, type ChatTurn, type VisionImage } from '@/lib/ai/cascade';
import { parseThinkingAnswer, isSimplePrompt } from '@/lib/ai/chat-parse';
import { extractCnjFromText } from '@/lib/ai/motors';
import { compileLexisSystemPrompt } from '@/lib/ai/prompt-os/compiler';
import { cleanUserFacingAnswer } from '@/lib/ai/prompt-os/response-contract';
import { runProcessScannerSkill } from '@/lib/scanner/process-skill';

export type ChatAiInput = {
  pergunta: string;
  historico?: Array<{ role: 'user' | 'assistant'; content: string }>;
  preferred?: string;
  preferredModel?: string;
  tribunalContext?: string;
  baClaudeDjen?: boolean;
  images?: VisionImage[];
  pdfText?: string;
  pdfName?: string;
  temperature?: number;
  max_tokens?: number;
  showThinking?: boolean;
};

export type ChatAiOutput = {
  resposta: string;
  thinking?: string | null;
  engineUtilizada: string;
  latencia: number;
  tokensConsumidos: number;
  sucesso: boolean;
  baHint?: string | null;
};

export async function chatAIFlow(input: ChatAiInput): Promise<ChatAiOutput> {
  const pergunta = String(input.pergunta || '').trim();
  const hasImg = !!(input.images && input.images.length);
  const hasPdf = !!(input.pdfText && String(input.pdfText).trim());
  if (!pergunta && !hasImg && !hasPdf) {
    return {
      resposta: 'Envie uma pergunta, um PDF ou uma imagem.',
      thinking: null,
      engineUtilizada: 'none',
      latencia: 0,
      tokensConsumidos: 0,
      sucesso: false,
    };
  }

  const simple = isSimplePrompt(pergunta, hasImg || hasPdf);
  const preferred = (input.preferred || input.preferredModel || 'omni').toLowerCase();

  const history: ChatTurn[] = (input.historico || []).slice(simple ? -4 : -12).map((h) => ({
    role: h.role,
    content: h.content,
  }));

  let userContent =
    pergunta ||
    (hasPdf
      ? 'Leia o PDF e explique o conteudo (decisao ou qualquer documento).'
      : 'Analise a imagem com detalhe util.');

  if (hasPdf) {
    userContent += `\n\n--- PDF${input.pdfName ? ` (${input.pdfName})` : ''} ---\n${String(input.pdfText).slice(0, 32000)}\n--- FIM ---`;
  }

  // CNJ usa o scanner consolidado DataJud + DJEN. O resultado entra como evidência,
  // sem transformar detalhes internos de skill/fallback em texto para o usuário.
  let tribunalCtx = input.tribunalContext || '';
  const cnj = extractCnjFromText(pergunta + ' ' + (input.pdfText || '').slice(0, 500));
  if (cnj && !String(tribunalCtx).trim()) {
    try {
      const cnjFmt =
        cnj.length === 20
          ? `${cnj.slice(0, 7)}-${cnj.slice(7, 9)}.${cnj.slice(9, 13)}.${cnj.slice(13, 14)}.${cnj.slice(14, 16)}.${cnj.slice(16, 20)}`
          : cnj;
      const scan = await runProcessScannerSkill(cnjFmt);
      tribunalCtx = JSON.stringify({
        cnj: scan.protocolo,
        tribunal: scan.tribunalAlias,
        fontes: scan.sources,
        datajud: {
          classe: scan.datajud?.classe || null,
          grau: scan.datajud?.grau || null,
          tribunal: scan.datajud?.tribunal || null,
          orgaoJulgador: scan.datajud?.orgaoJulgador || null,
          dataAjuizamento: scan.datajud?.dataAjuizamento || null,
          movimentos: Array.isArray(scan.datajud?.movimentos) ? scan.datajud.movimentos.slice(-15) : [],
          erro: scan.datajud?.error ? scan.datajud?.message || 'falha' : null,
        },
        djen: {
          quantidade: scan.djen?.count || 0,
          erro: scan.djen?.success ? null : scan.djen?.error || 'falha',
          publicacoes: (scan.djen?.items || []).slice(0, 8).map((d: any) => ({
            data: d.data_disponibilizacao,
            tipo: d.tipoComunicacao || d.tipoDocumento,
            orgao: d.nomeOrgao,
            texto: String(d.texto || '').slice(0, 1800),
            link: d.link || null,
          })),
        },
        hipoteses: scan.hypotheses,
      });
    } catch (e: any) {
      tribunalCtx = JSON.stringify({
        cnj,
        consulta: 'inconclusiva',
        erro: e?.message || String(e),
      });
    }
  }

  if (tribunalCtx) {
    userContent += `\n\n--- DJEN / PROCESSO ---\n${String(tribunalCtx).slice(0, 14000)}\n--- FIM ---`;
  }
  if (hasImg) {
    userContent += `\n\n[Imagem anexada — extraia texto e dados visiveis.]`;
  }

  history.push({ role: 'user', content: userContent });

  const dateLabel = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const compiled = compileLexisSystemPrompt({
    userText: pergunta || userContent,
    hasAttachment: hasImg || hasPdf,
    dateLabel,
    extra: tribunalCtx
      ? ['Existe evidência processual anexada ao pedido. Use-a somente quando ela for relevante ao que foi perguntado.']
      : [],
  });

  const forceEngineId =
    ['auto', 'omni', 'omniroute', 'cascade'].includes(preferred)
      ? undefined
      : preferred.includes('anthropic')
        ? 'claude'
        : preferred;

  try {
    const r = await runCascade({
      preferred,
      forceEngineId,
      surface: 'chat',
      system: compiled.system,
      messages: history,
      images: input.images,
      temperature: simple ? 0.35 : input.temperature ?? 0.25,
      max_tokens: simple ? 220 : input.max_tokens ?? 4096,
    });

    const parsed = parseThinkingAnswer(r.text);
    const answer = cleanUserFacingAnswer(parsed.answer);
    return {
      resposta: answer,
      thinking: input.showThinking === true && !simple ? parsed.thinking : null,
      engineUtilizada: `${r.engineId}:${r.model}`,
      latencia: r.latencyMs,
      tokensConsumidos: r.tokens || 0,
      sucesso: !!answer,
      baHint: null,
    };
  } catch {
    return {
      resposta: 'Não foi possível concluir a resposta agora.',
      thinking: null,
      engineUtilizada: 'none',
      latencia: 0,
      tokensConsumidos: 0,
      sucesso: false,
      baHint: null,
    };
  }
}

export async function perguntarIA(input: any) {
  return chatAIFlow({
    pergunta: input?.pergunta || input?.message || input?.prompt || '',
    historico: input?.historico || input?.history,
    preferred: input?.preferred || input?.preferredModel || input?.motor || 'omni',
    preferredModel: input?.preferredModel,
    tribunalContext: input?.tribunalContext,
    baClaudeDjen: !!input?.baClaudeDjen,
    images: input?.images,
    pdfText: input?.pdfText,
    pdfName: input?.pdfName,
    temperature: input?.temperature,
    max_tokens: input?.max_tokens,
    showThinking: input?.showThinking !== false,
  });
}
