# Processos Command Center — integração e proveniência

## Objetivo

A rota `/processos` usa o mock 4K do Command Center como referência visual, mas mantém os dados e regras reais do LexisPredict.

Princípios:

- densidade analítica sem esconder ações;
- DataJud e DJEN continuam sendo fontes oficiais de metadados/publicações públicas;
- carteira, atendimento, responsável e próximo retorno continuam vindo do banco da empresa;
- nenhuma informação de crawler é tratada como oficial sem validação;
- KPIs de carteira inteira devem ser distinguidos de métricas calculadas apenas sobre a amostra carregada;
- isolamento por `empresa_id` e regras de dono/atendimento permanecem no backend existente.

## Repositórios avaliados

### meneguinha/judEX

Útil:
- filtros por tribunal, grau, classe, assunto, município e período;
- campos DataJud como órgão julgador, sistema, quantidade/último movimento;
- exportação CSV compatível com Excel, Power BI e Tableau;
- preocupação com rate limit.

Aplicado:
- filtro analítico multi-eixo;
- tabela densa com metadados judiciais;
- exportação CSV reutilizada como ponte de BI.

Não copiado:
- Streamlit/Python, pois LexisPredict já é Next.js/Vercel;
- lógica que duplicaria o cliente DataJud existente.

### sobeitnow0/extensao-djen-advogado

Útil:
- radar de urgência por palavras críticas;
- leitura focada de publicação;
- prazo/tarefa por comunicação;
- integração de agenda/mensageria como fluxo operacional.

Aplicado:
- Radar DJEN no painel lateral para penhora/bloqueio, liminar/tutela, audiência, intimação/prazo, sentença e trânsito/baixa;
- publicação DJEN acessível no processo selecionado;
- alerta de comunicação ainda não tratada;
- próximo retorno/atendimento como ação principal.

Não copiado:
- armazenamento local da extensão; LexisPredict usa isolamento por empresa e trilha de auditoria;
- gamificação.

### DeHor-Labs/mcp-juridico-brasil

Útil:
- separação clara entre busca, movimentações, resumo, monitoramento e prazo;
- conceito de snapshot/monitoramento;
- cobertura ampla DataJud;
- calendário/prazo como subsistema independente.

Aplicado:
- tabs separadas para Visão, Movimentos, Documentos/Fonte e IA;
- timeline com DataJud + DJEN + atendimento;
- frescor da consulta visível;
- silêncio processual e risco operacional calculados separadamente.

Não copiado:
- servidor MCP Python; o LexisPredict já possui APIs/actions TypeScript e scanner Vercel.

### PietroTamanini/API-consulta-OAB

Útil:
- validação de advogado via CNA/OAB;
- ideia de cache para evitar consultas repetidas.

Aplicado:
- painel de Partes mostra OAB quando presente e oferece consulta oficial CNA.

Não copiado:
- Playwright/reCAPTCHA/MySQL local;
- tentativa de contornar mecanismos anti-bot.

### RafaFreitasDev/processos-pje

Útil:
- busca de processos por OAB como estratégia de descoberta;
- PJe como origem/sistema processual importante.

Aplicado:
- filtro por sistema processual (PJe/Projudi/eProc etc. quando DataJud fornece o campo);
- sistema aparece na aba Documentos/Fonte.

Não copiado:
- automação Chrome/Python dependente de máquina local.

### jespimentel/crawler_sg

Útil:
- detecção de mudança por comparação/snapshot;
- descoberta por parte/OAB no TJSP 2º grau.

Aplicado conceitualmente:
- destaque de novidade após último retorno e mudança no tribunal já existente no LexisPredict;
- busca empresarial continua cobrindo cliente/CNJ/advogado.

Não copiado:
- scraping por tags HTML do eSAJ, reconhecidamente frágil pelo próprio projeto.

### Autom8AI/Open-Higgsfield-AI

Útil para UX:
- studio escuro de alta densidade;
- controles adaptativos;
- histórico/estado visível;
- responsividade;
- separação de controles primários e contexto.

Aplicado:
- estética dark glass/command-center;
- toolbar compacta;
- filtros em duas camadas;
- tabela + inspector lateral;
- tabs contextuais;
- charts sem tirar espaço da operação.

Não copiado:
- providers de imagem/vídeo ou MuAPI; não são necessários à página de processos.

## Layout final

### KPIs
- Processos
- Ativos
- Sem andamento
- Vencidos
- Silêncio +45 dias
- Risco alto / novidades

`Processos`, `Ativos` e `Vencidos` podem usar contagens da carteira inteira vindas do backend. Métricas derivadas da lista carregada exibem essa limitação no próprio card.

### Filtros
- tribunal
- classe
- assunto
- município
- grau
- sistema
- situação
- risco
- período de ajuizamento
- B.A. real
- silêncio >=45d
- busca livre CNJ/cliente/advogado/tribunal/assunto

### Tabela
- CNJ
- cliente
- tribunal
- classe
- assunto
- órgão julgador
- município
- ajuizamento
- última atualização
- último movimento
- dias sem andamento
- situação
- risco
- responsável
- próximo retorno

### Inspector lateral

Tabs:
1. **Visão** — resumo operacional, alertas, próximos passos;
2. **Movimentos** — timeline DataJud/DJEN/atendimento;
3. **Partes** — cliente, parte passiva, advogado, escritório e OAB;
4. **Docs** — dossiê PDF, DJEN, consulta externa, origem e frescor;
5. **IA** — parecer persistido quando existir, ou análise operacional transparente + atalhos para Veredito/Relatório.

## Guardrails

- Não inferir que ausência de movimento no cache significa ausência no tribunal.
- Não chamar cálculo determinístico de "IA" quando nenhum modelo foi executado.
- Não expor CPF completo no inspector.
- Não persistir scraper frágil como fonte primária.
- Não misturar dono (`created_by`) com atendente (`atendido_por`).
- Não remover `empresa_id` das consultas.
- DataJud não fornece documentos/petições completos; a UI não deve sugerir o contrário.
