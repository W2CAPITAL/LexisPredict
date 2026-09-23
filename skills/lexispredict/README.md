# LexisPredict Skill

Pacote de skill do próprio aplicativo LexisPredict.

- `SKILL.md` — orquestrador do produto.
- `modules/SCANNER-DATAJUD-DJEN.md` — scanner.
- `modules/AUTODEV-RUNTIME.md` — arquitetura de agentes.
- `modules/SELF-IMPROVE.md` — melhoria segura.
- `references/FAILURE-MATRIX.md` — fallbacks.
- `references/ROUTES.md` — superfícies/rotas.

Standalone scanner: `../lexispredict-scanner/SKILL.md`.


## Prompt OS

A camada de resposta do app usa roteamento por intenção + contrato de saída para impedir que logs, nomes de skill, fallback e motor vazem para a resposta final. O catálogo externo fica em `src/lib/ai/prompt-os/source-registry.ts`.
