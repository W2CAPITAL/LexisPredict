# Self Improve

Pipeline existente:
`collect → diagnose → candidate patch → validate diff → backup → apply → tests → publish report`

Arquivos:
- `scripts/selfimprove/collect.mjs`
- `scripts/selfimprove/cycle.mjs`
- `scripts/selfimprove/apply.mjs`
- `scripts/selfimprove/smoke.mjs`
- `scripts/selfimprove/publish.mjs`

## Regra
Autoaprimoramento significa gerar e validar **candidatos**. Não significa auto-merge em produção.

## Gates
- typecheck;
- vitest;
- build;
- security scan;
- E2E para auth/tenant/billing/process scope;
- rollback;
- human review para merge/deploy.
