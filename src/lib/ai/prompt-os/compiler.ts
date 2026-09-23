import { classifyPromptIntent } from './intent';
import { promptAtomsFor } from './prompt-bank';
import { responseContract } from './response-contract';
import { retrievePromptPatterns } from './retriever';

export function compileLexisSystemPrompt(opts: {
  userText: string;
  hasAttachment?: boolean;
  dateLabel?: string;
  extra?: string[];
}) {
  const intent = classifyPromptIntent(opts.userText, !!opts.hasAttachment);
  const atoms = promptAtomsFor(intent);
  const retrieved = retrievePromptPatterns(opts.userText, { limit: 3, kind: 'system-pattern' });
  const base = [
    'Você é o Assistente LexisPredict.',
    opts.dateLabel ? `Data de referência: ${opts.dateLabel}.` : '',
    responseContract(intent),
    ...atoms.map((x) => `- ${x}`),
    ...retrieved.map((x) => `- Padrão recuperado (${x.id}): ${x.text}`),
    ...(opts.extra || []).filter(Boolean),
  ].filter(Boolean).join('\n\n');

  return { intent, system: base };
}
