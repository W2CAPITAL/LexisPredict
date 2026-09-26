export type CognitiveSourceMode = 'core' | 'adapter' | 'skill' | 'lab' | 'non-core';

export type CognitiveSource = {
  repo: string;
  area: 'agents' | 'memory' | 'research' | 'engineering' | 'media' | 'automation' | 'learning' | 'simulation' | 'platform';
  mode: CognitiveSourceMode;
  purpose: string;
};

export const COGNITIVE_SOURCES: CognitiveSource[] = [
  { repo: 'ItsWambarYT/ai-brain', area: 'memory', mode: 'core', purpose: 'memória persistente e contexto recuperável' },
  { repo: 'tinyhumansai/openhuman', area: 'agents', mode: 'skill', purpose: 'harness eficiente e separação de runtime' },
  { repo: 'SamurAIGPT/llm-wiki-agent', area: 'memory', mode: 'skill', purpose: 'wiki viva e conhecimento interligado' },
  { repo: 'mycelium-hq/ai-brain-starter', area: 'memory', mode: 'skill', purpose: 'accountability, journal e knowledge graph' },
  { repo: 'thedotmack/claude-mem', area: 'memory', mode: 'core', purpose: 'compressão e reinjeção de contexto relevante' },
  { repo: 'obra/superpowers', area: 'engineering', mode: 'skill', purpose: 'planejamento, revisão e disciplina de execução' },
  { repo: 'affaan-m/ECC', area: 'engineering', mode: 'skill', purpose: 'evals, segurança, memória e performance do harness' },
  { repo: 'mattpocock/skills', area: 'engineering', mode: 'skill', purpose: 'TDD, diagnóstico, arquitetura e linguagem compartilhada' },
  { repo: 'pacifio/atlas', area: 'agents', mode: 'skill', purpose: 'rastreabilidade de mudanças de agentes' },
  { repo: 'earendil-works/pi', area: 'agents', mode: 'skill', purpose: 'loop de agente e abstração de providers' },
  { repo: 'alphaXiv/OpenResearch', area: 'research', mode: 'skill', purpose: 'pesquisa reproduzível orientada por evidência' },
  { repo: 'D4Vinci/Scrapling', area: 'research', mode: 'adapter', purpose: 'extração web resiliente em worker opcional' },
  { repo: 'firecrawl/firecrawl', area: 'research', mode: 'adapter', purpose: 'search, scrape e conteúdo web estruturado' },
  { repo: 'ChromeDevTools/chrome-devtools-mcp', area: 'automation', mode: 'adapter', purpose: 'browser observável e verificável' },
  { repo: 'dgtlmoon/changedetection.io', area: 'automation', mode: 'core', purpose: 'snapshot, diff e alertas de mudança' },
  { repo: 'tj/watch', area: 'automation', mode: 'core', purpose: 'watch/debounce de mudanças locais' },
  { repo: 'PaddlePaddle/PaddleOCR', area: 'research', mode: 'adapter', purpose: 'OCR e document understanding self-host' },
  { repo: 'Comfy-Org/ComfyUI', area: 'media', mode: 'adapter', purpose: 'workflows locais de imagem, vídeo, áudio e 3D' },
  { repo: 'upscayl/upscayl', area: 'media', mode: 'adapter', purpose: 'upscale em worker isolado' },
  { repo: 'TachibanaYoshino/AnimeGANv3', area: 'media', mode: 'lab', purpose: 'estilização visual opcional' },
  { repo: 'dtoyoda10/anime-gen', area: 'media', mode: 'lab', purpose: 'geração visual experimental' },
  { repo: 'hugohe3/ppt-master', area: 'media', mode: 'adapter', purpose: 'relatórios e apresentações nativas' },
  { repo: 'debpalash/VoiceStudio', area: 'media', mode: 'adapter', purpose: 'voz/transcrição local em processo separado' },
  { repo: 'nikmcfly/MiroFish-Offline', area: 'simulation', mode: 'lab', purpose: 'referência de simulação multiagente offline' },
  { repo: 'xcontcom/neuroparticles', area: 'simulation', mode: 'lab', purpose: 'sistemas emergentes e evolução' },
  { repo: 'codecrafters-io/build-your-own-x', area: 'learning', mode: 'skill', purpose: 'aprender motores e sistemas implementando componentes' },
  { repo: 'sindresorhus/awesome', area: 'learning', mode: 'skill', purpose: 'catálogo curado para descoberta, nunca auto-instalação' },
  { repo: 'public-apis/public-apis', area: 'platform', mode: 'skill', purpose: 'descoberta de APIs com revisão de segurança/termos' },
  { repo: 'freeCodeCamp/freeCodeCamp', area: 'learning', mode: 'skill', purpose: 'currículo e prática técnica estruturada' },
  { repo: 'nocobase/nocobase', area: 'platform', mode: 'lab', purpose: 'metadados, workflows e no-code configurável' },
  { repo: 'vastsa/PI-Desktop', area: 'platform', mode: 'lab', purpose: 'local-first, plugins e host separado' },
  { repo: 'every-app/open-seo', area: 'platform', mode: 'lab', purpose: 'SEO da landing/comercial, separado do jurídico' },
  { repo: 'darkzOGx/youtube-automation-agent', area: 'media', mode: 'lab', purpose: 'pipeline de conteúdo com aprovação' },
  { repo: 'mindcraft-bots/mindcraft', area: 'agents', mode: 'lab', purpose: 'ciclo ação-observação em ambiente persistente' },
  { repo: 'zernio-dev/zernio-claude-plugin', area: 'automation', mode: 'skill', purpose: 'padrão de plugins/MCP e ações externas explícitas' },
  { repo: 'playbox-dev/trackstudio', area: 'platform', mode: 'lab', purpose: 'pipeline de eventos em tempo real; domínio de visão separado do jurídico' },
  { repo: 'JCodesMore/ai-website-cloner-template', area: 'engineering', mode: 'lab', purpose: 'benchmark visual e reconstrução de interfaces próprias' },
  { repo: 'msamsami/clonellm', area: 'memory', mode: 'lab', purpose: 'personalização experimental com dados fornecidos pelo próprio usuário' },
  { repo: 'muhammad-fiaz/Charisma', area: 'memory', mode: 'lab', purpose: 'persona/memória local; manter fora do core por licença/runtime' },
  { repo: 'ssloy/tinyrenderer', area: 'media', mode: 'lab', purpose: 'fundamentos de pipeline gráfico e renderização' },
  { repo: 'Chaosamongclippers/ENB-for-NVE', area: 'media', mode: 'lab', purpose: 'referência de pós-processamento e presets visuais' },
  { repo: 'soserrieye0/ENBSeries-GTA5-FiveM', area: 'media', mode: 'lab', purpose: 'referência visual; não copiar código/licença incerta' },
  { repo: 'MG1937/ASC', area: 'engineering', mode: 'lab', purpose: 'pesquisa Android autorizada em apps próprios' },
  { repo: 'ruvnet/RuView', area: 'platform', mode: 'non-core', purpose: 'sensoriamento Wi-Fi fora do produto jurídico' },
  { repo: 'fasferraz/eNB', area: 'platform', mode: 'non-core', purpose: 'telecom S1 fora do produto jurídico' },
];

export function listCognitiveSources(area?: CognitiveSource['area']): CognitiveSource[] {
  return area ? COGNITIVE_SOURCES.filter((source) => source.area === area) : [...COGNITIVE_SOURCES];
}
