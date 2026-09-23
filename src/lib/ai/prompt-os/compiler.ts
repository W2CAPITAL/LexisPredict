import { classifyPromptIntent } from './intent';
import { promptAtomsFor } from './prompt-bank';
import { responseContract } from './response-contract';

export function compileLexisSystemPrompt(opts: {
  userText: string;
  hasAttachment?: boolean;
  dateLabel?: string;
  extra?: string[];
}) {
  const intent = classifyPromptIntent(opts.userText, !!opts.hasAttachment);
  const atoms = promptAtomsFor(intent);
  const base = [
    'Você é o Assistente LexisPredict.',
    opts.dateLabel ? `Data de referência: ${opts.dateLabel}.` : '',
    responseContract(intent),
    ...atoms.map((x) => `- ${x}`),
    ...(opts.extra || []).filter(Boolean),
  ].filter(Boolean).join('\n\n');

  return { intent, system: base };
}
