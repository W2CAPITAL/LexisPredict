/**
 * Generated prompt corpus seed.
 * Run `pnpm run prompts:sync` to rebuild from approved prompt sources.
 * Do not hand-edit large generated corpora.
 */
export type CorpusPrompt = {
  id: string;
  title: string;
  category: string;
  tags: string[];
  text: string;
  source: string;
  kind: 'system-pattern' | 'user-template' | 'eval';
};

export const GENERATED_PROMPT_CORPUS: CorpusPrompt[] = [
  {
    id: 'lexis-process-summary',
    title: 'Resumo processual focado',
    category: 'processo',
    tags: ['cnj','processo','datajud','djen','resumo'],
    text: 'Responda apenas com fase atual, fatos públicos encontrados, risco imediato se houver e a resposta direta à pergunta. Não acrescente metadados de execução.',
    source: 'LexisPredict',
    kind: 'system-pattern',
  },
  {
    id: 'lexis-djen-explain',
    title: 'Explicar publicação DJEN',
    category: 'processo',
    tags: ['djen','publicação','prazo','cliente'],
    text: 'Explique a publicação em linguagem clara. Identifique somente prazos, custas ou providências que estejam expressos ou claramente sustentados pelo texto.',
    source: 'LexisPredict',
    kind: 'user-template',
  },
  {
    id: 'lexis-data-answer',
    title: 'Consulta de carteira objetiva',
    category: 'dados',
    tags: ['kpi','ranking','carteira','vencidos','dados'],
    text: 'Responda com os dados solicitados primeiro. Não troque a consulta por um resumo genérico da carteira.',
    source: 'LexisPredict',
    kind: 'system-pattern',
  },
  {
    id: 'lexis-document-grounding',
    title: 'Documento com evidência',
    category: 'documento',
    tags: ['pdf','documento','contrato','decisão','evidência'],
    text: 'Baseie a resposta no documento fornecido. Diferencie trecho observado, inferência e ponto não suportado pelo material.',
    source: 'LexisPredict',
    kind: 'system-pattern',
  },
  {
    id: 'lexis-draft-direct',
    title: 'Redação direta',
    category: 'redação',
    tags: ['whatsapp','email','mensagem','minuta','texto'],
    text: 'Entregue o texto solicitado diretamente, sem explicar o processo de geração, sem assinatura extra e sem seção de fallback.',
    source: 'LexisPredict',
    kind: 'system-pattern',
  },
  {
    id: 'lexis-code-proof',
    title: 'Código com prova de execução',
    category: 'código',
    tags: ['build','teste','github','vercel','typescript','bug'],
    text: 'Diferencie claramente o que foi alterado do que foi realmente testado. Não afirme build, teste, deploy ou correção sem evidência.',
    source: 'LexisPredict',
    kind: 'system-pattern',
  },
];
