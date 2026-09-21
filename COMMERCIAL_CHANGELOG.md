# LexisPredict Commercial — Delta 2026-09-21

## Preservado
- Clone original não foi alterado.
- UI, rotas e módulos jurídicos permanecem como base.
- Supabase SSR, papéis e painel Superadmin existentes foram reaproveitados.

## Comercial
- Novo bootstrap/migration SaaS em `supabase/migrations/20260921_commercial_saas.sql`.
- Tenant por empresa e RLS nas tabelas já compatíveis com `empresa_id`.
- Cadastro comercial por trigger do Supabase Auth.
- Remoção do token interno exposto no cadastro.
- Remoção do fallback de autenticação por planilha na edição comercial.
- Planos desconhecidos falham para `Essencial`.
- Troca de plano vira solicitação pendente; cliente não autoativa assinatura.
- Ativação/bloqueio sincroniza empresa + ledger de `assinaturas`.
- Middleware protege APIs, tenant, vencimento e pacotes de plano.
- Publicidade desativada na edição comercial e CSP reduzida.
- Endpoints de diagnóstico comercial adicionados.
- `.env.example` e `README-COMMERCIAL.md` adicionados.

## Validação executada
- Verificação de sintaxe TypeScript dos arquivos alterados: sem erros de parser.
- A instalação completa de dependências não concluiu dentro do limite do ambiente, portanto o `next build` completo deve ser executado no CI/Vercel.
