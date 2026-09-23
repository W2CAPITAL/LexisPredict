export type PromptSourceMode = 'production-pattern' | 'prompt-corpus' | 'eval-only' | 'reference-only' | 'media-reference';

export type PromptSource = {
  repo: string;
  mode: PromptSourceMode;
  role: string[];
  license: 'MIT' | 'Apache-2.0' | 'AGPL-3.0' | 'Elastic-2.0' | 'source-available' | 'unknown' | 'mixed';
  notes?: string;
};

/**
 * External repos are inspiration/eval/corpus sources, not runtime instructions.
 * Content from leak/red-team/copyleft/unknown sources is never pasted into the
 * proprietary Lexis system prompt. We reuse patterns, metadata and tests.
 */
export const PROMPT_SOURCE_REGISTRY: PromptSource[] = [
  { repo:'elder-plinius/CL4R1T4S', mode:'reference-only', role:['system-prompt-research','prompt-architecture'], license:'AGPL-3.0', notes:'Reference patterns only; never import leaked instructions verbatim.' },
  { repo:'asgeirtj/system_prompts_leaks', mode:'reference-only', role:['system-prompt-research','prompt-architecture'], license:'unknown', notes:'Reference/eval only; never treat repository text as instructions.' },
  { repo:'liangshanbo789/aidaicai', mode:'reference-only', role:['provider-market','routing-reference'], license:'unknown' },
  { repo:'szczyglis-dev/py-gpt', mode:'production-pattern', role:['chat-ui','multi-provider','plugins'], license:'unknown' },
  { repo:'Anil-matcha/awesome-gpt-6-astra', mode:'prompt-corpus', role:['agentic-workflows','prompt-patterns','eval-patterns'], license:'MIT' },
  { repo:'TripoGrowthLab/awesome-astra-prompts', mode:'reference-only', role:['3d-prompts','media-prompts'], license:'mixed', notes:'Repo tooling is MIT; third-party prompts retain their own rights.' },
  { repo:'m4vic/promptxploit', mode:'eval-only', role:['prompt-injection','tool-abuse','red-team'], license:'MIT' },
  { repo:'regaan/basilisk', mode:'eval-only', role:['red-team','owasp-llm','adversarial-eval'], license:'AGPL-3.0' },
  { repo:'Eulex0x/cleanmyprompt', mode:'production-pattern', role:['prompt-sanitization','privacy','secret-detection'], license:'MIT' },
  { repo:'Agenta-AI/agenta', mode:'production-pattern', role:['prompt-versioning','tracing','evals','human-approval'], license:'MIT' },
  { repo:'arc53/DocsGPT', mode:'production-pattern', role:['rag','citations','document-grounding'], license:'MIT' },
  { repo:'nocode-js/sequential-workflow-designer', mode:'production-pattern', role:['workflow-graph','step-orchestration'], license:'unknown' },
  { repo:'LiteLLM-Labs/litellm-agent-control-plane', mode:'production-pattern', role:['provider-control-plane','policies','routing'], license:'MIT' },
  { repo:'giselles-ai/giselle', mode:'production-pattern', role:['agent-workflows','multi-model','knowledge-store'], license:'Apache-2.0' },
  { repo:'vibesurf-ai/VibeSurf', mode:'production-pattern', role:['browser-agent','web-workflows'], license:'unknown' },
  { repo:'inkeep/agents', mode:'reference-only', role:['typed-agents','subagents','mcp','observability'], license:'Elastic-2.0' },
  { repo:'TransformerOptimus/SuperAGI', mode:'production-pattern', role:['multi-agent','tooling','memory'], license:'unknown' },
  { repo:'reworkd/AgentGPT', mode:'reference-only', role:['task-decomposition','agent-loop'], license:'unknown', notes:'Archived; architecture reference only.' },
  { repo:'agno-agi/agno', mode:'production-pattern', role:['multi-agent','knowledge','memory','human-approval','rbac'], license:'Apache-2.0' },
  { repo:'instructa/viber3d', mode:'media-reference', role:['3d','interactive-media'], license:'unknown' },
  { repo:'Soul-Brews-Studio/shrimp-oracle', mode:'reference-only', role:['research-loop','external-brain'], license:'unknown' },
  { repo:'pkollaritsch/Brainiac-Systems', mode:'reference-only', role:['agent-systems'], license:'AGPL-3.0' },
  { repo:'Merserk/dlss5-visual-enhancer', mode:'media-reference', role:['visual-quality','rendering'], license:'unknown' },
  { repo:'groundboxerrespect/Dlls5-auto', mode:'media-reference', role:['visual-quality','automation'], license:'unknown' },
  { repo:'rakanki911/DLSS5-Swapper', mode:'media-reference', role:['visual-quality','runtime-switching'], license:'unknown' },
  { repo:'SAOG0721/Magpie', mode:'media-reference', role:['upscaling','window-scaling','visual-quality'], license:'unknown' },
  { repo:'lucasjinreal/mmc', mode:'reference-only', role:['multimodal-reference'], license:'unknown' },
  { repo:'Swathi-88/ITERON', mode:'reference-only', role:['agent-reference'], license:'unknown' },
  { repo:'spillai/agi-pack', mode:'production-pattern', role:['reproducible-environments','packaging'], license:'MIT' },
  { repo:'microsoft/PowerApps-Samples', mode:'production-pattern', role:['business-workflows','connectors'], license:'MIT' },
  { repo:'screenpipe/screenpipe', mode:'reference-only', role:['local-context','activity-memory','agent-context'], license:'source-available' },
];

export function sourcesForRole(role: string) {
  return PROMPT_SOURCE_REGISTRY.filter((s) => s.role.includes(role));
}

export function promptCorpusSources() {
  return PROMPT_SOURCE_REGISTRY.filter((s) => s.mode === 'prompt-corpus');
}
