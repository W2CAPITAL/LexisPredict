# AutoDev Runtime no LexisPredict

Integração arquitetural inspirada no AutoDev/Xiuper (`phodal/auto-dev`, MPL-2.0), reimplementada em TypeScript sem copiar arquivos cobertos.

## Padrões incorporados
- Agent as Tool.
- Subagents especializados.
- Tool catalog/registry.
- Policy gate antes de ferramentas sensíveis.
- Regras do projeto via `AGENTS.md`.
- Error Recovery Agent.
- Codebase Investigator.
- QA/E2E Agent.
- Self Improve Agent.
- Trace operacional de cada ferramenta.

## Mapeamento Lexis
| AutoDev | LexisPredict |
|---|---|
| Coding Agent | Self Improve / branch-patch workflow |
| Document Agent | documentos/dossiê |
| Code Review Agent | QA + codebase investigator |
| ChatDB Agent | Data Agent/KPIs |
| Artifact Agent | dossiê/relatórios |
| Web Agent | Research / fontes oficiais |
| Error Recovery | `agent-runtime/error-recovery.ts` |
| AGENTS.md awareness | root `AGENTS.md` + project context |
| Tool registry | `agent-runtime/catalog.ts` |
| Policy engine | `agent-runtime/policy.ts` |

## Limite de runtime
O Vercel app não deve editar seu próprio código em produção. Coding/self-improve roda no workflow local/CI/GitHub, gera candidato e passa por testes/PR.


## Prompt OS / response control

Além do agent runtime, o app usa um Prompt OS inspirado em práticas de Agenta, DocsGPT, Agno, Giselle, Inkeep, LiteLLM control plane e CleanMyPrompt.

Princípio principal: **a infraestrutura nunca deve virar a resposta**. Rota, skill, fallback, provider, trace e recuperação são metadados internos; só o efeito factual de uma falha relevante pode aparecer ao usuário.

PromptXploit e Basilisk são usados como referências para eval defensivo. CL4R1T4S e system prompt leak collections são referências de arquitetura/ataque, nunca fontes de instruções runtime.
