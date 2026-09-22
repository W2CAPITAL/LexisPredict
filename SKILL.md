---
name: lexis-self-improve
description: Orquestra melhoria contínua do LexisPredict usando observabilidade, testes, agentes, UI review, RAG/SLM e pesquisa de padrões em repositórios externos. Use quando o usuário pedir para autoaprimorar, auditar, otimizar, corrigir regressões, melhorar UX/performance/IA/CRM, ou transformar achados em PRs seguros. Nunca faz deploy de produção ou alteração destrutiva sem gate humano.
metadata:
  type: workflow
  version: "2.0"
  product: LexisPredict
  stack: Next.js 15 + Supabase + Vercel
---

# LexisPredict Self-Improve

Objetivo: fazer o LexisPredict melhorar continuamente sem virar um agente que altera produção às cegas.

## Princípio central

O loop automático pode **observar → diagnosticar → propor → implementar em branch → testar → comparar → abrir PR draft**.

O loop **não pode** aprovar a própria mudança, publicar em produção, alterar billing/permissões, trocar RLS, rodar migração destrutiva, ou treinar modelo com dados de cliente sem revisão humana explícita.

## Fonte da verdade

- Banco web: Supabase/Postgres.
- Auth e tenant: Supabase Auth + `empresa_id` + RLS.
- Deploy: Vercel.
- CI: typecheck + testes + E2E.
- Carteira: `created_by` define dono; `atendido_por` define crédito de atendimento.
- DJEN/DataJud: fontes oficiais; não usar browser stealth para contornar WAF/CAPTCHA/geo.

## Loop de melhoria

1. **Observar**
   - CI/Vercel, erros de build, latência, falhas de Supabase, métricas de scan, feedback de UX e logs de agentes.
   - Instrumentar IA com OpenInference/AgentOps, sempre mascarando PII.

2. **Classificar**
   - P0: auth, tenant, RLS, save, carteira, prazo, atendimento, build.
   - P1: performance, busca, export, equipe, scanner oficial, UX diária.
   - P2: IA, agentes, GTM do produto, temas visuais, experimentos.

3. **Propor mudança mínima**
   - Um problema por lote quando possível.
   - Registrar hipótese, arquivos afetados, risco e rollback.

4. **Implementar em branch/PR**
   - Nunca auto-merge.
   - Mudança de DB = migration versionada + verificação de RLS.
   - Mudança de UI = contraste AA/AAA, mobile e dark mode.

5. **Testar**
   - `pnpm run typecheck`
   - `pnpm test`
   - Playwright: login, signup, `/cases`, `/tarefas`, `/processos`, plano, cargos e export.
   - Testes multi-tenant com empresa A/B.
   - Regressão: edição != atendimento; Supervisor vê empresa; Administrador vê os próprios.

6. **Comparar antes/depois**
   - Tempo de auth/hidratação.
   - Tempo até primeira lista renderizada.
   - Queries Supabase por navegação.
   - Falhas de scan por fonte.
   - Erros de build/test.
   - CLS/contraste/legibilidade.

7. **Abrir PR draft**
   - Resumo, evidência, métricas, riscos, rollback e screenshots quando houver UI.

8. **Gate humano**
   - Só depois da aprovação: merge/deploy/migration em produção.

## Modos

### `mode=repair`
Corrige build, runtime, Supabase, RLS, auth e regressões.

### `mode=performance`
Deduplica consultas, pagina carteira, elimina reauth desnecessária, adiciona índices e mede latência.

### `mode=ux`
Usa Taste Skill/Open Design/Builders como referência; melhora legibilidade, densidade, mobile e dark mode sem trocar o backend.

### `mode=agent`
Cria agentes pequenos e especializados com OpenAI Agents/Youtu/Prime como referência; tools limitadas e auditadas.

### `mode=observability`
OpenInference/AgentOps para tracing de IA/scan, custo/latência/erros, sem enviar conteúdo sensível bruto.

### `mode=slm`
Parakeet/SLM Forge/Needle para experimentos locais de classificação/extraction com dados sintéticos ou anonimizados. Nunca treinar automaticamente em dados de cliente.

### `mode=gtm`
ProspectOS/GTM Skills/Beton apenas para vender o **LexisPredict SaaS a empresas** e trabalhar inbound/CRM próprio. Nunca usar CNJ/DJEN para prospecção de partes processuais.

## Gate de segurança obrigatório

Antes de reutilizar código externo:

1. Ler licença do repo.
2. Preferir inspiração/integração via API em vez de copiar código.
3. MIT/Apache: ainda preservar avisos quando exigido.
4. GPL/AGPL: não incorporar código ao produto comercial sem análise específica de licença.
5. Repo sem licença clara: referência somente.

## Browser automation

- Playwright: permitido para E2E do LexisPredict e sistemas próprios/autorizados.
- `undetected-chromedriver` e `CloakBrowser`: **não integrar** para burlar CAPTCHA, WAF, rate limit ou proteção de tribunal.
- DJEN/DataJud: usar APIs oficiais/browser normal do usuário e retries honestos.

## Resultado esperado

A skill deve produzir uma destas saídas:

- diagnóstico + prioridade;
- patch/branch + testes;
- PR draft com métricas;
- plano de experimento seguro;
- relatório de regressão;
- proposta de UX;
- proposta de agente/SLM com dados anonimizados.

Detalhes por repositório em `references/repos.md` e arquitetura do loop em `references/architecture.md`.
