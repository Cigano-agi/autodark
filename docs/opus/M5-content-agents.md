# OPUS MISSÃO 5 — Agentes de Conteúdo (Pipeline Completo)

> Leia MISSIONS.md, M0, M1, M3 antes deste.
> Dependência: M1 concluída (wizard funcionando).
> Esta missão adiciona automação sobre o wizard manual.

---

## Visão Geral

O objetivo é que o sistema consiga ir de "canal configurado" até "vídeo na fila de revisão" com mínima intervenção humana.

```
Fluxo Semi-Auto (prioridade):
  Canal com Blueprint configurado
    → Trend Agent detecta tópicos em alta (concorrentes)
    → Head Agent gera batch de ideias
    → Usuário aprova 1 ideia (único passo manual)
    → Roteirista Agent: gera sumário + capítulos
    → Narrador Agent: gera TTS por capítulo
    → Visual Agent: gera prompts + imagens
    → Montagem Agent: monta via Remotion/FFmpeg
    → SEO Agent: gera título, descrição, tags
    → Vídeo aparece em "Aguardando Revisão" no canal
    → Usuário aprova e agenda publicação
```

---

## Agentes — Onde Vivem

Cada agente é uma função async no frontend que chama APIs existentes (callClaude, callKieImage, TTS, etc.). Não criar Edge Functions para isso por ora — tudo client-side usando as APIs que o wizard já usa.

```
src/agents/
  trendAgent.ts        ← analisa concorrentes via dados do Supabase
  headAgent.ts         ← gera batch de ideias (já existe em hooks/useHeadAgent.tsx — refatorar)
  scripterAgent.ts     ← gera sumário + capítulos + roteiro (extrair do wizard)
  narratorAgent.ts     ← gera TTS de todos os capítulos
  visualAgent.ts       ← gera prompts + aciona imagens
  assemblyAgent.ts     ← aciona montagem Remotion + export
  seoAgent.ts          ← gera título, descrição, tags, timestamps
  pipelineOrchestrator.ts ← coordena todos os agentes em sequência
```

---

## trendAgent.ts

```typescript
// src/agents/trendAgent.ts
// Analisa os vídeos de concorrentes salvos no Supabase para identificar padrões de sucesso

import { supabase } from "@/integrations/supabase/client";

export interface TrendInsight {
  pattern: string;         // ex: "Vídeos com 'Psychology' no título performam 2x mais"
  topTitles: string[];     // top 5 títulos dos concorrentes
  suggestedAngles: string[]; // ângulos sugeridos para o canal
}

export async function analyzeTrends(channelId: string): Promise<TrendInsight> {
  // Buscar vídeos dos concorrentes deste canal
  const { data: competitors } = await supabase
    .from("channel_competitors")
    .select("*, competitor_videos(*)")
    .eq("channel_id", channelId);

  if (!competitors?.length) {
    return { pattern: "Sem dados de concorrentes ainda.", topTitles: [], suggestedAngles: [] };
  }

  // Compilar dados para análise
  const allVideos = competitors.flatMap(c => c.competitor_videos || []);
  const topVideos = allVideos
    .sort((a, b) => (b.views || 0) - (a.views || 0))
    .slice(0, 20);

  const analysisPrompt = `
Analise estes ${topVideos.length} vídeos de maior performance dos concorrentes:
${topVideos.map(v => `- "${v.title}" (${v.views?.toLocaleString()} views)`).join("\n")}

Identifique:
1. Padrões de título que se repetem nos mais vistos
2. Tópicos em alta
3. Ângulos ainda não explorados

Retorne JSON:
{
  "pattern": "insight principal em 1 frase",
  "topTitles": ["título1", "título2", "título3"],
  "suggestedAngles": ["ângulo1", "ângulo2", "ângulo3"]
}
`;

  const raw = await callClaude("Você é um analista de YouTube.", analysisPrompt, true);
  return JSON.parse(raw);
}
```

---

## headAgent.ts — Refatoração do useHeadAgent existente

```typescript
// src/agents/headAgent.ts
// O useHeadAgent.tsx atual já faz parte disso — extrair a lógica pura para cá

export interface GeneratedIdea {
  title: string;
  concept: string;      // 2-3 linhas
  reasoning: string;    // por que vai performar bem
  score: number;        // 0-100
  angle: string;        // ângulo único desta ideia
}

export async function generateIdeasBatch(
  channelId: string,
  channel: Channel,
  blueprint: ChannelBlueprint | null,
  trends: TrendInsight,
  existingTitles: string[],   // evitar repetição
  count = 10,
): Promise<GeneratedIdea[]> {
  const prompt = `
Canal: "${channel.name}" | Nicho: ${channel.niche}
Persona: ${blueprint?.persona_prompt || "narrador envolvente"}
Regras: ${blueprint?.script_rules || ""}
Tendências atuais: ${trends.pattern}
Top títulos dos concorrentes: ${trends.topTitles.join(", ")}
Tópicos já usados (EVITAR): ${existingTitles.slice(-20).join(", ")}

Gere ${count} ideias únicas para vídeos de 10-20 minutos.
Foco em: alto CTR, watch time, relevância para o nicho.

Retorne JSON:
{
  "ideas": [
    {
      "title": "...",
      "concept": "...",
      "reasoning": "...",
      "score": 85,
      "angle": "..."
    }
  ]
}
`;

  const raw = await callClaude(
    "Você é um estrategista de conteúdo YouTube especialista em crescimento orgânico.",
    prompt,
    true
  );

  return JSON.parse(raw).ideas;
}
```

---

## scripterAgent.ts

```typescript
// src/agents/scripterAgent.ts
// Extrai toda a lógica de geração de roteiro do wizard (M1) para funções puras

export interface ScriptResult {
  title: string;
  hook: string;
  chapters: VideoChapter[];
}

export async function generateFullScript(
  idea: string,
  language: VideoLanguage,
  durationMin: number,
  channel: Channel,
  blueprint: ChannelBlueprint | null,
): Promise<ScriptResult> {
  // Step 1: sumário
  const summary = await generateSummary(idea, language, durationMin, channel, blueprint);

  // Step 2: roteiro por capítulo (em paralelo — Promise.all)
  const chaptersWithScripts = await Promise.all(
    summary.chapters.map(ch => generateChapterScript(ch, summary.chapters, language, durationMin, channel, blueprint))
  );

  return {
    title: summary.title,
    hook: summary.hook,
    chapters: chaptersWithScripts,
  };
}

// generateSummary e generateChapterScript: copiar do M1-video-wizard.md
// Essas funções já foram especificadas lá — não duplicar, apenas mover para cá
```

---

## narratorAgent.ts

```typescript
// src/agents/narratorAgent.ts

export async function generateAllNarrations(
  chapters: VideoChapter[],
  language: VideoLanguage,
  hubDefaults: HubDefaults,
  onProgress?: (done: number, total: number) => void,
): Promise<VideoChapter[]> {
  const result: VideoChapter[] = [];

  for (let i = 0; i < chapters.length; i++) {
    const chapter = chapters[i];
    const { audioUrl, audioDurationSec } = await generateChapterAudio(
      chapter.script,
      language,
      hubDefaults,
    );
    result.push({ ...chapter, audioUrl, audioDurationSec });
    onProgress?.(i + 1, chapters.length);
  }

  return result;
}

// generateChapterAudio: copiar do M1-video-wizard.md
```

---

## visualAgent.ts

```typescript
// src/agents/visualAgent.ts

export async function generateAllVisuals(
  chapters: VideoChapter[],
  blueprint: ChannelBlueprint | null,
  hubDefaults: HubDefaults,
  onProgress?: (done: number, total: number) => void,
): Promise<VideoChapter[]> {
  // Calcular total de imagens
  const allScenes = chapters.flatMap(ch => ch.scenes);
  let done = 0;

  const updatedChapters = await Promise.all(
    chapters.map(async chapter => {
      const updatedScenes = await Promise.all(
        chapter.scenes.map(async scene => {
          // Enriquecer o prompt com o estilo do blueprint
          const enrichedPrompt = enrichImagePrompt(scene.visual_prompt, blueprint);
          const imageUrl = await callImageGeneration(enrichedPrompt);
          done++;
          onProgress?.(done, allScenes.length);
          return { ...scene, imageUrl };
        })
      );
      return { ...chapter, scenes: updatedScenes };
    })
  );

  return updatedChapters;
}

function enrichImagePrompt(basePrompt: string, blueprint: ChannelBlueprint | null): string {
  const style = blueprint?.visual_style || "realistic";
  const consistency = blueprint?.character_consistency
    ? `Character: ${blueprint.character_description}. `
    : "";

  return `${consistency}${basePrompt}. Style: ${style}. Cinematic. Dark aesthetic. No text in image. 16:9 aspect ratio.`;
}
```

---

## seoAgent.ts

```typescript
// src/agents/seoAgent.ts

export interface SEOPackage {
  title: string;            // max 70 chars
  description: string;      // 2-3 parágrafos + timestamps + links
  tags: string[];           // 15-20 tags
  chapters: {               // timestamps para o YouTube
    time: string;           // "0:00", "2:15", etc.
    label: string;
  }[];
}

export async function generateSEO(
  title: string,
  chapters: VideoChapter[],
  channel: Channel,
  language: VideoLanguage,
): Promise<SEOPackage> {
  // Calcular timestamps dos capítulos
  let currentSec = 0;
  const chapterTimestamps = chapters.map(ch => {
    const mins = Math.floor(currentSec / 60);
    const secs = currentSec % 60;
    const time = `${mins}:${String(secs).padStart(2, "0")}`;
    currentSec += ch.audioDurationSec || 120;
    return { time, label: ch.title };
  });

  const prompt = `
Canal: "${channel.name}" (${channel.niche})
Idioma: ${language}
Vídeo: "${title}"
Capítulos:
${chapters.map((ch, i) => `${chapterTimestamps[i].time} - ${ch.title}`).join("\n")}

Gere o pacote SEO completo para YouTube.

Retorne JSON:
{
  "title": "Título otimizado (max 70 chars, inclui keyword principal)",
  "description": "Descrição completa com:\\n\\n[TIMESTAMPS]\\n\\n[SOBRE O CANAL]\\n\\n[TAGS NATURAIS]",
  "tags": ["tag1", "tag2", ...],
  "chapters": [{"time": "0:00", "label": "Introdução"}, ...]
}
`;

  const raw = await callClaude("Você é um especialista em SEO para YouTube.", prompt, true);
  return JSON.parse(raw);
}
```

---

## pipelineOrchestrator.ts — O Condutor

```typescript
// src/agents/pipelineOrchestrator.ts

export type PipelineStage =
  | "idle"
  | "analyzing_trends"
  | "generating_ideas"
  | "waiting_approval"      ← único passo manual no semi-auto
  | "generating_script"
  | "generating_audio"
  | "generating_visuals"
  | "assembling"
  | "generating_seo"
  | "saving"
  | "done"
  | "error";

export interface PipelineState {
  stage: PipelineStage;
  progress: number;          // 0-100
  message: string;
  ideas?: GeneratedIdea[];
  approvedIdea?: GeneratedIdea;
  script?: ScriptResult;
  seo?: SEOPackage;
  videoUrl?: string;
  error?: string;
}

export function usePipelineOrchestrator(channelId: string) {
  const [state, setState] = useState<PipelineState>({ stage: "idle", progress: 0, message: "" });

  const update = (patch: Partial<PipelineState>) =>
    setState(prev => ({ ...prev, ...patch }));

  const runSemiAuto = async (approvedIdea: GeneratedIdea) => {
    const channel = /* useChannels */ ...;
    const blueprint = /* useBlueprint */ ...;
    const hub = loadHubDefaults(channelId);
    const { language, duration } = getChannelDefaults(channelId); // lê do localStorage

    try {
      // 1. Roteiro
      update({ stage: "generating_script", progress: 10, message: "Gerando roteiro..." });
      const script = await generateFullScript(approvedIdea.title, language, duration, channel, blueprint);

      // 2. Narração
      update({ stage: "generating_audio", progress: 30, message: "Gerando narração..." });
      const chaptersWithAudio = await generateAllNarrations(
        script.chapters, language, hub,
        (done, total) => update({ progress: 30 + (done / total) * 20 })
      );

      // 3. Imagens
      update({ stage: "generating_visuals", progress: 50, message: "Gerando imagens..." });
      const chaptersWithVisuals = await generateAllVisuals(
        chaptersWithAudio, blueprint, hub,
        (done, total) => update({ progress: 50 + (done / total) * 25 })
      );

      // 4. Montagem (por ora: useVideoAssembler; M3 substitui por Remotion)
      update({ stage: "assembling", progress: 75, message: "Montando vídeo..." });
      const allScenes = chaptersWithVisuals.flatMap(ch => ch.scenes);
      const combinedAudio = /* combinar áudios dos capítulos em 1 blob */ null;
      // TODO M3: substituir por Remotion + FFmpeg export
      const videoUrl = await assembleVideo(allScenes, combinedAudio);

      // 5. SEO
      update({ stage: "generating_seo", progress: 90, message: "Otimizando SEO..." });
      const seo = await generateSEO(script.title, chaptersWithVisuals, channel, language);

      // 6. Salvar no Supabase
      update({ stage: "saving", progress: 95, message: "Salvando..." });
      await createContent({
        title: seo.title,
        script: script.chapters.map(ch => ch.script).join("\n\n"),
        topic: approvedIdea.title,
        status: "awaiting_review",
        // metadata: { seo, videoUrl, chapters: chaptersWithVisuals }
      });

      update({ stage: "done", progress: 100, message: "Vídeo na fila de revisão!", videoUrl, seo });

    } catch (err) {
      update({ stage: "error", message: err instanceof Error ? err.message : "Erro desconhecido", error: String(err) });
    }
  };

  return { state, runSemiAuto, approveIdea: (idea: GeneratedIdea) => runSemiAuto(idea) };
}
```

---

## UI — Pipeline Tab no ChannelView

O tab "Pipeline" do ChannelView deve mostrar:

```
┌─────────────────────────────────────────────┐
│ Pipeline Semi-Auto                          │
│                                             │
│ [Analisar Concorrentes] [Gerar Ideias]      │
│                                             │
│ Ideias Geradas (pendentes):                 │
│ ┌─────────────────────────────────────────┐ │
│ │ "The Psychology of Highly Sensitive..." │ │
│ │ Score: 87 | [Aprovar → Produzir] [✗]   │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ Em Produção:                                │
│ ┌─────────────────────────────────────────┐ │
│ │ "The Psychology of Tattooed Women..."   │ │
│ │ ████████░░ 75% — Gerando imagens (4/8) │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ Aguardando Revisão (2):                     │
│ [Card com preview + Aprovar/Rejeitar]       │
└─────────────────────────────────────────────┘
```

---

## Modo Full-Auto (futuro)

```typescript
// Ativar no blueprint do canal
interface ChannelBlueprint {
  // ... campos existentes ...
  automation_mode: "manual" | "semi_auto" | "full_auto";
  auto_publish_on_approval: boolean;
  videos_per_week: number;     // target
}

// No modo full_auto: após gerar ideias, aprovar automaticamente a de maior score
// E rodar todo o pipeline sem interação humana
// A aprovação de publicação ainda é manual (NUNCA publicar sem aprovação humana)
```

---

## Critério de Conclusão

- [ ] `src/agents/` criado com todos os agentes como funções puras
- [ ] `usePipelineOrchestrator` funciona no modo semi-auto
- [ ] Pipeline Tab no ChannelView mostra: ideias geradas, em produção, aguardando revisão
- [ ] Ao clicar "Aprovar → Produzir" em uma ideia, o pipeline roda automaticamente
- [ ] Vídeo aparece em "Aguardando Revisão" ao final
- [ ] Progress tracking visível durante todo o pipeline
- [ ] Erros mostrados com mensagem clara e opção de retry por etapa
- [ ] `useHeadAgent.tsx` existente é refatorado para usar `headAgent.ts`
