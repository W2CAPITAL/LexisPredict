---
name: lexispredict-scanner
description: Skill standalone do Scanner Processual LexisPredict. Consulta DataJud + DJEN por CNJ, preserva resultado parcial, classifica timeout/403/429, gera trace e próximos passos. Use quando houver CNJ, DataJud, DJEN, tribunal, publicação ou scanner.
metadata:
  version: "1.0.0"
  repository: "W2CAPITAL/LexisPredict"
  api: "POST /api/scanner-skill"
---

# LexisPredict Scanner Skill

## Input
- CNJ com 20 dígitos, mascarado ou não.

## Engine
1. validar CNJ;
2. resolver alias do tribunal;
3. consultar DataJud e DJEN independentemente;
4. retry/backoff;
5. preservar sucesso parcial;
6. normalizar trace;
7. listar eventos/publicações;
8. explicar hipóteses concorrentes;
9. indicar próximo passo oficial.

## Contract
Uma fonte vazia não apaga outra.
Erro não vira “0 resultados”.
Ausência em API não prova inexistência.
Prazo/mérito exige inteiro teor/publicação oficial.

## App implementation
`src/lib/scanner/process-skill.ts`

## Authenticated endpoint
`POST /api/scanner-skill`

Payload:
```json
{"protocolo":"4000338-89.2026.8.26.0002","includeFormatted":true}
```

## Failure recovery
- 429 → backoff.
- timeout/5xx → retry controlado.
- DJEN 403 → preferir `gru1`; fallback browser direto, sem bypass.
- ambas falham → responder falha verificada, nunca inventar sucesso.
