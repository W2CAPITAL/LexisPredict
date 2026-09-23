export type PromptIntent =
  | 'process_lookup'
  | 'process_analysis'
  | 'document'
  | 'draft_message'
  | 'draft_legal'
  | 'data_query'
  | 'code'
  | 'research'
  | 'media'
  | 'general';

export function classifyPromptIntent(text: string, hasAttachment = false): PromptIntent {
  const q = String(text || '').toLowerCase();
  const hasCnj = /\b\d{7}-?\d{2}\.?\d{4}\.?\d\.?\d{2}\.?\d{4}\b/.test(q);
  if (hasCnj && /anal|risco|estrat|prazo|recurso|senten|decis|publica|moviment/.test(q)) return 'process_analysis';
  if (hasCnj || /datajud|djen|processo|tribunal|e-saj|pje/.test(q)) return 'process_lookup';
  if (hasAttachment || /pdf|documento|contrato|anexo|arquivo|extrai|resumir documento/.test(q)) return 'document';
  if (/whatsapp|mensagem|email|e-mail|resposta ao cliente|redija mensagem/.test(q)) return 'draft_message';
  if (/peti[cç][aã]o|r[eé]plica|contesta[cç][aã]o|manifesta[cç][aã]o|recurso|minuta jur[ií]dica/.test(q)) return 'draft_legal';
  if (/kpi|quantos|ranking|top \d|planilha|sql|dados|carteira|vencid|atras/.test(q)) return 'data_query';
  if (/c[oó]digo|typescript|javascript|next\.js|react|build|vercel|github|bug|erro|stack|repo/.test(q)) return 'code';
  if (/pesquise|pesquisa|fonte|web|compare|verifique|jurisprud/.test(q)) return 'research';
  if (/imagem|video|vídeo|3d|render|visual|cinematic|design/.test(q)) return 'media';
  return 'general';
}
