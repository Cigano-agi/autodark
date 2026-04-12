# AutoDark UX Premium Spec
**Versao:** 2.0 | **Data:** 2026-04-07 | **Autor:** Claude Opus 4.6  
**Objetivo:** Transformar a experiencia de criacao de videos em algo guiado, tranquilo e premium.

---

## 1. ANALISE AS-IS: JORNADA ATUAL E PONTOS DE FRICCAO

### 1.1 Mapa Completo da Jornada do Usuario

```
LOGIN
  |
  v
DASHBOARD (/dashboard)
  |-- Ve saudacao "Ola, [Nome]"
  |-- Ve grid de canais (ChannelFolder cards)
  |-- Ve fila global (se houver itens em revisao)
  |-- CTA: "Novo Canal" (Dialog 2-step)
  |
  v (clica no canal)
CHANNEL VIEW (/channel/:id)
  |-- Ve ChannelHeaderCard (avatar, stats, 5 botoes de acao)
  |-- Ve 5 tabs: Visao Geral, Ideias, Fila, Concorrentes, Config
  |-- CTA header: "Novo Video" | "Studio Longo" | "Head Agent"
  |
  v (clica "Novo Video")
PRODUCTION WIZARD (/channel/:id/production)
  |-- 8 steps lineares: Config > Sumario > Roteiro > Narracao > Cenas > Imagens > Thumb > Video
  |-- Barra de progresso minima (barrinha de 1.5px + texto "Passo X de 8")
  |-- Operacoes assincronas longas sem estimativa de tempo
  |-- Ao final: salva e volta ao canal
  |
  v (alternativa: clica "Studio Longo")
LONG VIDEO STUDIO (/channel/:id/studio)
  |-- 3 steps: Topico > Cenas+Audio+Imagens > Preview+Render
  |-- Sem barra de progresso global
  |-- Sem breadcrumb de volta
```

### 1.2 Pain Points Detalhados

#### CRITICOS (P0) - Bloqueiam ou confundem o uso

**PP-01: WIZARD SEM GUIA - "O que estou fazendo e por que?"**
- O ProductionWizard tem 8 steps mas NENHUM deles possui:
  - Titulo descritivo explicando o proposito do step
  - Subtitulo com helper text ("Nesta etapa voce vai...")
  - Indicacao do que acontece nos bastidores
- A barra de progresso e uma fileira de barrinhas de 1.5px com icones de 12px - quase invisivel
- O `statusMessage` e generico: "Gerando sumario e capitulos..." sem indicar progresso real (X de Y)
- Nenhuma estimativa de tempo: usuario nao sabe se vai esperar 10 segundos ou 5 minutos
- Arquivo: `src/pages/Production/Index.tsx` (1618 linhas, componente monolitico)

**PP-02: ESTADOS VAZIOS SEM ALMA**
- Dashboard sem canais: icone generico + "Nenhum canal encontrado" + "Crie seu primeiro canal para comecar a automacao"
  - Nao explica O QUE e o AutoDark, nao gera empolgacao, nao guia
- QueueTab sem conteudos: "Nenhum conteudo ainda. Aprove uma ideia ou crie um video para comecar."
  - Nao explica o fluxo, nao tem visual atrativo
- DashboardTab sem metricas: "Sem metricas ainda. Conecte um canal YouTube..."
  - Frio, tecnico, sem empatia

**PP-03: FEEDBACK DE PROGRESSO AUSENTE DURANTE GERACAO**
- Geracao de roteiro: `Loader2 animate-spin` + `statusMessage` generico
- Geracao de audio: mesmo pattern, sem indicar qual capitulo de quantos
- Geracao de imagens: mostra "Gerando imagens X-Y/Total" mas sem barra visual, sem ETA
- Geracao de video/render: `Progress` component existe mas sem mensagens contextuais
- Nenhum estado intermediario mostra o RESULTADO parcial (ex: mostrar o roteiro conforme gera)

**PP-04: DOIS FLUXOS DE CRIACAO SEM DISTINCAO**
- "Novo Video" e "Studio Longo" no header sem explicacao da diferenca
- ProductionWizard: fluxo de 8 steps com AI gerando tudo (roteiro > audio > imagens > video)
- LongVideoStudio: fluxo de 3 steps usando edge function (youtube-long-engine)
- O usuario nao sabe qual escolher, nao entende as consequencias de cada escolha

**PP-05: ERROS SEM RECUPERACAO**
- `toast.error(e.message)` em praticamente todos os catch blocks
- Nenhum erro oferece botao de "Tentar Novamente" inline
- Status `failed`, `tts_failed`, `audio_storage_failed` mostram badge vermelho mas sem acao
- O ContentCard na QueueTab nao tem nenhuma acao visivel para itens que falharam
- Arquivo: `src/pages/Channel/tabs/QueueTab.tsx` linhas 135-140

#### ALTA PRIORIDADE (P1) - Confusao significativa

**PP-06: CHANNEL HEADER SOBRECARREGADO**
- 5 botoes de acao simultaneos: Conectar YouTube / Sincronizar, Novo Video, Studio Longo, Head Agent
- Nenhuma hierarquia visual clara entre acoes primarias e secundarias
- "Head Agent" e um botao misterioso - dispara `generateStrategy()` sem explicar o resultado
- Arquivo: `src/pages/Channel/components/ChannelHeaderCard.tsx`

**PP-07: ONBOARDING DE PRIMEIRO CANAL INEXISTENTE**
- Ao criar canal (Dialog 2-step), vai direto para o canal com tabs vazias
- Nao guia o usuario para Foundation, Blueprint, ou MediaHub
- As tabs aparecem vazias sem indicar "por onde comecar"
- Nao existe conceito de "setup do canal" visivel

**PP-08: LOADING STATES INCONSISTENTES**
- Dashboard: `Loader2` centralizado em tela cheia
- DashboardTab metricas: `RefreshCw animate-spin` num container vazio
- QueueTab: `Loader2` centralizado com `py-12`
- ProductionWizard: boolean `loading` sem skeleton, sem animacao
- Nenhum skeleton loading em TODO o app

**PP-09: MICROCOPY AUSENTE OU TECNICO**
- Botoes sem tooltips: "Head Agent", "Sincronizar", "Studio Longo"
- Labels de tabs sem descricao: "Ideias (5)" mas 5 o que? Pendentes? Aprovadas? Total?
- Status badges usam labels como "Gerando Áudio..." sem indicar que e automatico
- Custo estimado no wizard (`$0.34`) sem explicacao do que compoe o valor

#### BACKLOG (P2)

**PP-10: LONG VIDEO STUDIO DESCONECTADO**
- Sem breadcrumb de volta ao canal
- Sem barra de progresso consistente com o ProductionWizard
- Layout diferente do wizard principal (Cards vs steps)
- Arquivo: `src/pages/LongVideoStudio.tsx`

**PP-11: TAB CONCORRENTES SEM ACAO**
- Mostra dados de concorrentes mas nao oferece CTA para "Gerar ideias baseadas nestes concorrentes"

**PP-12: MEDIAHUB ESCONDIDO**
- Acessivel via header nav ("Hub") mas sem contexto de para que serve
- Configura voz, imagem e modelo de video por canal - critico para producao

---

## 2. DESIGN DA EXPERIENCIA PREMIUM (TO-BE)

### 2.1 Principios de Design

| # | Principio | Regra |
|---|-----------|-------|
| 1 | **Um proximo passo claro** | Cada tela tem UM CTA primario. O usuario nunca adivinha. |
| 2 | **Progresso e informacao** | Qualquer operacao > 2s precisa de feedback visual com contexto. |
| 3 | **Linguagem humana** | Zero jargao tecnico. Status, etapas e labels em linguagem de produto. |
| 4 | **Celebrar conquistas** | Cada step concluido tem micro-celebracao (animacao, som, confetti). |
| 5 | **Erro e oportunidade** | Falhas mostram o que aconteceu + como resolver + botao de acao. |
| 6 | **Consistencia total** | Loading, erro e sucesso usam os mesmos componentes em toda a app. |

### 2.2 Redesign Por Tela

---

#### TELA 1: DASHBOARD (Lista de Canais)

**Hero Message (primeiro acesso com canais):**
```
Ola, [Nome] -- Bom te ver de volta.
Seus canais estao trabalhando por voce. Selecione um para continuar.
```

**Hero Message (sem canais - empty state):**
```
Titulo: "Seu imperio de conteudo comeca aqui."
Subtitulo: "O AutoDark cria videos completos automaticamente -- do roteiro a publicacao. 
            Tudo que voce precisa e um canal e uma ideia."

[Ilustracao: animacao sutil de um video sendo montado peca por peca]

CTA primario: "Criar Meu Primeiro Canal"
Link secundario: "Como funciona?" (abre tour rapido em 3 slides)
```

**Global Queue Section (quando existem itens pendentes):**
```
Titulo: "Acao necessaria"
Subtitulo: "X videos precisam da sua revisao antes de seguir."
[Cards com preview do titulo + canal de origem + botao "Revisar"]
```

**Channel Folder Card - Labels atualizados:**
- Em producao: "X videos sendo criados agora"
- Em revisao: "X videos prontos para revisar"
- Setup pendente: "Configure para comecar a produzir"
- Tudo limpo: "Canal pronto. Crie algo novo!"

---

#### TELA 2: CHANNEL VIEW (Pagina do Canal)

**Setup Banner (exibido quando Foundation nao esta completa):**
```
+-----------------------------------------------------------------+
|  CONFIGURE SEU CANAL PARA DESBLOQUEAR A PRODUCAO                |
|                                                                   |
|  [1. Fundacao ✓]  ---  [2. Blueprint ○]  ---  [3. Hub ○]        |
|                                                                   |
|  "Para o AutoDark criar videos incriveis, ele precisa entender   |
|   seu canal. Leva cerca de 5 minutos."                           |
|                                                                   |
|  [Continuar Configuracao -->]                                    |
+-----------------------------------------------------------------+
```

**Channel Header Card - Simplificado:**
- REMOVER botoes "Novo Video" e "Studio Longo" do header (mover para QueueTab)
- REMOVER "Head Agent" do header (mover para IdeasTab como acao contextual)
- MANTER: Info do canal + Conectar/Sincronizar YouTube + stats rapidos
- ADICIONAR: Badge de status do canal ("Configurado" ou "Setup Pendente")
- ADICIONAR: Tooltip no botao Sincronizar: "Atualiza metricas do YouTube (inscritos, views)"

**Tabs - Microcopy atualizado:**

| Tab | Label | Tooltip (hover) |
|-----|-------|-----------------|
| Visao Geral | `Visao Geral` | "Metricas e performance do canal" |
| Ideias | `Ideias (X)` | "X ideias pendentes de aprovacao" |
| Fila | `Producao (X)` | "X videos em producao ou revisao" |
| Config | `Configuracao` | "Blueprint, prompts e ajustes do canal" |
| Concorrentes | `Concorrentes` | "Analise de canais concorrentes" |

---

#### TELA 3: TAB VISAO GERAL

**Com metricas (canal conectado ao YouTube):**
- Sem mudancas significativas no layout de metricas
- ADICIONAR: Tooltip em cada metrica explicando a fonte ("Dados do YouTube, atualizado X horas atras")
- ADICIONAR: Secao "Ultimos Videos" com mini-cards mostrando titulo + status + data

**Sem metricas (empty state):**
```
Titulo: "Seu painel de comando esta pronto."
Subtitulo: "Conecte seu canal do YouTube para ver metricas reais, 
            ou comece criando seu primeiro video."

[Ilustracao: grafico vazio com linhas pontilhadas subindo]

CTA primario: "Conectar YouTube"
CTA secundario: "Criar Video Sem Metricas"
```

---

#### TELA 4: TAB IDEIAS

**Header da tab:**
```
"Ideias sao o combustivel do seu canal. Gere, avalie e transforme as melhores em videos."
```

**Secoes (progressive disclosure):**

1. **Pendentes de Avaliacao (X)** -- expandido por padrao
   - Card de ideia com: Titulo, Score, Conceito resumido
   - Acoes: [Aprovar] [Rejeitar] [Editar]
   - Tooltip em "Aprovar": "Move para aprovadas. Voce pode criar um video a partir dela."

2. **Aprovadas (X)** -- expandido
   - Card com: Titulo, Score
   - Acoes: [Criar Video Curto] [Criar Video Longo]
   - Helper: "Ideias aprovadas estao prontas para virar video."

3. **Rejeitadas (X)** -- colapsado
   - Lista simples, acao de restaurar

**CTA no topo:**
- Botao "Gerar Novas Ideias" (substitui Head Agent no header)
  - Tooltip: "A IA analisa seu nicho e gera ideias de videos com alto potencial."
  - Loading state: "Analisando tendencias do nicho [Nome do Nicho]... Isso leva cerca de 30 segundos."

**Empty state (sem ideias):**
```
Titulo: "Nenhuma ideia por aqui ainda."
Subtitulo: "Deixe a IA analisar o seu nicho e gerar ideias de videos com alto potencial 
            de retenção e crescimento."
CTA: "Gerar Primeiras Ideias"
```

---

#### TELA 5: TAB PRODUCAO (antiga "Fila")

**Header:**
```
"Acompanhe seus videos em tempo real. Cada etapa e processada automaticamente."
```

**CTAs no topo:**
```
[+ Video Curto]  [+ Video Longo]

Tooltip "Video Curto": "8-20 min. O AutoDark gera roteiro, narracao, imagens e monta o video."
Tooltip "Video Longo": "10+ min. Usa o motor de roteiro longo com controle cena a cena."
```

**Secoes:**

1. **Em Producao (X)** -- expandido com live progress
   ```
   +--------------------------------------------------+
   |  "A Verdade Sobre a Area 51"                     |
   |  ████████░░░░░░░░░░ 45%                          |
   |  ✓ Config  ✓ Roteiro  ● Audio  ○ Imagens  ○ ... |
   |  "Gerando audio -- capitulo 2 de 4"              |
   |  Iniciado ha 8 min -- ~6 min restantes            |
   +--------------------------------------------------+
   ```

2. **Aguardando Revisao (X)** -- expandido
   ```
   +--------------------------------------------------+
   |  "Top 5 Misterios do Oceano"                     |
   |  [Revisar e Publicar]  [Descartar]               |
   |  Pronto ha 2 horas                               |
   +--------------------------------------------------+
   ```

3. **Com Falha (X)** -- expandido com destaque vermelho
   ```
   +--------------------------------------------------+
   |  ! "Os Segredos da CIA"                           |
   |  Falhou na geracao de audio.                      |
   |  "O servico de voz nao respondeu. Isso pode ser  |
   |   temporario."                                    |
   |  [Tentar Novamente] [Usar Voz Alternativa]        |
   +--------------------------------------------------+
   ```

4. **Concluidos (X)** -- colapsado
   - Cards com titulo + data + badge "Publicado"

**Empty state:**
```
Titulo: "Sua linha de producao esta vazia."
Subtitulo: "Crie seu primeiro video e veja a magia acontecer. 
            O AutoDark cuida de tudo -- voce so aprova o resultado."

[Ilustracao: esteira de producao vazia com sparkles]

CTA: "Criar Meu Primeiro Video"
```

---

#### TELA 6: PRODUCTION WIZARD (Redesign Completo)

**Breadcrumb:**
```
← Canal Terror / Criar Video
```

**Step Progress Bar - Premium:**
```
+----------------------------------------------------------------------+
|  ● Config   ● Sumario   ● Roteiro   ● Audio   ○ Cenas   ○ Imagens  |
|  step 3 de 8 -- Roteiro                                              |
+----------------------------------------------------------------------+
```

Cada step nao concluido mostra circulo vazio (○).  
Cada step concluido mostra circulo preenchido com check (●).  
Step ativo mostra circulo pulsando com cor primaria.  
Clique em steps concluidos permite voltar (navegacao nao-linear).

**Step 1: Configuracao**
```
Titulo: "Configuracao Inicial"
Subtitulo: "Defina o idioma, duracao e tema do seu video. 
            Essas escolhas guiam toda a producao."

[Campos: Idioma, Duracao, Ideia/Topico]

Helper no campo Ideia: "Descreva o assunto do video em 1-2 frases. 
                         Quanto mais especifico, melhor o resultado."

Secao de Custo Estimado (expandida):
"Custo estimado: R$ 1,70"
  - Voz (OpenAI): R$ 0,90
  - Imagens (Flux): R$ 0,72
  - Thumbnail: R$ 0,08
Tooltip: "Valores aproximados baseados nos provedores configurados no Hub."

CTA: "Gerar Sumario -->"
Helper abaixo do CTA: "A IA vai analisar o tema e criar um roteiro estruturado em capitulos."
```

**Step 2: Sumario e Capitulos**
```
Titulo: "Estrutura do Video"
Subtitulo: "Revise o titulo, hook e capitulos gerados pela IA. 
            Voce pode editar qualquer campo antes de prosseguir."

[Titulo editavel]
[Hook editavel]
[Lista de capitulos com titulo + resumo editaveis]

Helper: "O hook e a primeira frase que o espectador ouve. 
         Precisa ser irresistivel."

CTA: "Aprovar e Gerar Roteiros -->"
Alternativa: "Regenerar Sumario" (botao ghost)
```

**Step 3: Roteiro por Capitulo**
```
Titulo: "Roteiro Completo"
Subtitulo: "Cada capitulo tem seu roteiro de narracao. 
            Voce pode editar, regenerar ou aprovar individualmente."

[Collapsible por capitulo]
  Capitulo 1: "O Incidente de 1947" -- ✓ Gerado (1.240 palavras)
  Capitulo 2: "A Cobertura do Governo" -- ● Gerando... (45s)
  Capitulo 3: "Revelacoes Recentes" -- ○ Aguardando

[Barra de progresso inline: "Gerando roteiro 2 de 4... ~30 segundos"]

CTA: "Gerar Audio de Todos -->"
Helper: "A narracao sera gerada automaticamente usando a voz configurada no Hub."
Alternativa: "Pular Narracao" (para quem grava propria voz)
```

**Step 4: Narracao (TTS)**
```
Titulo: "Narracao por IA"
Subtitulo: "O audio esta sendo gerado para cada capitulo. 
            Voce pode ouvir e regenerar individualmente."

[Lista de capitulos com player de audio]
  Cap 1: ▶ 3:42  [Regenerar]
  Cap 2: ● Gerando... (estimativa: ~20s)
  Cap 3: ○ Na fila

[Barra geral: "Narrando capitulo 2 de 4... ~40 segundos restantes"]

CTA: "Extrair Cenas -->"
Helper: "A IA vai dividir o roteiro em cenas visuais com prompts para geracao de imagens."
```

**Step 5: Cenas Visuais**
```
Titulo: "Direção de Cenas"
Subtitulo: "Cada cena tem um prompt visual que sera usado para gerar a imagem. 
            Revise e ajuste os prompts se necessario."

[Grid de cenas por capitulo]
  Cena 1: "Deserto de Roswell" -- prompt editavel
  Cena 2: "Militares cercando area" -- prompt editavel

CTA: "Gerar Todas as Imagens -->"
Helper: "Imagens serao geradas em lotes de 3 por vez. 
         Tempo estimado: ~X minutos para Y imagens."
```

**Step 6: Geracao de Imagens**
```
Titulo: "Imagens Geradas"
Subtitulo: "Confira o resultado visual de cada cena. 
            Voce pode regenerar qualquer imagem individualmente."

[Grid visual com thumbnails das imagens geradas]
  - Imagem gerada: preview + [Regenerar]
  - Imagem pendente: placeholder com shimmer
  - Imagem gerando: skeleton com barra de progresso

[Progresso geral: "Gerando imagem 7 de 24... ~3 minutos restantes"]
[Botao "Cancelar Geracao" visivel durante o processo]

CTA: "Gerar Thumbnail -->"
```

**Step 7: Thumbnail**
```
Titulo: "Thumbnail do Video"
Subtitulo: "A thumbnail e 80% do clique. A IA cria um conceito visual 
            otimizado para YouTube."

[Preview da thumbnail gerada]
[Prompt editavel]
[Regenerar] [Aceitar]

Helper: "Dica: Thumbnails com contraste alto, rostos expressivos 
         e texto curto performam melhor."

CTA: "Montar Video -->"
```

**Step 8: Montagem e Finalizacao**
```
Titulo: "Seu Video Esta Quase Pronto!"
Subtitulo: "O AutoDark esta montando tudo: imagens + narracao + 
            legendas + efeito Ken Burns."

[Remotion Preview - inline]
[Barra de progresso: "Renderizando... 67%"]
[Log de renderizacao: "Processando cena 12 de 24..."]

Apos concluido:
  Titulo: "Video Montado com Sucesso! 🎬"
  [Preview do video]
  [Exportar MP4] [Salvar e Enviar para Revisao]

  Helper: "Voce pode revisar o video na aba Producao do canal 
           antes de publicar."
```

**MOMENTO DE CELEBRACAO (pos Step 8):**
```
+----------------------------------------------------------------------+
|                                                                        |
|     ✨ VIDEO CRIADO COM SUCESSO!                                      |
|                                                                        |
|     "A Verdade Sobre a Area 51"                                       |
|     8 capitulos | 24 cenas | 12:34 de duracao                        |
|                                                                        |
|     [Ver na Fila de Producao]    [Criar Outro Video]                  |
|                                                                        |
+----------------------------------------------------------------------+
```
- Confetti animation sutil (CSS-only, 2 segundos)
- Fundo com glow gradiente
- Stats do video gerado

---

#### TELA 7: LONG VIDEO STUDIO

**Breadcrumb:**
```
← Canal Terror / Studio de Video Longo
```

**Step 1: Topico**
```
Titulo: "Qual sera o assunto do video?"
Subtitulo: "O motor de roteiro longo gera cenas detalhadas a partir do seu topico. 
            Adicione contexto para resultados melhores."

[Campo: Topico] -- placeholder: "Ex: Os maiores misterios nao resolvidos da historia"
[Campo: Contexto] -- pre-preenchido com tom de voz e publico do blueprint

Helper: "Contexto ajuda a IA a manter consistencia com o estilo do canal."

CTA: "Gerar Roteiro Longo -->"
Loading: "O motor de roteiro longo esta trabalhando... Isso pode levar ate 1 minuto."
```

**Step 2: Edicao de Cenas**
```
Titulo: "Revise e Produza Cada Cena"
Subtitulo: "Seu roteiro tem X cenas. Gere audio e imagem para cada uma, 
            ou use 'Gerar Tudo' para automatizar."

[Botao destaque: "Gerar Tudo (Audio + Imagens)"]
  Loading: "Gerando cena 5 de 30... Audio + Imagem simultaneamente. ~8 min restantes."

[Lista de cenas]
  Cena 1: "Introducao ao Misterio"
    Narracao: [editavel]
    Prompt Visual: [editavel]
    [Gerar Audio] [Gerar Imagem]
    Status: ✓ Audio ✓ Imagem | ● Gerando Audio | ○ Pendente

CTA: "Montar Video -->" (habilitado quando todas as cenas tem audio + imagem)
```

**Step 3: Preview e Render**
```
Titulo: "Preview e Exportacao"
Subtitulo: "Assista ao video montado e exporte quando estiver satisfeito."

[Remotion Preview]
[Exportar WebM] [Exportar MP4] [Salvar em Cloud]
```

---

### 2.3 Mensagens de Erro Amigaveis (Error Recovery)

| Codigo Tecnico | Mensagem para o Usuario | Acao Sugerida |
|----------------|-------------------------|---------------|
| `tts_failed` | "A geracao de audio falhou. O servidor de voz pode estar temporariamente indisponivel." | [Tentar Novamente] [Usar Voz do Navegador] |
| `audio_storage_failed` | "O audio foi gerado mas nao conseguimos salvar. Isso geralmente e temporario." | [Tentar Novamente] |
| `failed` (generico) | "Algo deu errado durante a producao. Nossos sistemas estao investigando." | [Tentar Novamente] [Reportar Problema] |
| Edge function timeout | "A operacao demorou mais que o esperado. Tente novamente com um topico mais curto." | [Tentar com Topico Menor] |
| Image generation fail | "Nao conseguimos gerar esta imagem. O provedor de imagens pode estar sobrecarregado." | [Tentar Novamente] [Usar Placeholder] |
| Network error | "Parece que voce perdeu a conexao com a internet. Verifique e tente novamente." | [Tentar Novamente] |

---

### 2.4 Mensagens de Status (Progress Messages)

**Substituir mensagens genericas por contextuais:**

| Atual | Premium |
|-------|---------|
| "Gerando sumario e capitulos..." | "Analisando o tema e criando a estrutura do video... ~15 segundos" |
| "Escrevendo cap. 'Titulo'..." | "Escrevendo o roteiro do capitulo 2 de 4: 'Titulo'... ~30 segundos" |
| "Narrando 'Titulo'..." | "Gravando narracao do capitulo 3 de 4... ~20 segundos" |
| "Extraindo cenas do cap. X..." | "Dividindo o capitulo X em cenas visuais... ~10 segundos por capitulo" |
| "Gerando imagens X-Y/Total..." | "Gerando imagem 7 de 24 -- cena 'Militares no Deserto'... ~3 min restantes" |
| "Criando conceito da thumbnail..." | "Criando uma thumbnail que chame atencao... ~15 segundos" |
| "Salvando conteudo..." | "Salvando seu video e enviando para revisao... quase pronto!" |

---

## 3. FLUXO GUIADO DE CRIACAO DE VIDEO (Detailed Design)

### 3.1 Step Indicator Component

```
Comportamento:
- Steps concluidos: fundo primario, icone de check, clicavel (volta ao step)
- Step ativo: borda primaria pulsante, icone do step
- Steps futuros: fundo transparente, borda cinza, nao clicavel
- Entre cada step: linha conectora (preenchida ate o step atual)

Responsivo:
- Desktop: horizontal com labels
- Mobile: horizontal com apenas icones (labels embaixo do ativo)
```

### 3.2 Step Data Model

| Step | Titulo | Subtitulo | Helper | Acao Principal | Tempo Estimado |
|------|--------|-----------|--------|----------------|----------------|
| 1 | Configuracao Inicial | Defina idioma, duracao e tema | Campo Ideia: "Descreva em 1-2 frases" | Gerar Sumario | ~15s |
| 2 | Estrutura do Video | Revise titulo, hook e capitulos | Hook: "Primeira frase que o espectador ouve" | Gerar Roteiros | ~30s/capitulo |
| 3 | Roteiro Completo | Roteiro de narracao por capitulo | "Voce pode editar qualquer trecho" | Gerar Audio | ~20s/capitulo |
| 4 | Narracao por IA | Audio gerado automaticamente | "Ouça e regenere se necessario" | Extrair Cenas | ~10s/capitulo |
| 5 | Direcao de Cenas | Cenas visuais com prompts | "Ajuste prompts para imagens melhores" | Gerar Imagens | ~8s/imagem |
| 6 | Galeria de Imagens | Confira o resultado visual | "Regenere qualquer imagem" | Gerar Thumbnail | ~15s |
| 7 | Thumbnail | 80% do clique acontece aqui | "Contraste alto e texto curto" | Montar Video | ~15s |
| 8 | Montagem Final | Video sendo renderizado | "Imagens + narracao + legendas" | Salvar e Revisar | ~30-120s |

### 3.3 Real-Time Progress During Generation

**Pattern para TODAS as operacoes assincronas:**

```
+--------------------------------------------------+
|  ● [Titulo da operacao]                           |
|                                                    |
|  ████████████░░░░░░░░░░ 62%                       |
|  Gerando roteiro do capitulo 3 de 5               |
|  ~25 segundos restantes                           |
|                                                    |
|  [Cancelar]                                       |
+--------------------------------------------------+
```

**Regras:**
1. Barra de progresso SEMPRE visivel durante operacoes > 2s
2. Mensagem contextual dizendo O QUE esta acontecendo (nao "Gerando...")
3. Estimativa de tempo quando possivel (baseada em benchmarks internos)
4. Botao de cancelar para operacoes longas (imagens em batch)
5. Resultado parcial visivel conforme gera (ex: capitulos aparecendo um a um)

---

## 4. EMPTY STATES E ONBOARDING

### 4.1 Primeiro Acesso (Sem Canais)

**Tela: Dashboard**
```
Hero: "Seu imperio de conteudo comeca aqui."

3 cards explicativos (horizontais):
  1. "Crie um canal" -- "Configure seu canal dark e o AutoDark faz o resto."
  2. "Gere ideias" -- "A IA analisa tendencias e sugere videos virais."
  3. "Publique no piloto automatico" -- "Do roteiro a publicacao, 100% automatico."

CTA: "Criar Meu Primeiro Canal"
```

### 4.2 Primeiro Canal Criado (Sem Videos)

**Tela: Channel View**
```
Setup Banner visivel (ver secao 2.2)

Tab Visao Geral:
  "Seu canal esta configurado e pronto para produzir!
   O proximo passo e gerar ideias de conteudo."
  CTA: "Ir para Ideias"

Tab Producao (empty):
  "Sua linha de producao esta vazia."
  "Aprove uma ideia ou crie um video diretamente."
  CTA: "Ir para Ideias" | "Criar Video"
```

### 4.3 Primeiro Video Sendo Gerado

**Tela: QueueTab - Em Producao**
```
Card especial para primeiro video:
  "Seu primeiro video esta sendo criado! 🎬"
  
  [Barra de progresso com etapas visuais]
  ✓ Configurado  ✓ Roteiro  ● Audio  ○ Imagens  ○ Montagem
  
  "Isso pode levar alguns minutos. Voce pode sair desta pagina --
   o processamento continua em segundo plano."
  
  [Dica: "Enquanto espera, que tal gerar mais ideias?"]
```

### 4.4 Primeiro Video Concluido

**Tela: QueueTab - Aguardando Revisao**
```
Card com destaque especial:
  "Parabens! Seu primeiro video esta pronto para revisao! 🎉"
  
  [Preview thumbnail]
  [Revisar Video] [Publicar Diretamente]
  
  "Revise o conteudo e, se tudo estiver certo, publique!"
```

---

## 5. INVENTARIO DE COMPONENTES

### 5.1 NOVOS Componentes a Criar

| # | Componente | Caminho | Descricao | Prioridade |
|---|-----------|---------|-----------|------------|
| 1 | `StepProgressBar` | `src/components/StepProgressBar.tsx` | Indicador de steps reutilizavel com labels, icones, estados (done/active/pending), clique para voltar. | P0 |
| 2 | `GenerationProgress` | `src/components/GenerationProgress.tsx` | Card de progresso para operacoes assincronas: barra, mensagem contextual, ETA, botao cancelar. | P0 |
| 3 | `EmptyState` | `src/components/EmptyState.tsx` | Componente reutilizavel para empty states: ilustracao, titulo, subtitulo, CTA primario, CTA secundario. | P0 |
| 4 | `ChannelSetupBanner` | `src/components/ChannelSetupBanner.tsx` | Banner de setup do canal com stepper (Foundation, Blueprint, Hub), progress, CTA. | P0 |
| 5 | `ErrorCard` | `src/components/ErrorCard.tsx` | Card de erro com mensagem amigavel, explicacao, botoes de acao (tentar novamente, alternativa). | P1 |
| 6 | `SkeletonCard` | `src/components/SkeletonCard.tsx` | Skeleton loading para cards de conteudo, ideias, metricas. Shimmer animation. | P1 |
| 7 | `CelebrationOverlay` | `src/components/CelebrationOverlay.tsx` | Overlay de celebracao pos-criacao: confetti CSS, stats do video, CTAs. | P1 |
| 8 | `ContentProgressCard` | `src/components/ContentProgressCard.tsx` | Card de conteudo em producao com barra de progresso, etapas visuais, ETA, mensagem contextual. | P1 |
| 9 | `VideoTypeSelector` | `src/components/VideoTypeSelector.tsx` | Modal/card para escolher entre Video Curto e Video Longo com descricao clara das diferencas. | P1 |
| 10 | `TooltipHelper` | `src/components/TooltipHelper.tsx` | Wrapper de tooltip com icone de interrogacao para helper text em campos. | P2 |

### 5.2 Componentes EXISTENTES a Modificar

| # | Componente | Caminho | Mudanca | Prioridade |
|---|-----------|---------|---------|------------|
| 1 | `ProductionWizard` | `src/pages/Production/Index.tsx` | Integrar StepProgressBar, GenerationProgress, adicionar titulos/subtitulos/helpers por step, decompor componente monolitico (1618 linhas). | P0 |
| 2 | `ContentStatusBadge` | `src/components/ContentStatusBadge.tsx` | Adicionar icones por status, cores semanticas (nao apenas variant do Badge), tooltip com descricao do status. | P0 |
| 3 | `QueueTab` | `src/pages/Channel/tabs/QueueTab.tsx` | Substituir empty state, integrar ContentProgressCard para itens em producao, adicionar ErrorCard para itens com falha, mover CTAs de criacao do header. | P0 |
| 4 | `ChannelHeaderCard` | `src/pages/Channel/components/ChannelHeaderCard.tsx` | Remover botoes Novo Video/Studio Longo/Head Agent, adicionar badge de status setup, simplificar layout. | P0 |
| 5 | `Dashboard` | `src/pages/Dashboard.tsx` | Redesign empty state, melhorar hero copy, integrar EmptyState component. | P1 |
| 6 | `DashboardTab` | `src/pages/Channel/tabs/DashboardTab.tsx` | Substituir loading spinner por SkeletonCard, melhorar empty state de metricas. | P1 |
| 7 | `IdeasTab` | `src/pages/Channel/tabs/IdeasTab.tsx` | Separar em secoes (Pendentes/Aprovadas/Rejeitadas), integrar Head Agent como CTA contextual, melhorar empty state. | P1 |
| 8 | `LongVideoStudio` | `src/pages/LongVideoStudio.tsx` | Adicionar breadcrumb, StepProgressBar consistente com ProductionWizard, GenerationProgress no "Gerar Tudo". | P1 |
| 9 | `ChannelView` | `src/pages/Channel/Index.tsx` | Integrar ChannelSetupBanner, atualizar tooltips dos tabs, renomear tab "Fila" para "Producao". | P1 |
| 10 | `DashboardHeader` | `src/components/ui/dashboard-header.tsx` | Ja tem links para Pipeline e Hub (verificado). Nao precisa de mudanca de nav. Pode adicionar indicador de notificacoes. | P2 |
| 11 | `GlobalQueueSection` | `src/components/Dashboard/GlobalQueueSection.tsx` | Melhorar microcopy, adicionar preview do titulo, CTA de revisao por item. | P2 |
| 12 | `CompetitorsTab` | `src/pages/Channel/tabs/CompetitorsTab.tsx` | Adicionar CTA "Gerar ideias baseadas nestes concorrentes". | P2 |

---

## 6. ORDEM DE IMPLEMENTACAO

### Sprint 1: Core Premium Experience (P0)

**Dependencias:** Nenhuma. Pode comecar imediatamente.

| # | Task | Arquivo(s) | Esforco | Depende De |
|---|------|-----------|---------|------------|
| 1 | Criar `StepProgressBar` | `src/components/StepProgressBar.tsx` | 1h | -- |
| 2 | Criar `GenerationProgress` | `src/components/GenerationProgress.tsx` | 1h | -- |
| 3 | Criar `EmptyState` | `src/components/EmptyState.tsx` | 30min | -- |
| 4 | Integrar StepProgressBar no ProductionWizard | `src/pages/Production/Index.tsx` | 1.5h | #1 |
| 5 | Adicionar titulos, subtitulos e helpers em cada step do wizard | `src/pages/Production/Index.tsx` | 1h | #4 |
| 6 | Integrar GenerationProgress em todas as operacoes async do wizard | `src/pages/Production/Index.tsx` | 1.5h | #2, #4 |
| 7 | Melhorar ContentStatusBadge (icones, tooltips) | `src/components/ContentStatusBadge.tsx` | 30min | -- |
| 8 | Redesign QueueTab: empty state, error cards, mover CTAs | `src/pages/Channel/tabs/QueueTab.tsx` | 1.5h | #3, #7 |
| 9 | Simplificar ChannelHeaderCard (remover botoes redundantes) | `src/pages/Channel/components/ChannelHeaderCard.tsx` | 30min | #8 |
| 10 | Criar `ChannelSetupBanner` | `src/components/ChannelSetupBanner.tsx` | 1h | -- |

**Total Sprint 1: ~10h**

### Sprint 2: Polish & Consistency (P1)

| # | Task | Arquivo(s) | Esforco | Depende De |
|---|------|-----------|---------|------------|
| 11 | Criar `SkeletonCard` e integrar em DashboardTab, QueueTab, IdeasTab | `src/components/SkeletonCard.tsx` + 3 arquivos | 2h | -- |
| 12 | Criar `CelebrationOverlay` e integrar no Step 8 do wizard | `src/components/CelebrationOverlay.tsx` + wizard | 1.5h | -- |
| 13 | Redesign Dashboard empty state | `src/pages/Dashboard.tsx` | 1h | #3 |
| 14 | Refatorar IdeasTab com secoes | `src/pages/Channel/tabs/IdeasTab.tsx` | 1.5h | -- |
| 15 | Criar `VideoTypeSelector` (modal de escolha curto vs longo) | `src/components/VideoTypeSelector.tsx` | 1h | -- |
| 16 | Adicionar breadcrumb e StepProgressBar no LongVideoStudio | `src/pages/LongVideoStudio.tsx` | 1h | #1 |
| 17 | Integrar ChannelSetupBanner no ChannelView | `src/pages/Channel/Index.tsx` | 30min | #10 |
| 18 | Criar `ErrorCard` e integrar na QueueTab para itens com falha | `src/components/ErrorCard.tsx` + QueueTab | 1h | -- |
| 19 | Criar `ContentProgressCard` para items "em producao" na QueueTab | `src/components/ContentProgressCard.tsx` + QueueTab | 1.5h | -- |

**Total Sprint 2: ~12h**

### Sprint 3: Backlog & Extras (P2)

| # | Task | Esforco |
|---|------|---------|
| 20 | CompetitorsTab: CTA para gerar ideias | 1h |
| 21 | TooltipHelper component + integrar em campos chave | 1.5h |
| 22 | Indicador de notificacoes no header | 1h |
| 23 | GlobalQueueSection: melhor microcopy e CTAs | 1h |
| 24 | Decompor ProductionWizard em sub-componentes por step | 3h |
| 25 | Head Agent como Sheet/Drawer com resultado visivel | 2h |

**Total Sprint 3: ~9.5h**

---

## 7. GLOSSARIO DE MICROCOPY (PT-BR)

### Botoes e CTAs

| Contexto | Label | Tooltip |
|----------|-------|---------|
| Criar video curto | "Criar Video" | "8-20 min. Roteiro, audio, imagens e montagem automaticos." |
| Criar video longo | "Criar Video Longo" | "10+ min. Motor de roteiro longo com controle cena a cena." |
| Gerar ideias | "Gerar Novas Ideias" | "A IA analisa tendencias do nicho e sugere videos com potencial." |
| Aprovar ideia | "Aprovar" | "Move para aprovadas. Voce podera criar um video a partir dela." |
| Rejeitar ideia | "Descartar" | "Remove da lista de pendentes. Voce pode restaurar depois." |
| Conectar YouTube | "Conectar YouTube" | "Conecta seu canal para importar metricas e publicar diretamente." |
| Sincronizar | "Atualizar Metricas" | "Busca dados atualizados do YouTube (inscritos, views, etc)." |
| Head Agent | "Gerar Estrategia" | "A IA analisa seu canal e sugere estrategia de conteudo." |
| Tentar novamente | "Tentar Novamente" | "Executa a operacao novamente." |
| Cancelar geracao | "Cancelar" | "Interrompe a operacao atual." |

### Status Labels (ContentStatusBadge aprimorado)

| Status DB | Label | Icone | Cor | Tooltip |
|-----------|-------|-------|-----|---------|
| `queued` | "Na Fila" | Clock | Cinza | "Aguardando sua vez na fila de producao." |
| `config_set` | "Configurado" | Settings | Cinza | "Configuracoes definidas. Proximo: geracao de roteiro." |
| `script_generated` | "Roteiro Pronto" | FileText | Azul | "O roteiro foi gerado e esta pronto para narracao." |
| `pending_tts` | "Narrando..." | Mic | Azul (pulse) | "O audio de narracao esta sendo gerado agora." |
| `tts_done` | "Audio Pronto" | Volume2 | Verde | "Narracao concluida. Proximo: geracao de imagens." |
| `visuals_done` | "Imagens Prontas" | Image | Verde | "Todas as imagens foram geradas." |
| `assembled` | "Video Montado" | Film | Verde | "O video foi montado e esta pronto para SEO." |
| `seo_done` | "SEO Otimizado" | Search | Verde | "Titulo, descricao e tags otimizados para YouTube." |
| `awaiting_review` | "Pronto para Revisar" | Eye | Amarelo | "O video esta completo e aguarda sua aprovacao." |
| `published` | "Publicado" | CheckCircle | Verde brilhante | "Video publicado no YouTube." |
| `failed` | "Falhou" | AlertTriangle | Vermelho | "Algo deu errado. Clique para tentar novamente." |
| `tts_failed` | "Audio Falhou" | MicOff | Vermelho | "Falha na geracao de audio. Tente novamente ou use voz alternativa." |
| `audio_storage_failed` | "Erro de Armazenamento" | HardDrive | Vermelho | "O audio foi gerado mas nao foi possivel salvar. Geralmente temporario." |
| `generating` | "Produzindo..." | Loader | Azul (spin) | "Seu video esta sendo produzido automaticamente." |

---

## 8. ANIMACOES E TRANSICOES

| Elemento | Animacao | Duracao | Trigger |
|----------|----------|---------|---------|
| Step transition no wizard | Slide-in da direita + fade | 300ms | Avanco de step |
| Step completion | Icone de check com scale-up bounce | 400ms | Step concluido |
| Progress bar fill | Width transition com ease-out | 500ms | Progresso atualizado |
| Empty state entrance | Fade-in + slide-up | 400ms | Primeiro render |
| Error card entrance | Shake horizontal (sutil) + fade-in | 300ms | Erro detectado |
| Celebration confetti | Particulas CSS caindo | 2000ms | Video finalizado |
| Celebration glow | Background gradient pulse | 3000ms loop | Video finalizado |
| Skeleton shimmer | Gradiente linear movendo da esquerda para direita | 1500ms loop | Loading |
| Card hover | Scale 1.01 + shadow elevate | 200ms | Mouse hover |
| Badge status pulse | Opacity pulse (0.7-1.0) | 2000ms loop | Status "gerando" |
| Toast entrada | Slide-in do topo + fade | 300ms | Notificacao |

**Regras de animacao:**
- Todas as animacoes usam `prefers-reduced-motion` media query
- Nenhuma animacao bloqueia interacao
- Duracoes max de 500ms para transicoes de UI, 3000ms para celebracoes
- Usar CSS animations quando possivel (evitar JS animation loops)

---

## 9. METRICAS DE SUCESSO

| Metrica | Baseline Atual | Meta Premium |
|---------|---------------|--------------|
| Tempo do primeiro video criado | Desconhecido (sem tracking) | < 15 minutos |
| % de usuarios que completam o wizard | Desconhecido | > 80% |
| % de usuarios que encontram Foundation | ~0% (sem link visivel) | > 90% |
| Erros sem acao de recuperacao | 100% dos erros | 0% |
| Telas com empty state generico | 4+ telas | 0 telas |
| Componentes de loading inconsistentes | 5+ patterns | 1 pattern (SkeletonCard) |

---

**FIM DO DOCUMENTO**

Este spec deve ser implementado na ordem definida na Secao 6.  
Sprint 1 (P0) resolve os maiores pontos de friccao e transforma a experiencia core.  
Sprint 2 (P1) adiciona polish e consistencia.  
Sprint 3 (P2) completa a visao premium.
