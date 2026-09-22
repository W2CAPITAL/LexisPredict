---
name: lexis-unified
description: >
  Skill unificada LexisPredict: segundo cerebro (memoria local), autoaprimoracao,
  GTM/agent de marketing, video-gen (image-to-video, demos, reels), ecossistema de repos,
  self-improve v2 e council multi-perspectiva (estilo llm-council / Karpathy).
  Use when the user mentions Lexis, carteira, autoaprimorar, GTM, video, reel, animacao,
  vault, segundo cerebro, council, melhorar agente, router de tokens, eval, ou
  unificar skills do pacote LEXIS.
metadata:
  type: workflow
  version: "2.1"
  unifies:
    - segundo-cerebro
    - lexis-autoimprove
    - lexis-gtm-agent
    - lexis-video-gen
    - lexis-self-improve-v2
    - lexis-ecosystem
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
