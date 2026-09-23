import { GENERATED_PROMPT_CORPUS, type CorpusPrompt } from './corpus.generated';

function tokens(text: string) {
  return new Set(
    String(text || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .split(/[^a-z0-9]+/)
      .filter((x) => x.length >= 3)
  );
}

export function retrievePromptPatterns(query: string, opts?: { limit?: number; kind?: CorpusPrompt['kind'] }) {
  const q = tokens(query);
  const limit = Math.max(1, Math.min(opts?.limit || 3, 6));

  return GENERATED_PROMPT_CORPUS
    .filter((p) => !opts?.kind || p.kind === opts.kind)
    .map((p) => {
      const hay = tokens([p.title, p.category, ...p.tags, p.text].join(' '));
      let score = 0;
      for (const t of q) if (hay.has(t)) score += p.tags.includes(t) ? 4 : 1;
      return { p, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.p.title.localeCompare(b.p.title))
    .slice(0, limit)
    .map((x) => x.p);
}
