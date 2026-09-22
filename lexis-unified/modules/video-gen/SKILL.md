# Video Gen — Lexis (image → video + product demos)

Modulo para gerar videos curtos de marketing a partir de:
1. Imagens ja prontas (prints do LexisPredict, mockups, carrosseis)
2. Apps / repositorios GitHub / sites (demo de produto, fluxo de tela)
3. Texto + imagens (roteiro humanizado + visuais)

Prioridade: **baixo custo**, **local-first quando der**, e alinhado ao humanizer + GTM.

## Quando usar este modulo

| Trigger do usuario | Acao |
|--------------------|------|
| "faz video", "reel", "story animado", "animacao do grafo" | video-gen |
| "transforma essas imagens em video" | image-to-video |
| "demo do app", "screencast", "tour pelo produto" | screen + edit |
| "video pro LinkedIn / Instagram" | GTM + video-gen |

## Hierarquia de ferramentas (barato → caro)

```
1. ffmpeg (local, zero token)          → slideshow, zoom, pan, legendas, concatenar
2. CapCut / DaVinci / editor local     → cortes, texto na tela, musica
3. Agnes Video Generator (gratuito)    → image-to-video + TTS + legendas + multi-cena
4. Invideo / ferramentas web pagas     → so se Agnes nao resolver
5. Modelos frontier de video           → ultimo recurso (custo alto)
```

Meta: a maioria dos videos de GTM do Lexis deve sair com **ffmpeg + Agnes + humanizer**.

## Fluxos prontos

### 1. Image → Video (prints do Lexis)

Entrada: 3–8 imagens (prints de Painel, Processos, Tarefas, Supervisao, Auditoria 3D, Planos).

Passos:
1. Ordenar as imagens em narrativa (problema → solucao → prova → CTA).
2. Gerar roteiro curto com humanizer (ver `gtm-agent/gtm-copy.md`).
3. Rodar **Agnes** em modo Image-to-Video ou Keyframes (imagem de inicio + fim).
4. Ou usar **ffmpeg** para Ken Burns (zoom/pan suave) + texto na tela + musica leve.
5. Exportar 9:16 (Reels/Stories) e 16:9 (LinkedIn).

### 2. Product demo a partir de app / repo / site

Entrada: URL do Lexis, repositorio GitHub, ou pasta local do app.

Passos:
1. Abrir o app (local ou staging).
2. Capturar fluxo real (Playwright ou gravacao de tela): login → Painel → Processo → Tarefa → Supervisao.
3. Cortar silencios e partes mortas (ffmpeg ou editor).
4. Sobrepor texto humanizado (problema + regra de ouro + CTA).
5. Opcional: passar frames chave pelo Agnes para suavizar ou gerar B-roll.

### 3. Grafo / arquitetura → animacao

Entrada: `graph.html` ou export do graphify.

Passos:
1. Abrir o grafo no browser.
2. Gravar zoom + pan com ferramenta de screen (ou Playwright + ffmpeg).
3. Adicionar textos flutuantes: "4.378 nos", "13.547 conexoes", "225 comunidades".
4. Fechar com a frase GTM: "Nao e CRM de vitrine. E o sistema operacional de quem vive de prazo."

## Ferramentas referenciadas

| Ferramenta | Tipo | Uso principal | Link |
|------------|------|---------------|------|
| **Agnes Video Generator** | Open-source + cloud free | Text/Image-to-video, multi-cena, TTS, legendas | https://github.com/lcy362/agnes-video-generator |
| **Invideo AI Nexus** | Desktop / web | Script-to-video, photo-to-video, edicao | https://github.com/SurgeBowRetreat/invideo-ai-nexus |
| **ffmpeg** | Local CLI | Slideshow, Ken Burns, concat, legendas, resize | skill `ffmpeg` do Grok |
| **higgsfield** | Referencia | Media generativa so quando pedido | ja em fontes.md |
| CapCut / DaVinci Resolve | Local GUI | Polimento final, templates de Reels | — |

> Copilot Arena (lmarena/copilot-arena) e para codigo, nao para video. Nao usar neste modulo.

## Agnes — setup rapido (recomendado)

```bash
git clone https://github.com/lcy362/agnes-video-generator.git
cd agnes-video-generator
./start.sh          # ou Docker: ver README do repo
```

- API key gratuita em platform.agnes-ai.com
- Modos uteis para Lexis: **Image-to-Video**, **Keyframes**, **Creative** (multi-cena + narracao)
- Resolucoes: 9:16 (Instagram/Reels) e 16:9 (LinkedIn)

## ffmpeg — receitas locais (zero token)

### Slideshow com zoom suave (Ken Burns)
```bash
# lista.txt com caminhos das imagens
ffmpeg -f concat -safe 0 -i lista.txt -vf "zoompan=z='min(zoom+0.0015,1.5)':d=125:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)',format=yuv420p" -c:v libx264 -t 15 -y output.mp4
```

### Concatenar clips + legenda
```bash
ffmpeg -i clip1.mp4 -i clip2.mp4 -filter_complex "[0:v][1:v]concat=n=2:v=1:a=0" -y joined.mp4
```

### Crop social
```bash
# 9:16
ffmpeg -i input.mp4 -vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920" -c:a copy reels.mp4
```

## Regras de conteudo (herda GTM + humanizer)

- Frases curtas. Sujeito + verbo + objeto.
- Nao dizer: revolucionario, unico no mercado, IA que substitui advogado.
- CTA padrao: "Comenta LEXIS" ou "Quer ver o fluxo? Chama no link da bio."
- Preferir prova real (print de Supervisao, ranking, Auditoria 3D) a stock footage generico.
- Audio: voz natural ou silencio + musica baixa. Evitar voz robotica demais.

## Checklist de entrega de video

```
[ ] Roteiro humanizado (gtm-copy)
[ ] Imagens/prints proprios (sem watermark de terceiro)
[ ] Formato correto (9:16 + 16:9 se for LinkedIn)
[ ] Duracao: 12–25s (Reels) ou 20–40s (LinkedIn)
[ ] Texto legivel no celular
[ ] CTA claro no final
[ ] Arquivo final < 100 MB (ou comprimido)
```

## Integracao com o resto da skill

- Antes de gerar: **recall** (segundo-cerebro) se ja existe roteiro ou assets.
- Copy: sempre passar pelo **humanizer** / `gtm-agent/gtm-copy.md`.
- Depois de gerar: **capture** no vault (`runs/YYYY-MM-DD-video-<slug>.md`) com caminho do arquivo e o que funcionou.
- Modo `media` do segundo-cerebro agora aponta tambem para este modulo.
