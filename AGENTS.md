# LexisPredict — Agent Rules

These rules are the source of truth for coding/agent work in this repository.

## Product
LexisPredict is a multi-tenant legal operations system centered on CNJ process workflows, deadlines, service history, DataJud/DJEN scanning, operational CRM, supervision, reports and an offline sibling.

## Non-negotiable invariants
- `empresa_id` scopes tenant data.
- `created_by` is process ownership.
- `atendido_por` records who served the case and never silently changes ownership.
- Web source of truth is Postgres/Supabase; spreadsheet is export/import or optional fallback.
- DataJud/DJEN are public auxiliary sources, not the court docket itself and not a certificate.
- Empty DataJud/DJEN results do not prove that a process/act does not exist.
- Never expose `service_role` in client code, weaken RLS or cross tenant boundaries.
- Never bypass CAPTCHA/WAF or use third-party certificates/accounts.
- Filing, signature, payment, agreement, waiver, destructive migration, billing and role elevation require an explicit human gate.

## Agent operating loop
1. Recall project rules and relevant skill.
2. Route to the smallest capable agent/tool.
3. Plan evidence, risk and done criteria.
4. Execute deterministic tools before LLMs.
5. Preserve partial success when an external source fails.
6. Run error recovery for timeout/403/429/5xx.
7. Verify with typecheck/tests/build/security when code changes.
8. Capture durable learnings in skill/self-improve artifacts.

## AutoDev-inspired architecture
The implementation uses original Lexis code inspired by architectural patterns in `phodal/auto-dev` (MPL-2.0):
- agents can behave like tools;
- tool registry + policy gate;
- subagent routing;
- project rule awareness;
- error recovery;
- codebase investigation;
- QA/E2E as a first-class agent;
- self-improve as a candidate-patch workflow.

Do not copy MPL-covered source into proprietary Lexis files. Reimplement patterns cleanly or keep external code isolated with its license.

## Required checks
For application changes:
`pnpm run typecheck && pnpm test && pnpm run build && pnpm run security`

For auth/tenant/billing/process-scope changes, also run relevant E2E tests.

## Skills
- `skills/lexispredict/SKILL.md` — full product skill.
- `skills/lexispredict-scanner/SKILL.md` — standalone DataJud + DJEN scanner skill.
- `skills/segundo-cerebro/SKILL.md` — local memory/vault.
