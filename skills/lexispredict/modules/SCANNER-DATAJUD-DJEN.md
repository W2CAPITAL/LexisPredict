# Scanner Processual — DataJud + DJEN

## Implementação canônica
- `src/lib/datajud.ts`
- `src/lib/djen.ts`
- `src/lib/djen-client.ts`
- `src/lib/http-resilient.ts`
- `src/lib/scanner/process-skill.ts`
- `src/app/api/scanner-skill/route.ts`
- `src/components/scanner/datajud-scanner-panel.tsx`

## Regra
DataJud e DJEN são fontes independentes. Falha de uma não apaga a outra.

## Fluxo
`CNJ → tribunal → DataJud || DJEN → recovery → trace → síntese → próximo passo`

### DataJud
- número CNJ com 20 dígitos;
- alias por ramo/tribunal;
- retries para timeout/429/5xx/shard;
- vazio pode significar não indexado e não prova inexistência.

### DJEN
- tenta CNJ numérico e mascarado;
- 0 publicações é sucesso válido;
- 403 = possível geo/WAF;
- 429 = backoff;
- HTML em vez de JSON = bloqueio/indisponibilidade, não “0 publicações”.

## Failover
- Vercel preferencial: `gru1`.
- Resultado parcial é válido e precisa ser mostrado como parcial.
- Em geo-block do DJEN, recomendar consulta direta no navegador do usuário, sem bypass.
- Para prazo/mérito: portal oficial + inteiro teor.

## Resposta obrigatória
1. fontes consultadas;
2. sucesso/falha de cada fonte;
3. eventos/publicações encontrados;
4. hipóteses concorrentes se vazio;
5. próximos passos;
6. caveat de inteiro teor.

## Nunca
- inventar ato/processo;
- tratar erro como lista vazia;
- burlar WAF/CAPTCHA;
- usar credencial/certificado de terceiro;
- fazer prospecção fria baseada em dados processuais.
