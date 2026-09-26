---
name: lexis-unified
description: >
  Skill unificada LexisPredict: segundo cerebro (memoria local), autoaprimoracao,
  GTM/agent de marketing, video-gen (image-to-video, demos, reels), ecossistema de repos,
  self-improve v2, Cognitive Platform v3 e council X10 com terceira perspectiva.
  Use when the user mentions Lexis, carteira, autoaprimorar, GTM, video, reel, animacao,
  vault, segundo cerebro, council, melhorar agente, router de tokens, eval, ou
  unificar skills do pacote LEXIS.
metadata:
  type: workflow
  version: "3.0"
  unifies:
    - segundo-cerebro
    - lexis-autoimprove
    - lexis-gtm-agent
    - lexis-video-gen
    - lexis-self-improve-v2
    - lexis-ecosystem\n    - lexis-cognitive-platform-v3
  inspired-by: https://github.com/karpathy/llm-council
---

# Lexis Unified Skill

Um unico ponto de entrada. Antes havia 5 skills soltas; agora ha **modulos** e um **council**.

```
                    ┌─────────────────────┐
                    │   lexis-unified     │
                    │   (esta skill)      │
                    └─────────┬───────────┘
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
   segundo-cerebro      autoimprove /          GTM + video-gen
   (vault, recall)      self-improve           (copy, reels, demos)
          │                   │                   │
          └─────────────┬─────┴───────────────────┘
                        ▼
              council (multi-perspectiva)
                        │
                        ▼
              ecosystem (mapa de repos)
```

## Ordem obrigatoria (todo pedido)

1. **Recall** — `scripts/recall.py` ou ler vault (segundo-cerebro). Nunca comecar codigo sem isso.
2. **Classificar modo** — tabela abaixo.
3. **Se a decisao for dura** — rodar **Council** (3+ lentes) e sintetizar.
4. **Corrigir na camada mais barata** (autoimprove hierarchy).
5. **Capture** — gravar decisao/fato no vault.

## Modos

| Modo | Quando | Modulo |
|------|--------|--------|
| `recall` | sempre no inicio | segundo-cerebro |
| `ship` | bug, KPI, save, escopo, reload | autoimprove + codigo Lexis |
| `gtm` | post, LinkedIn, lead, copy | gtm-agent |
| `video` / `media` | reel, video, animacao, image-to-video, demo de produto | video-gen |
| `improve` | loop semanal, eval, router | autoimprove + self-improve |
| `council` | arquitetura, trade-off, "o que fazer" | council/ |
| `design` | UI, contraste, dashboard | segundo-cerebro design rules |
| `ecosystem` | qual repo usar, unificar produtos | ecosystem |
| `research` | pesquisa profunda, fontes, jurisprudencia | cognitive research |
| `document` | OCR, PDF, extracao estruturada | cognitive OCR/document |
| `monitor` | vigiar mudancas em fonte/site | cognitive change-watch |
| `browser` | tarefa autorizada no navegador | cognitive browser-agent |
| `voice` | narracao, voz, transcricao | cognitive voice sidecar |

## Hierarquia de correcao (0 token primeiro)

```
1. REGRA / CODIGO Lexis      → 0 token
2. ROUTER intent             → 0 token
3. PROMPT / template SLM     → baixo
4. SLM / few-shot local      → medio
5. LLM forte                 → ultimo recurso
```

Meta de trafego do agente: >=70% zero-token, ~25% SLM, <=5% LLM forte.

## Council (estilo llm-council)

Quando o usuario pedir council, "segunda opiniao", arquitetura dificil, ou o modo `council` ligar:

1. Definir a **pergunta em 1 frase** e o criterio de pronto.
2. Abrir **3 a 5 lentes cegas** (nao se citam entre si na 1a rodada):

| Lente | Foco |
|-------|------|
| Ops carteira | KPI, created_by, fila, reload, Supabase |
| Juridico/produto | BA, DJEN, pecas, LGPD, etica |
| Custo/token | router, SLM, nao gastar frontier em KPI |
| Offline/Sheets | Plano B, local-first, sem depender de cota |
| GTM | mensagem, lead etico, conversao |

3. Cada lente responde sozinha (mesmo modelo ou providers diferentes se houver).
4. **Sintese**: consenso, divergencia, recomendacao unica, riscos.
5. Gravar no vault `decisions/YYYY-MM-DD-council-<slug>.md`.

Nao inventar providers. Se so houver um modelo, rode lentes sequenciais com system prompts distintos (council local).

## Router de intent

Script: `scripts/classify_intent.py` (regex, sem API).

| Intent | Destino |
|--------|---------|
| kpi, prazo, carteira, save | codigo Lexis (zero token) |
| copy, post, linkedin | gtm-agent |
| video, reel, animacao, image-to-video, demo | video-gen |
| eval, autoaprimorar | autoimprove |
| memoria, vault | segundo-cerebro |
| "qual repo", unificar | ecosystem |

`unknown` → SLM, nunca default frontier.

## Loop semanal (improve)

1. Recall falhas/wins da semana.
2. Sinais sem modelo: logs, intents, reclamações.
3. Top 5 dores (impacto × frequencia).
4. **Um** patch na camada mais barata.
5. Eval (`modules/autoimprove/eval.md`).
6. Capture no vault.

## Vault (segundo-cerebro)

Pastas: `inbox/`, `notes/`, `decisions/`, `projects/`, `runs/`, `people/`, `prompts/`.

Scripts:

- `scripts/vault_path.sh`
- `scripts/recall.py --query "..." --limit 8`
- `scripts/capture.py`

Uma nota = uma ideia. Sem segredo, token ou PII sensivel.

## GTM

- Copy etica (sem lista ilegal, sem spam).
- Token-router em `modules/gtm-agent/token-router.md`.
- Classificar intent antes de gastar LLM em texto de marketing.

## Ecossistema Lexis

Mapa consolidado em `modules/ecosystem/` e `modules/autoimprove/repo-map-full.md`.

Principio: **um produto principal (LexisPredict)**; outros repos viram modulo ou plano B, nao Frankenstein.

## Self-improve v2

Politica em `templates/improvement-policy.yml`.  
Licenca e limites em `modules/self-improve/licensing-and-safety.md`.


## Cognitive Platform v3

Nucleo em `src/lib/cognitive/`. Todo agente novo deve declarar capacidade, runtime e custo antes de executar.

Fluxo padrao:

1. **Classificar intent** com regra local.
2. **Recuperar memoria relevante** e deduplicar contexto.
3. **Executar capacidade deterministica** antes de LLM.
4. **Usar modelo/council** somente quando a regra nao resolve.
5. **Quality gate** antes de marcar sucesso.
6. **Observabilidade** sem gravar segredo, token ou PII desnecessaria.

Endpoint de introspeccao: `GET /api/ai/capabilities`.
Planejamento: `POST /api/ai/capabilities` com `{ "text": "..." }`.

### Decision Deep-100

Para decisoes de alto impacto (arquitetura, seguranca, migracao, plano comercial, alteracao de dados):
- gerar ate 100 perguntas de verificacao agrupadas por evidencia, usuario, dados, seguranca, custo, operacao, UX, reversibilidade, testes e longo prazo;
- eliminar perguntas duplicadas;
- responder primeiro as perguntas com evidencia ja disponivel;
- rodar Council X10;
- adicionar uma **terceira perspectiva** que procure premissas que os dois lados nao perceberam;
- so entao sintetizar a decisao e registrar riscos residuais.

Nao rodar Deep-100 para pergunta simples, CRUD trivial ou tarefa deterministica.

### Politica de integracao externa

- TypeScript leve e licenca compativel: pode virar modulo interno apos revisao.
- Python/Rust/C++ pesado: sidecar/worker opcional.
- AGPL/GPL/LGPL ou licenca incerta: nao copiar codigo para o core; usar apenas conceitos, protocolo ou processo separado apos revisao juridica.
- Nenhuma referencia externa pode ignorar `empresa_id`, RLS, papeis, consentimento ou logs do LexisPredict.

Mapa: `docs/architecture/COGNITIVE-PLATFORM-v3.md`.

## O que esta skill NAO faz

- Nao substitui docx/pdf/pptx/xlsx/ffmpeg.
- Nao clona 11 repos no contexto.
- Nao treina LLM do zero no Vercel.
- Nao coloca DB/CSV de 6 GB no GitHub.

## Checklist rapido de turno

```
[ ] Recall feito?
[ ] Modo certo?
[ ] Council se a decisao for dura?
[ ] Correcao na camada mais barata?
[ ] Capture no vault?
```
