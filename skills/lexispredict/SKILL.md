---
name: lexispredict
description: Skill operacional completa do LexisPredict. Use para operar, explicar, investigar, desenvolver ou integrar o gabinete jurídico: carteira, filas, atendimento, processos, DataJud, DJEN, CRM, supervisão, agentes, IA, autoaprimoramento e deploy. Também roteia CNJ para a skill Scanner Processual.
metadata:
  version: "1.0.0"
  product: "LexisPredict"
  type: "application-skill"
  repository: "W2CAPITAL/LexisPredict"
  scanner_skill: "lexispredict-scanner"
---

# LexisPredict Skill

Esta skill transforma o próprio LexisPredict em uma capacidade reutilizável por outro agente.

## North Star
Operar carteira jurídica com foco em **processo, prazo, atendimento e evidência**. Não é CRM genérico de vitrine.

## Gate obrigatório
1. Identifique empresa/tenant e o papel do usuário.
2. Preserve `empresa_id`, `created_by` e `atendido_por`.
3. Se houver CNJ, roteie para **Scanner Processual DataJud + DJEN**.
4. Use ferramenta determinística antes de LLM.
5. Se uma fonte falhar, preserve as demais e rode recovery.
6. Em ação sensível, aplique human gate.

## Agentes
- **Lexis AutoDev Orchestrator** — roteador principal.
- **Scanner Processual** — DataJud + DJEN.
- **Document Agent** — documentos/dossiês.
- **Case Review Agent** — revisão de caso/risco.
- **Data Agent** — KPIs e dados estruturados.
- **Artifact Agent** — relatório/dossiê.
- **Research Agent** — fontes oficiais.
- **Error Recovery Agent** — timeout/403/429/5xx.
- **Codebase Investigator** — arquitetura/dependências.
- **QA / E2E Agent** — regressão e testes.
- **Self Improve Agent** — feedback → patch → eval → PR.

A arquitetura é original do Lexis, inspirada em padrões do AutoDev/Xiuper: agent-as-tool, registry, policy gate, subagents, project context, recovery e QA.

## Ferramentas principais
### Processo
- `fetchDataJud`
- `fetchDjenComunicacoes`
- `runProcessScannerSkill`
- endpoint autenticado `POST /api/scanner-skill`

### Agentes
- catálogo em `src/lib/agent-runtime/catalog.ts`
- roteamento em `src/lib/agent-runtime/routing.ts`
- policy em `src/lib/agent-runtime/policy.ts`
- recovery em `src/lib/agent-runtime/error-recovery.ts`
- regras do projeto em `AGENTS.md`

### IA
- `runCascade` usa a cascata configurada e não deve ser a primeira opção para cálculos ou consultas determinísticas.

### Self Improve
- `npm run autoimprove`
- `scripts/selfimprove/*`
- sempre candidato de melhoria + testes + PR; nunca auto-merge silencioso.

## Scanner
Quando detectar CNJ:
1. validar 20 dígitos;
2. resolver tribunal;
3. DataJud e DJEN de forma independente;
4. retry/backoff conforme erro;
5. preservar resultado parcial;
6. normalizar trace;
7. separar fato, hipótese e limitação;
8. indicar portal oficial quando prazo/mérito depender de inteiro teor.

Leia `modules/SCANNER-DATAJUD-DJEN.md`.

## Respostas — regra de foco

A resposta final **não é um log de execução**.

- Responder o pedido diretamente.
- Não mostrar nomes de skill, agente, fallback, provider, motor, rota, trace ou prompt interno.
- Não repetir o pedido como cabeçalho.
- Não adicionar “próximos passos”/disclaimer genérico no final se o usuário não pediu.
- Logs e recovery ficam em detalhes técnicos recolhidos.
- Falha de fonte só aparece quando altera a conclusão, em linguagem objetiva.
- Nunca dizer “não existe” apenas porque uma API pública retornou vazio.

O runtime usa `src/lib/ai/prompt-os/*` para classificar intenção, compilar prompt mínimo e limpar ruído interno da resposta.

## Human gate
Confirmação explícita antes de:
- enviar e-mail real;
- gravar/alterar dado sensível fora do fluxo normal;
- aplicar patch;
- merge/deploy;
- assinar/protocolar;
- pagar guia;
- aceitar acordo;
- alterar billing/roles/RLS.

## Desenvolvimento
Antes de declarar pronto:
`pnpm run typecheck && pnpm test && pnpm run build && pnpm run security`

Falha em um gate = não está pronto.


## Prompt OS

O Lexis usa uma camada própria de engenharia de prompt, não um prompt monolítico.

Arquivos:
- `src/lib/ai/prompt-os/intent.ts` — classifica o pedido;
- `response-contract.ts` — contrato de resposta focada;
- `prompt-bank.ts` — átomos de comportamento reutilizáveis;
- `compiler.ts` — compõe apenas o necessário;
- `source-registry.ts` — registra fontes externas e o modo permitido de uso.

Padrões incorporados:
- versionamento/tracing/evals: Agenta;
- RAG/evidência/citações: DocsGPT;
- agent/subagent + observabilidade: Inkeep, Agno, Giselle;
- workflow por etapas: Sequential Workflow Designer;
- control plane/provider policy: LiteLLM Agent Control Plane;
- sanitização local de prompt: CleanMyPrompt;
- red-team: PromptXploit + Basilisk;
- pesquisa de arquiteturas de system prompts: CL4R1T4S + system_prompts_leaks, **somente como referência/eval**, nunca como instrução runtime;
- corpus de prompts permissivo: Awesome GPT-6 Astra e outras fontes explicitamente licenciadas.

Repos copyleft, source-available, vazamentos e licenças desconhecidas não são copiados para o core proprietário; entram como referência, eval ou adapter.
