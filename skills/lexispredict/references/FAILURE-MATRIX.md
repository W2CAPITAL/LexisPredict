# Failure Matrix

| Sintoma | Classificação | Ação |
|---|---|---|
| DataJud timeout | retryable | retry com backoff; preservar DJEN |
| DataJud 429 | rate-limit | esperar; não martelar |
| DataJud 5xx/shard | upstream | retry; marcar parcial |
| DJEN 403 | geo-block | gru1; fallback browser direto |
| DJEN 429 | rate-limit | backoff |
| DJEN HTML | WAF/upstream | não interpretar como 0 |
| DJEN 0 items com JSON válido | sucesso vazio | mostrar 0 publicações |
| IA sem cota | AI unavailable | usar saída determinística |
| Supabase sem sessão | auth | parar; pedir login |
| RLS/tenant mismatch | security | bloquear e investigar |
| build/test falha | regression | não mergear |
