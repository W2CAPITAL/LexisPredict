---
name: lexis-council
description: Multi-perspectiva local ou multi-provider (inspirado em karpathy/llm-council). Use when council, segunda opiniao, trade-off, arquitetura.
---

# Lexis Council

## Rodada 1 (cega)

Para cada lente, system prompt curto:

```
Voce e a lente {NOME}. Responda so sob esse angulo.
Pergunta: {Q}
Criterio de pronto: {DONE}
Formato: 5-10 linhas, 1 recomendacao clara, 1 risco.
Nao mencione outras lentes.
```

Lentes padrao Lexis: Ops carteira | Juridico | Custo/token | Offline | GTM.

## Rodada 2 (sintese)

```
Voce sintetiza o council.
Consenso (o que todas/concordam):
Divergencia:
Recomendacao unica (1 paragrafo):
Proximos 3 passos:
Riscos residual:
```

## Local vs multi-provider

- **Local:** mesmo modelo, prompts de lente diferentes (sempre disponivel).
- **Multi-provider:** so se API keys existirem (Gemini, OpenAI, etc.). Nao inventar chave.

Gravar em `decisions/YYYY-MM-DD-council-<slug>.md`.
