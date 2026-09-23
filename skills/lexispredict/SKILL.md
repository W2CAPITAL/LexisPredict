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

## Respostas
Formato recomendado:
- pedido/objetivo;
- dados observados;
- ferramentas executadas;
- falhas e recovery;
- conclusão;
- risco/limitação;
- próximo passo.

Nunca diga “não existe” apenas porque uma API pública retornou vazio.

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
