# Rotas e superfícies

## Scanner
- UI: `src/components/scanner/datajud-scanner-panel.tsx`
- DataJud proxy/search: `POST /api/datajud-search`
- DJEN proxy protegido: `POST /api/djen-proxy`
- Skill consolidada autenticada: `POST /api/scanner-skill`

## Agentes
- UI global: `src/components/agents/agent-dock.tsx`
- CRM agentes: `/crm/agentes`
- API: `/api/crm/agent`
- catálogo: `src/lib/crm-agent/skills.ts`
- runtime: `src/lib/agent-runtime/*`

## Self Improve
- scripts: `scripts/selfimprove/*`
- reports: `reports/selfimprove/*`
