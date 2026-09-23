/**
 * Prompt corpus sync.
 *
 * Goal: make large prompt collections searchable without dumping thousands of
 * prompts into every model call. Only explicitly permissive/user-owned content
 * is copied into the generated runtime corpus. Leak/copy-left/source-available
 * repos are indexed as metadata/reference only.
 *
 * Optional:
 *   GITHUB_TOKEN=... pnpm run prompts:sync
 *   LEXIS_PROMPT_REPOS=owner/private-prompts,owner/another-repo pnpm run prompts:sync
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'src/lib/ai/prompt-os/corpus.generated.ts');
const REPORT_DIR = path.join(ROOT, 'reports/prompts');
const TOKEN = process.env.GITHUB_TOKEN || process.env.PROMPT_GITHUB_TOKEN || '';

const SOURCES = [
  { repo: 'Anil-matcha/awesome-gpt-6-astra', branch: 'main', mode: 'copy', license: 'MIT' },
  { repo: 'TripoGrowthLab/awesome-astra-prompts', branch: 'main', mode: 'metadata', license: 'mixed' },
  { repo: 'elder-plinius/CL4R1T4S', branch: 'main', mode: 'metadata', license: 'AGPL-3.0' },
  { repo: 'asgeirtj/system_prompts_leaks', branch: 'main', mode: 'metadata', license: 'unknown' },
  { repo: 'm4vic/promptxploit', branch: 'main', mode: 'metadata', license: 'MIT', evalOnly: true },
  { repo: 'regaan/basilisk', branch: 'main', mode: 'metadata', license: 'AGPL-3.0', evalOnly: true },
];

for (const repo of String(process.env.LEXIS_PROMPT_REPOS || '').split(',').map((x) => x.trim()).filter(Boolean)) {
  SOURCES.push({ repo, branch: 'main', mode: 'copy', license: 'user-owned' });
}

const headers = {
  Accept: 'application/vnd.github+json',
  'User-Agent': 'LexisPredict-PromptCorpus/1.0',
  ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
};

async function getJson(url) {
  const r = await fetch(url, { headers });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}: ${url}`);
  return r.json();
}

async function getText(url) {
  const r = await fetch(url, { headers: TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {} });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}: ${url}`);
  return r.text();
}

function slug(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70);
}

function tagsFor(text) {
  const words = String(text || '').toLowerCase().normalize('NFD').replace(/\p{M}/gu, '')
    .split(/[^a-z0-9]+/).filter((x) => x.length >= 4);
  const stop = new Set(['para','with','from','this','that','your','você','voce','uma','como','mais','will','should','prompt','system']);
  const counts = new Map();
  for (const w of words) if (!stop.has(w)) counts.set(w, (counts.get(w) || 0) + 1);
  return [...counts.entries()].sort((a,b)=>b[1]-a[1]).slice(0,8).map(([w])=>w);
}

function splitMarkdown(raw, source, file) {
  const text = String(raw || '').replace(/\r/g, '');
  const lines = text.split('\n');
  const chunks = [];
  let title = path.basename(file);
  let buf = [];
  const flush = () => {
    const body = buf.join('\n').trim();
    buf = [];
    if (body.length < 80 || body.length > 12000) return;
    if (!/(prompt|instruction|workflow|agent|task|you are|system|use case|role|objective|goal)/i.test(body)) return;
    const id = crypto.createHash('sha1').update(source + file + title + body).digest('hex').slice(0,16);
    chunks.push({
      id: `ext-${id}`,
      title: title.slice(0,140),
      category: /code|coding|developer/i.test(title + body) ? 'código' :
        /research|search/i.test(title + body) ? 'pesquisa' :
        /document|pdf/i.test(title + body) ? 'documento' :
        /image|3d|video|visual/i.test(title + body) ? 'media' : 'geral',
      tags: tagsFor(title + ' ' + body),
      text: body.slice(0,5000),
      source: `${source}/${file}`,
      kind: 'system-pattern',
    });
  };
  for (const line of lines) {
    const h = line.match(/^#{1,4}\s+(.+)/);
    if (h) {
      flush();
      title = h[1].trim();
      continue;
    }
    buf.push(line);
    if (buf.join('\n').length > 6000) flush();
  }
  flush();
  return chunks;
}

const seed = [
  ['lexis-process-summary','Resumo processual focado','processo',['cnj','processo','datajud','djen','resumo'],'Responda apenas com fase atual, fatos públicos encontrados, risco imediato se houver e a resposta direta à pergunta. Não acrescente metadados de execução.'],
  ['lexis-djen-explain','Explicar publicação DJEN','processo',['djen','publicação','prazo','cliente'],'Explique a publicação em linguagem clara. Identifique somente prazos, custas ou providências que estejam expressos ou claramente sustentados pelo texto.'],
  ['lexis-data-answer','Consulta de carteira objetiva','dados',['kpi','ranking','carteira','vencidos','dados'],'Responda com os dados solicitados primeiro. Não troque a consulta por um resumo genérico da carteira.'],
  ['lexis-document-grounding','Documento com evidência','documento',['pdf','documento','contrato','decisão','evidência'],'Baseie a resposta no documento fornecido. Diferencie trecho observado, inferência e ponto não suportado pelo material.'],
  ['lexis-draft-direct','Redação direta','redação',['whatsapp','email','mensagem','minuta','texto'],'Entregue o texto solicitado diretamente, sem explicar o processo de geração, sem assinatura extra e sem seção de fallback.'],
  ['lexis-code-proof','Código com prova de execução','código',['build','teste','github','vercel','typescript','bug'],'Diferencie claramente o que foi alterado do que foi realmente testado. Não afirme build, teste, deploy ou correção sem evidência.'],
].map(([id,title,category,tags,text])=>({id,title,category,tags,text,source:'LexisPredict',kind:'system-pattern'}));

const corpus = [...seed];
const report = [];

for (const src of SOURCES) {
  try {
    const tree = await getJson(`https://api.github.com/repos/${src.repo}/git/trees/${src.branch}?recursive=1`);
    const files = (tree.tree || []).filter((x) => x.type === 'blob');
    const eligible = files.filter((x) =>
      /\.(md|mdx|txt)$/i.test(x.path) &&
      !/(license|changelog|contributing|node_modules|vendor|dist|assets\/)/i.test(x.path) &&
      /(prompt|agent|skill|instruction|workflow|use-case|use_case|readme|docs\/)/i.test(x.path)
    ).slice(0, 240);

    report.push({
      repo: src.repo,
      mode: src.mode,
      license: src.license,
      evalOnly: !!src.evalOnly,
      files: files.length,
      eligible: eligible.map((x) => x.path),
    });

    if (src.mode !== 'copy' || src.evalOnly) continue;

    for (const item of eligible) {
      if ((item.size || 0) > 350_000) continue;
      try {
        const raw = await getText(`https://raw.githubusercontent.com/${src.repo}/${src.branch}/${item.path}`);
        corpus.push(...splitMarkdown(raw, src.repo, item.path));
        if (corpus.length >= 4000) break;
      } catch (e) {
        process.stderr.write(`skip ${src.repo}/${item.path}: ${e.message}\n`);
      }
    }
  } catch (e) {
    report.push({ repo: src.repo, mode: src.mode, license: src.license, error: e.message });
  }
}

const seen = new Set();
const dedup = corpus.filter((p) => {
  const key = crypto.createHash('sha1').update(String(p.text).replace(/\s+/g,' ').trim().toLowerCase()).digest('hex');
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
});

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.mkdirSync(REPORT_DIR, { recursive: true });
const header = `/** GENERATED by scripts/prompts/sync-corpus.mjs — do not hand edit. */\n`;
const type = `export type CorpusPrompt = { id:string; title:string; category:string; tags:string[]; text:string; source:string; kind:'system-pattern'|'user-template'|'eval' };\n`;
fs.writeFileSync(OUT, header + type + `export const GENERATED_PROMPT_CORPUS: CorpusPrompt[] = ${JSON.stringify(dedup, null, 2)} as CorpusPrompt[];\n`);
fs.writeFileSync(path.join(REPORT_DIR, 'source-index.json'), JSON.stringify({ generatedAt:new Date().toISOString(), count:dedup.length, sources:report }, null, 2));

console.log(`Prompt corpus: ${dedup.length} padrões → ${path.relative(ROOT, OUT)}`);
console.log(`Source registry → ${path.relative(ROOT, path.join(REPORT_DIR,'source-index.json'))}`);
