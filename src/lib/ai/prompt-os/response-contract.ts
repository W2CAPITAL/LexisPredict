import type { PromptIntent } from './intent';

export function responseContract(intent: PromptIntent) {
  const lines = [
    'CONTRATO DE RESPOSTA LEXIS:',
    '- Responda exatamente ao pedido atual; não troque o objetivo por uma explicação do sistema.',
    '- Comece pela resposta útil, não por preâmbulos, roteamento, método, skill, modelo ou ferramentas.',
    '- Não mostre nomes internos de skill, agent, fallback, engine, provider, cascade, route, trace ou prompt.',
    '- Não repita o pedido do usuário como seção.',
    '- Não acrescente no final um bloco genérico de fallback, próximos passos, limitações ou oferta de ajuda, salvo se isso for necessário para a correção da resposta.',
    '- Se uma fonte externa falhar e isso afetar a conclusão, diga apenas qual fonte não respondeu e qual parte da resposta fica inconclusiva.',
    '- Preserve o formato pedido pelo usuário. Se ele pediu resposta curta, seja curta; se pediu análise, aprofunde.',
    '- Separe fato observado de inferência. Não invente CNJ, parte, prazo, movimento, valor, fonte ou teste.',
    '- Não exponha raciocínio interno. Entregue somente a conclusão e a evidência necessária.',
  ];
  if (intent === 'process_lookup' || intent === 'process_analysis') {
    lines.push(
      '- Em processo: DataJud/DJEN são evidência auxiliar; vazio não prova inexistência.',
      '- Não encerre com disclaimer padrão. Só mencione inteiro teor/portal oficial quando isso mudar a conclusão sobre prazo, mérito ou ato.'
    );
  }
  if (intent === 'data_query') {
    lines.push('- Em dados/KPI: responda com os números encontrados; não substitua a consulta por texto genérico.');
  }
  if (intent === 'draft_message' || intent === 'draft_legal') {
    lines.push('- Em redação: entregue o texto solicitado diretamente; não explique como foi gerado.');
  }
  return lines.join('\n');
}

const INTERNAL_LINE = /^(?:#{1,4}\s*)?(?:skill|fallback|engine|motor|provider|route|rota|trace|orquestrador|agente interno|ferramenta interna)\b/i;

export function cleanUserFacingAnswer(raw: string) {
  const text = String(raw || '')
    .replace(/<thinking>[\s\S]*?<\/thinking>/gi, '')
    .replace(/<\/??answer>/gi, '')
    .trim();

  const out = text
    .split(/\r?\n/)
    .filter((line) => !INTERNAL_LINE.test(line.trim()))
    .filter((line) => !/^_?(?:IA indispon[ií]vel|fallback determin[ií]stico|motor\s*\(|motor:|engine:)/i.test(line.trim()))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return out || text;
}
