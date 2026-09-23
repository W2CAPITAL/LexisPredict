export const LEXIS_PROJECT_RULES = `
LexisPredict é um gabinete operacional jurídico multi-tenant.

INVARIANTES:
- Postgres/Supabase é a fonte da verdade no web.
- empresa_id delimita tenant.
- created_by é dono do processo; atendido_por registra atendimento e não muda o dono.
- DataJud/DJEN são fontes públicas auxiliares, não certidão e não inteiro teor.
- ausência em DataJud/DJEN não prova ausência no tribunal.
- nenhuma automação pode desativar RLS, expor service_role no client ou atravessar tenant.
- protocolo, assinatura digital, pagamento, acordo, desistência e uso de certificado exigem confirmação humana.
- não burlar CAPTCHA/WAF e não usar certificado/conta de terceiro.
- scanner deve preservar resultados parciais quando uma fonte falha.
- alterações de código: patch mínimo, testes, rollback e PR; nunca auto-merge em produção.
`.trim();

export function composeAgentContext(extra: string[] = []) {
  const unique = [LEXIS_PROJECT_RULES, ...extra.map((x) => String(x || '').trim()).filter(Boolean)];
  return unique.filter((x, i) => unique.indexOf(x) === i).join('\n\n---\n\n').slice(0, 32 * 1024);
}
