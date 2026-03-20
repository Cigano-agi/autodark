# OPUS MISSÃO 1 — Wizard de Novo Vídeo (8 Steps)

> Leia MISSIONS.md e M0-layout-routes.md antes deste.
> Este wizard substitui/aprimora o `src/pages/Production/Index.tsx` atual.
> Rota final: `/channel/:id/production`

---

## O Que Já Existe (reutilizar)

**Manter sem alterar:**
- `callClaude()` e `callOpenRouter()` — helpers de LLM (linhas 34-80 de Production/Index.tsx)
- `callKieImage()` — geração de imagem Kie.ai (linhas 109-168)
- `callImageGeneration()` — fallback chain de imagem (linhas 170-196)
- `generatePlaceholderImage()` — canvas placeholder
- `stripMarkdown()` e `renderMarkdown()` — helpers de texto
- `useVideoAssembler` hook — Canvas + MediaRecorder (manter por ora, Remotion vem na M3)
- Storage key: `autodark_prod_wizard_v3_${channelId}` — persistence já funciona
- `KieGenerator` component — já existe em `components/ui/kie-generator.tsx`

**O que MUDAR:**
- Adicionar Steps 1a e 1b (Configuração: idioma + duração + estimativa de custo)
- Substituir geração de roteiro flat por **Sumário → Capítulos → Roteiro por capítulo**
- Seletor de voz com preço (ler do MediaHub localStorage: `autodark_hub_defaults`)
- Seletor de modelo de imagem por tipo (slides vs thumb)
- Conectar duração ao roteiro gerador

---

## Interfaces Novas

```typescript
// Adicionar ao topo de Production/Index.tsx (ou criar types/production.ts)

type VideoLanguage = "en" | "es" | "pt-BR";
type VideoDuration = 8 | 15 | 20 | "custom";

interface VideoChapter {
  id: string;          // uuid v4
  title: string;
  summary: string;     // 2 linhas do que será abordado
  script: string;      // roteiro completo do capítulo (gerado depois)
  scenes: Scene[];     // cenas extraídas do roteiro do capítulo
  audioUrl?: string;   // TTS do capítulo gerado
  audioDurationSec?: number;
}

// Estender Scene existente
interface Scene {
  title: string;
  narration: string;
  visual_prompt: string;
  imageUrl?: string;
  chapterId?: string;  // referência ao capítulo pai
  durationSec?: number;
}

// Ler do MediaHub localStorage
interface HubDefaults {
  voice: string;       // provider id: "browser" | "openai" | "fish" | "elevenlabs"
  voiceId: string;     // voz específica: "alloy" | "onyx" | etc
  slidesImage: string; // modelo para slides
  thumbImage: string;  // modelo para thumbnail
  videoModel: string;  // "none" | "vo3" | "sora"
}

function loadHubDefaults(channelId: string): HubDefaults {
  try {
    const raw = localStorage.getItem("autodark_hub_defaults");
    const all = raw ? JSON.parse(raw) : {};
    return all[channelId] || all["global"] || {
      voice: "browser", voiceId: "browser_pt",
      slidesImage: "pexels", thumbImage: "kie_flux", videoModel: "none"
    };
  } catch { return { voice: "browser", voiceId: "browser_pt", slidesImage: "pexels", thumbImage: "kie_flux", videoModel: "none" }; }
}
```

---

## Mapa de Steps

```
Step 1 — Configuração do Vídeo
  └── Idioma (EN/ES/PT-BR) + Duração (8/15/20/custom) + Tópico/Ideia
  └── Estimativa de custo calculada em tempo real
  └── Seletor de voz (lê do Hub) com preview de custo
  └── Seletor de modelo de imagem (slides + thumb, lê do Hub)

Step 2 — Sumário e Capítulos
  └── IA gera: Título + Sumário com N capítulos (baseado na duração)
  └── Capítulos editáveis inline antes de prosseguir

Step 3 — Roteiro por Capítulo
  └── IA expande cada capítulo em roteiro completo
  └── Colapsível por capítulo com edição inline
  └── Botão "Regenerar Capítulo" individual

Step 4 — Narração (TTS)
  └── Gerar áudio por capítulo usando voz selecionada no Step 1
  └── Player inline por capítulo
  └── Skip disponível (pular etapa)

Step 5 — Slides e Imagens
  └── Extrai cenas do roteiro (~1 a cada 8s de narração estimada)
  └── Prompt por cena (editável)
  └── Geração por cena ou tudo de uma vez
  └── Thumbnail separado

Step 6 — Preview (Remotion Player ou Canvas atual)
  └── Preview das cenas montadas com o áudio
  └── Por ora: usar ScenePreviewPlayer existente por cena
  └── Missão 3 substituirá por Remotion Player completo

Step 7 — Export
  └── Montar vídeo via useVideoAssembler (existente)
  └── Download do WebM
  └── Missão 3 adicionará FFmpeg.wasm → MP4

Step 8 — Publicação
  └── Revisão de título + descrição + thumbnail
  └── Status: "Aguardando Aprovação"
  └── Salvar no Supabase via createContent
```

---

## Lógica de Duração → Capítulos

```typescript
function durationToChapters(durationMin: number): number {
  if (durationMin <= 8)  return 3;
  if (durationMin <= 12) return 4;
  if (durationMin <= 18) return 5;
  if (durationMin <= 25) return 6;
  return Math.ceil(durationMin / 4); // ~4 min por capítulo
}

function durationToScenes(durationMin: number): number {
  // 1 slide a cada ~8s de narração
  return Math.ceil((durationMin * 60) / 8);
}

function estimateCost(
  durationMin: number,
  hubDefaults: HubDefaults,
  voicePricePerMin: number,   // lido da tabela de vozes do MediaHub
  slidePricePerImg: number,   // lido da tabela de imagens do MediaHub
  thumbPricePerImg: number,
): { voice: number; slides: number; thumb: number; total: number } {
  const voice = durationMin * voicePricePerMin;
  const slides = durationToScenes(durationMin) * slidePricePerImg;
  const thumb = thumbPricePerImg;
  return { voice, slides, thumb, total: voice + slides + thumb };
}
```

---

## Preços por Provider (constantes — copiar do MediaHub)

```typescript
// Usar esses valores para calcular custo em tempo real no Step 1
const VOICE_PRICES: Record<string, number> = {
  "browser": 0,
  "openai": 0.45,
  "fish": 1.80,
  "elevenlabs": 9.00,
};

const IMAGE_PRICES: Record<string, number> = {
  "placeholder": 0,
  "pexels": 0,
  "kie_flux": 0.30,
  "dalle3": 0.24,
  "ideogram": 0.48,
};
```

---

## Step 1 — UI

```tsx
// Seção de Duração
<div className="grid grid-cols-4 gap-2">
  {([8, 15, 20] as const).map(d => (
    <Button
      key={d}
      variant={duration === d ? "default" : "outline"}
      className={duration === d ? "bg-primary" : "border-white/10 hover:bg-white/5"}
      onClick={() => setDuration(d)}
    >
      {d} min
    </Button>
  ))}
  <Button
    variant={duration === "custom" ? "default" : "outline"}
    className={duration === "custom" ? "bg-primary" : "border-white/10 hover:bg-white/5"}
    onClick={() => setDuration("custom")}
  >
    Custom
  </Button>
</div>
{duration === "custom" && (
  <div className="flex items-center gap-3 mt-2">
    <Slider value={[customMinutes]} min={20} max={60} step={5}
      onValueChange={([v]) => setCustomMinutes(v)} className="flex-1" />
    <span className="text-white font-bold w-16 text-center">{customMinutes} min</span>
  </div>
)}

// Estimativa de custo — atualiza em tempo real
<div className="mt-4 p-4 bg-black/20 border border-white/10 rounded-xl">
  <h4 className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Estimativa de Custo</h4>
  <div className="space-y-1.5 text-sm">
    <div className="flex justify-between">
      <span className="text-muted-foreground">Narração ({effectiveDuration} min)</span>
      <span className="text-white">{cost.voice === 0 ? "Grátis" : `R$ ${cost.voice.toFixed(2)}`}</span>
    </div>
    <div className="flex justify-between">
      <span className="text-muted-foreground">Slides ({durationToScenes(effectiveDuration)} imagens)</span>
      <span className="text-white">{cost.slides === 0 ? "Grátis" : `R$ ${cost.slides.toFixed(2)}`}</span>
    </div>
    <div className="flex justify-between">
      <span className="text-muted-foreground">Thumbnail</span>
      <span className="text-white">{cost.thumb === 0 ? "Grátis" : `R$ ${cost.thumb.toFixed(2)}`}</span>
    </div>
    <div className="flex justify-between font-bold border-t border-white/10 pt-1.5 mt-1">
      <span className="text-white">Total estimado</span>
      <span className="text-primary text-lg">R$ {cost.total.toFixed(2)}</span>
    </div>
  </div>
</div>
```

---

## Step 2 — Prompt do Sumário

```typescript
// System prompt para gerar sumário + capítulos
const summaryPrompt = `
Você é um roteirista especializado em vídeos de YouTube de alto engajamento.
Canal: ${channel.name} | Nicho: ${channel.niche}
Persona: ${blueprint?.persona_prompt || "narrador envolvente"}
Regras: ${blueprint?.script_rules || ""}

Crie um sumário estruturado para um vídeo de ${effectiveDuration} minutos sobre: "${idea}"

Retorne JSON:
{
  "title": "Título otimizado para YouTube (máx 70 chars)",
  "hook": "Frase de abertura de 1 linha para prender atenção",
  "chapters": [
    {
      "id": "ch1",
      "title": "Título do Capítulo",
      "summary": "O que será abordado neste capítulo (2-3 frases)"
    }
  ]
}

Gere exatamente ${durationToChapters(effectiveDuration)} capítulos.
`;
```

---

## Step 3 — Prompt do Roteiro por Capítulo

```typescript
// Chamada por capítulo
async function generateChapterScript(chapter: VideoChapter, allChapters: VideoChapter[]): Promise<string> {
  const chapterIndex = allChapters.findIndex(c => c.id === chapter.id);
  const isFirst = chapterIndex === 0;
  const isLast = chapterIndex === allChapters.length - 1;

  const prompt = `
Você é um roteirista para o canal "${channel.name}".
Idioma: ${language === "en" ? "English" : language === "es" ? "Español" : "Português Brasileiro"}
Estilo: ${blueprint?.persona_prompt || "narrador envolvente e direto"}
Regras: ${blueprint?.script_rules || ""}

Este é o capítulo ${chapterIndex + 1} de ${allChapters.length} do vídeo "${title}".
Contexto geral: ${allChapters.map(c => `${c.title}: ${c.summary}`).join(" | ")}

Escreva o roteiro COMPLETO para o capítulo: "${chapter.title}"
Resumo: ${chapter.summary}

${isFirst ? "Este é o capítulo de ABERTURA — comece com o hook: capture a atenção nos primeiros 30 segundos." : ""}
${isLast ? "Este é o capítulo FINAL — feche com CTA forte (like, inscrição, próximo vídeo)." : ""}

Duração alvo: ~${Math.ceil(effectiveDuration / allChapters.length)} minutos de narração.
Escreva APENAS o texto da narração. Sem estágios, sem [PAUSA], sem comentários de produção.
`;

  return await callClaude(
    "Você é um roteirista profissional de YouTube.",
    prompt
  );
}
```

---

## Step 4 — TTS por Capítulo

```typescript
// Gerar áudio de um capítulo
async function generateChapterAudio(chapterId: string, text: string) {
  const hub = loadHubDefaults(channelId);

  if (hub.voice === "browser") {
    // Web Speech API — síncrono no browser
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language === "en" ? "en-US" : language === "es" ? "es-ES" : "pt-BR";
    utterance.rate = 0.95;
    // Sem blob real disponível — marcar como "gerado"
    setChapterAudioStatus(chapterId, "done_browser");
    return;
  }

  if (hub.voice === "openai") {
    const isDev = window.location.hostname === "localhost";
    const url = isDev ? "/api-ai/v1/audio/speech" : "https://api.ai33.pro/v1/audio/speech";
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${AI33_API_KEY}` },
      body: JSON.stringify({
        model: "tts-1",
        input: text,
        voice: hub.voiceId || "alloy",   // alloy, onyx, nova, shimmer, echo, fable
        response_format: "mp3",
      }),
    });
    if (!res.ok) throw new Error(`TTS failed: ${res.status}`);
    const blob = await res.blob();
    const audioUrl = URL.createObjectURL(blob);
    // Medir duração
    const duration = await getAudioDuration(blob);
    updateChapter(chapterId, { audioUrl, audioDurationSec: duration });
  }
}

// Helper para medir duração de blob de áudio
async function getAudioDuration(blob: Blob): Promise<number> {
  return new Promise((resolve) => {
    const audio = new Audio(URL.createObjectURL(blob));
    audio.addEventListener("loadedmetadata", () => resolve(audio.duration));
  });
}
```

---

## Step 5 — Extração de Cenas por Capítulo

```typescript
// Número de cenas por capítulo = duração estimada do capítulo / 8s por slide
function extractScenesFromChapter(chapter: VideoChapter): Promise<Scene[]> {
  const chapterDurationMin = effectiveDuration / chapters.length;
  const sceneCount = Math.ceil((chapterDurationMin * 60) / 8);

  const prompt = `
Roteiro do capítulo "${chapter.title}":
${chapter.script}

Divida este roteiro em exatamente ${sceneCount} cenas visuais para slides.
Para cada cena, retorne JSON:
{
  "scenes": [
    {
      "title": "Título curto da cena",
      "narration": "Trecho exato do roteiro que será narrado nesta cena (5-15 segundos de fala)",
      "visual_prompt": "Prompt detalhado para geração de imagem. Dark aesthetic. ${blueprint?.visual_style || 'realistic'}. Cinematic. No text in image."
    }
  ]
}
`;

  const raw = await callClaude("...", prompt, true);
  return extractJson(raw).scenes;
}
```

---

## Persistence — Novo Estado para Salvar

```typescript
// Estender o storageKey existente com os novos campos
const stateToSave = {
  // campos existentes
  step, idea, title, scenes, thumbPrompt, thumbImageUrl, videoUrl,
  // campos novos
  language,           // "en" | "es" | "pt-BR"
  duration,           // 8 | 15 | 20 | "custom"
  customMinutes,      // number (só se duration === "custom")
  chapters,           // VideoChapter[] com roteiros e áudios
  hubVoice,           // snapshot do hub padrão de voz no momento da criação
  hubSlidesImage,     // snapshot do hub padrão de slides
  hubThumbImage,      // snapshot do hub padrão de thumb
};
```

---

## Integração com Ideias Aprovadas

O canal tem ideias aprovadas em `content_ideas` table. No Step 1, mostrar um popover/dropdown com as ideias aprovadas do canal:

```tsx
// No campo de ideia do Step 1
<div className="relative">
  <Textarea value={idea} onChange={e => setIdea(e.target.value)} />
  {ideas.filter(i => i.status === 'approved').length > 0 && (
    <Button size="sm" variant="ghost" onClick={() => setShowIdeas(!showIdeas)}>
      <Lightbulb className="w-4 h-4" /> {ideas.filter(i => i.status === 'approved').length} ideias aprovadas
    </Button>
  )}
</div>
{showIdeas && (
  <div className="space-y-2 p-3 bg-card/30 border border-white/10 rounded-xl">
    {ideas.filter(i => i.status === 'approved').map(idea => (
      <button key={idea.id} onClick={() => { setIdea(idea.title); setShowIdeas(false); }}
        className="w-full text-left text-sm text-white/80 hover:text-white p-2 rounded hover:bg-white/5">
        {idea.title}
      </button>
    ))}
  </div>
)}
```

---

## Critério de Conclusão

- [ ] Step 1 mostra estimativa de custo em tempo real ao mudar duração/idioma
- [ ] Step 2 gera sumário + N capítulos corretos para a duração escolhida
- [ ] Step 3 gera roteiro capítulo por capítulo, colapsível, editável inline
- [ ] Step 4 gera TTS por capítulo com player inline (voz lida do MediaHub)
- [ ] Step 5 extrai cenas do roteiro, gera imagens por cena (modelo lido do MediaHub)
- [ ] Step 6 preview das cenas (por ora: ScenePreviewPlayer existente)
- [ ] Step 7 monta WebM via useVideoAssembler existente
- [ ] Step 8 salva no Supabase com status "awaiting_review"
- [ ] Persistence funciona (retomar de onde parou ao reabrir)
- [ ] channelId vem de useParams, não de location.state
