# OPUS MISSÃO 3 — Engine de Montagem com Remotion + FFmpeg.wasm

> Leia MISSIONS.md, M0 e M1 antes deste.
> Dependência: M1 deve estar concluída (wizard gerando chapters + scenes + audioUrl).
> Esta missão substitui o `useVideoAssembler` Canvas+MediaRecorder por Remotion.

---

## Estratégia Técnica

```
Browser (sem servidor):
  Remotion @remotion/player  → preview em tempo real no Step 6
  FFmpeg.wasm (libx264)      → export MP4 H.264 no Step 7

NÃO usar:
  Remotion Lambda (requer AWS)
  Remotion CLI server (requer Node.js)
  @remotion/renderer (Node.js only)
```

O Remotion Player roda 100% no browser para preview. O export MP4 é feito pelo FFmpeg.wasm convertendo os frames capturados do canvas.

---

## Instalação

```bash
npm install @remotion/core @remotion/player @remotion/media-utils
npm install @ffmpeg/ffmpeg @ffmpeg/util
```

**vite.config.ts** — adicionar headers para SharedArrayBuffer (necessário para FFmpeg.wasm):
```typescript
// vite.config.ts
export default defineConfig({
  // ... config existente ...
  server: {
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
  },
  plugins: [
    react(),
    // Adicionar para build de produção também:
  ],
});
```

---

## Estrutura de Arquivos a Criar

```
src/remotion/
  Root.tsx                     ← registerRoot (necessário para Remotion)
  compositions/
    SlideShow.tsx              ← composição principal do vídeo
    ChapterSlides.tsx          ← slides de 1 capítulo
    SlideScene.tsx             ← 1 slide = 1 imagem + legenda + Ken Burns
  overlays/
    CaptionOverlay.tsx         ← legendas word-by-word animadas
    ChapterTitle.tsx           ← card de título entre capítulos
  hooks/
    useFFmpegExport.ts         ← hook de export MP4 via FFmpeg.wasm
```

---

## Interfaces dos Dados

```typescript
// Props para a composição principal
export interface SlideShowProps {
  chapters: {
    id: string;
    title: string;
    audioUrl: string;            // URL do áudio mp3/webm do capítulo
    audioDurationSec: number;
    scenes: {
      narration: string;         // texto narrado nesta cena
      imageUrl: string;          // URL da imagem (data:, https:, etc.)
      durationSec: number;       // calculado = audioDurationSec / scenes.length
    }[];
  }[];
  // Configurações visuais (lidas do blueprint)
  captionStyle: {
    color: string;               // default: "#FFFF00" (amarelo)
    fontSize: number;            // default: 52
    fontFamily: string;          // default: "Arial Black, sans-serif"
    position: "bottom" | "center";  // default: "bottom"
    chunkSize: number;           // palavras por chunk: default: 7
  };
  kenBurnsIntensity: number;     // 0-20, default: 8 (zoom 8%)
  musicUrl?: string;             // URL da trilha de fundo
  musicVolume: number;           // 0-1, default: 0.20
}
```

---

## SlideShow.tsx — Composição Principal

```tsx
// src/remotion/compositions/SlideShow.tsx
import { AbsoluteFill, Audio, Sequence, useCurrentFrame, useVideoConfig } from "@remotion/core";

export const SlideShow: React.FC<SlideShowProps> = ({ chapters, captionStyle, musicUrl, musicVolume }) => {
  const { fps } = useVideoConfig();

  // Calcular offset de cada capítulo em frames
  let offsetFrames = 0;
  const chapterOffsets = chapters.map(ch => {
    const start = offsetFrames;
    offsetFrames += Math.ceil(ch.audioDurationSec * fps);
    return { chapter: ch, startFrame: start };
  });

  const totalFrames = offsetFrames;

  return (
    <AbsoluteFill className="bg-black">
      {/* Trilha de fundo — dura todo o vídeo */}
      {musicUrl && (
        <Audio src={musicUrl} volume={musicVolume} />
      )}

      {/* Capítulos em sequência */}
      {chapterOffsets.map(({ chapter, startFrame }) => (
        <Sequence
          key={chapter.id}
          from={startFrame}
          durationInFrames={Math.ceil(chapter.audioDurationSec * fps)}
        >
          <ChapterSlides chapter={chapter} captionStyle={captionStyle} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
```

---

## SlideScene.tsx — 1 Slide

```tsx
// src/remotion/compositions/SlideScene.tsx
import { AbsoluteFill, Img, interpolate, useCurrentFrame, useVideoConfig } from "@remotion/core";

interface SlideSceneProps {
  imageUrl: string;
  narration: string;
  durationSec: number;
  captionStyle: SlideShowProps["captionStyle"];
  kenBurnsIntensity: number;
}

export const SlideScene: React.FC<SlideSceneProps> = ({
  imageUrl, narration, durationSec, captionStyle, kenBurnsIntensity
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const durationFrames = durationSec * fps;

  // Ken Burns: zoom de 1.0 para 1 + (intensity/100)
  const scale = interpolate(
    frame,
    [0, durationFrames],
    [1, 1 + kenBurnsIntensity / 100],
    { extrapolateRight: "clamp" }
  );

  // Fade in/out nos primeiros/últimos 15 frames
  const opacity = interpolate(
    frame,
    [0, 15, durationFrames - 15, durationFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill style={{ opacity }}>
      {/* Imagem com Ken Burns */}
      <AbsoluteFill style={{ transform: `scale(${scale})`, transformOrigin: "center center" }}>
        <Img
          src={imageUrl}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </AbsoluteFill>

      {/* Overlay escuro sutil */}
      <AbsoluteFill style={{ background: "linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.6) 100%)" }} />

      {/* Legendas */}
      <CaptionOverlay
        text={narration}
        frame={frame}
        totalFrames={durationFrames}
        style={captionStyle}
      />
    </AbsoluteFill>
  );
};
```

---

## CaptionOverlay.tsx — Legendas Word-by-Word

```tsx
// src/remotion/overlays/CaptionOverlay.tsx
import { interpolate } from "@remotion/core";

interface CaptionOverlayProps {
  text: string;
  frame: number;
  totalFrames: number;
  style: SlideShowProps["captionStyle"];
}

export const CaptionOverlay: React.FC<CaptionOverlayProps> = ({ text, frame, totalFrames, style }) => {
  const words = text.trim().split(/\s+/);
  const { chunkSize } = style;

  // Dividir em chunks de N palavras
  const chunks: string[] = [];
  for (let i = 0; i < words.length; i += chunkSize) {
    chunks.push(words.slice(i, i + chunkSize).join(" "));
  }

  // Qual chunk exibir no frame atual
  const framesPerChunk = totalFrames / chunks.length;
  const currentChunkIdx = Math.min(
    Math.floor(frame / framesPerChunk),
    chunks.length - 1
  );
  const currentChunk = chunks[currentChunkIdx];

  // Fade in do chunk atual
  const chunkFrame = frame % framesPerChunk;
  const opacity = interpolate(chunkFrame, [0, 8], [0, 1], { extrapolateRight: "clamp" });

  const positionStyle = style.position === "bottom"
    ? { bottom: 80, left: 0, right: 0, textAlign: "center" as const }
    : { top: "50%", left: 0, right: 0, textAlign: "center" as const, transform: "translateY(-50%)" };

  return (
    <div style={{
      position: "absolute",
      ...positionStyle,
      opacity,
      padding: "0 40px",
    }}>
      <span style={{
        color: style.color,
        fontSize: style.fontSize,
        fontFamily: style.fontFamily,
        fontWeight: "black",
        textShadow: "2px 2px 8px rgba(0,0,0,0.9), -2px -2px 8px rgba(0,0,0,0.9)",
        lineHeight: 1.2,
        display: "inline-block",
        maxWidth: "80%",
      }}>
        {currentChunk}
      </span>
    </div>
  );
};
```

---

## Integração no Step 6 do Wizard — Remotion Player

```tsx
// No Production/Index.tsx, Step 6
import { Player } from "@remotion/player";
import { SlideShow } from "@/remotion/compositions/SlideShow";

// Calcular duração total em frames
const FPS = 30;
const totalFrames = chapters.reduce((sum, ch) => sum + Math.ceil(ch.audioDurationSec * FPS), 0);

// Props da composição
const slideShowProps: SlideShowProps = {
  chapters: chapters.map(ch => ({
    ...ch,
    scenes: ch.scenes.map(scene => ({
      ...scene,
      durationSec: ch.audioDurationSec / ch.scenes.length,
    })),
  })),
  captionStyle: {
    color: "#FFFF00",
    fontSize: 52,
    fontFamily: "Arial Black, Impact, sans-serif",
    position: "bottom",
    chunkSize: 7,
  },
  kenBurnsIntensity: blueprint?.scenes_image_ratio ? 8 : 6,
  musicUrl: blueprint?.custom_music_url || undefined,
  musicVolume: 0.20,
};

// JSX no Step 6
<div className="rounded-2xl overflow-hidden border border-white/10" style={{ aspectRatio: "16/9" }}>
  <Player
    component={SlideShow}
    inputProps={slideShowProps}
    durationInFrames={totalFrames}
    compositionWidth={1280}
    compositionHeight={720}
    fps={FPS}
    style={{ width: "100%", height: "100%" }}
    controls
    loop={false}
  />
</div>
```

---

## useFFmpegExport.ts — Export MP4

```typescript
// src/remotion/hooks/useFFmpegExport.ts
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

export function useFFmpegExport() {
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportLog, setExportLog] = useState("");
  const ffmpegRef = useRef<FFmpeg | null>(null);

  const initFFmpeg = async () => {
    if (ffmpegRef.current) return ffmpegRef.current;
    const ffmpeg = new FFmpeg();
    // Carregar do CDN (não precisa de servidor)
    const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
    });
    ffmpeg.on("progress", ({ progress }) => setExportProgress(Math.round(progress * 100)));
    ffmpeg.on("log", ({ message }) => setExportLog(message));
    ffmpegRef.current = ffmpeg;
    return ffmpeg;
  };

  // Método principal: recebe o WebM blob do MediaRecorder e converte para MP4
  const exportToMp4 = async (webmBlob: Blob, filename = "autodark-video"): Promise<void> => {
    setExporting(true);
    setExportProgress(0);
    setExportLog("Iniciando FFmpeg...");

    try {
      const ffmpeg = await initFFmpeg();

      // Escrever o WebM no sistema de arquivos virtual do FFmpeg
      await ffmpeg.writeFile("input.webm", await fetchFile(webmBlob));
      setExportLog("Convertendo para MP4 H.264...");

      // Converter para MP4 H.264
      await ffmpeg.exec([
        "-i", "input.webm",
        "-c:v", "libx264",
        "-preset", "fast",
        "-crf", "23",         // qualidade: 18=excelente, 28=menor
        "-c:a", "aac",
        "-b:a", "128k",
        "-movflags", "+faststart",   // otimiza para streaming no YouTube
        "output.mp4",
      ]);

      // Ler o arquivo de saída e fazer download
      const data = await ffmpeg.readFile("output.mp4");
      const mp4Blob = new Blob([data], { type: "video/mp4" });
      const url = URL.createObjectURL(mp4Blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `${filename}.mp4`;
      link.click();
      URL.revokeObjectURL(url);

      setExportLog("MP4 exportado com sucesso!");
    } finally {
      setExporting(false);
    }
  };

  return { exportToMp4, exporting, exportProgress, exportLog };
}
```

---

## Root.tsx — Necessário para Remotion

```tsx
// src/remotion/Root.tsx
import { Composition } from "@remotion/core";
import { registerRoot } from "@remotion/core";
import { SlideShow } from "./compositions/SlideShow";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="SlideShow"
      component={SlideShow}
      durationInFrames={300}  // placeholder — sobrescrito pelo Player
      fps={30}
      width={1280}
      height={720}
      defaultProps={{
        chapters: [],
        captionStyle: {
          color: "#FFFF00",
          fontSize: 52,
          fontFamily: "Arial Black, sans-serif",
          position: "bottom",
          chunkSize: 7,
        },
        kenBurnsIntensity: 8,
        musicVolume: 0.20,
      }}
    />
  );
};

registerRoot(RemotionRoot);
```

> **Nota:** O `registerRoot` é necessário se você quiser usar o Remotion Studio ou a CLI no futuro. Para uso somente com `<Player>`, não é estritamente necessário, mas é boa prática.

---

## Armadilhas Conhecidas

1. **SharedArrayBuffer** — FFmpeg.wasm exige `Cross-Origin-Embedder-Policy: require-corp` e `Cross-Origin-Opener-Policy: same-origin`. Isso pode quebrar `window.open()` e alguns iframes. Configurar no vite.config.ts.

2. **Bug de duração do WebM** — O `useVideoAssembler` atual gera vídeo com duração = metade do esperado porque `requestAnimationFrame` roda a 60fps mas o canvas avança 1/30s por tick. **Com Remotion esse bug não existe** — o timing é baseado em `frame / fps`, não em rAF real-time.

3. **Áudio de URLs externas (Kie.ai, etc.)** — Remotion tem restrições de CORS para `<Audio>` e `<Video>`. Para áudios externos, fazer proxy via Supabase Storage ou usar blob URLs.

4. **@remotion/player não exporta MP4** — O `<Player>` é apenas para preview. Para export, precisa do FFmpeg.wasm ou de um servidor com `@remotion/renderer`. Estamos usando FFmpeg.wasm.

5. **Tamanho do bundle** — `@ffmpeg/core.wasm` é ~30MB. Ele é carregado lazily via `toBlobURL` do CDN, não incluído no bundle do app. Mostrar loading ao inicializar pela primeira vez.

---

## Critério de Conclusão

- [ ] `@remotion/player` instalado e funciona no Step 6
- [ ] Preview mostra slides sequenciais com Ken Burns visível
- [ ] Legendas animadas sincronizadas com a duração de cada slide
- [ ] Fade in/out entre slides funcionando
- [ ] `useFFmpegExport` carrega FFmpeg.wasm do CDN sem erro
- [ ] Export de WebM → MP4 funciona (arquivo válido, abre no VLC/YouTube)
- [ ] SharedArrayBuffer headers configurados no vite.config.ts
- [ ] Bug de duração do WebM corrigido (Remotion não tem esse bug)
