# LexisPredict Commercial

Esta pasta é uma cópia comercial separada do clone original. O objetivo é publicar em Vercel com Supabase como fonte de verdade para autenticação, empresa, assinatura e isolamento multiempresa.

## O que muda nesta edição

- Cadastro não cria mais `empresas`/`usuarios` diretamente pelo browser.
- O antigo token interno de provisionamento foi removido do frontend.
- Nova empresa é criada por trigger no Supabase, sempre em tenant próprio.
- Troca de plano pelo cliente vira **solicitação pendente**; ela não ativa, não prorroga e não desbloqueia a assinatura.
- Ativação/bloqueio continua restrita ao Superadmin e usa `service_role` apenas no servidor.
- Middleware exige sessão para APIs internas, bloqueia tenant vencido/suspenso e aplica plano às páginas.
- RLS comercial isola tabelas que já possuem `empresa_id`.
- Endpoints `/api/commercial/health` e `/api/commercial/me` ajudam a validar o deployment.

## Ordem de implantação

1. Crie/provisione o projeto Supabase.
2. Rode `supabase/migrations/20260921_commercial_saas.sql` no SQL Editor.
3. No Supabase Auth, configure a URL do site e URLs de redirecionamento do domínio Vercel/custom domain.
4. Na Vercel, importe este projeto e configure as variáveis do `.env.example`.
5. Faça o primeiro deploy.
6. Acesse `/api/commercial/health` e confirme `supabase: true` e `serviceRole: true`.
7. Crie uma conta de teste em `/signup`; ela deve nascer bloqueada e aparecer para liberação no Superadmin.

## Regras de segurança desta edição

`NEXT_PUBLIC_SUPABASE_ANON_KEY` pode ir ao browser. `SUPABASE_SERVICE_ROLE_KEY` não pode aparecer em componentes client, HTML, logs públicos ou variáveis `NEXT_PUBLIC_*`.

O `localStorage` continua servindo como cache de interface, mas não é fonte de autoridade para plano/assinatura. A fonte de verdade é o Supabase.

## Próxima camada comercial

A tabela `assinaturas` já guarda `provider`, `provider_customer_id` e `provider_subscription_id`. Isso deixa a base pronta para integrar um gateway depois sem acoplar o produto a um provedor específico.
