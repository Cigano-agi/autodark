export type VideoLanguage = "en" | "es" | "pt-BR";

export interface TrendInsight {
  pattern: string;
  topTitles: string[];
  suggestedAngles: string[];
}

export interface GeneratedIdea {
  title: string;
  concept: string;
  reasoning: string;
  score: number;
  angle: string;
}

export interface VideoChapter {
  id: string;
  title: string;
  summary: string;
  script: string;
  scenes: SceneData[];
  audioUrl?: string;
  audioDurationSec?: number;
}

export interface SceneData {
  title: string;
  narration: string;
  visual_prompt: string;
  imageUrl?: string;
  chapterId?: string;
  durationSec?: number;
}

export interface ScriptResult {
  title: string;
  hook: string;
  chapters: VideoChapter[];
}

export interface SEOPackage {
  title: string;
  description: string;
  tags: string[];
  chapters: { time: string; label: string }[];
}

export interface HubDefaults {
  voice: string;
  voiceId: string;
  slidesImage: string;
  thumbImage: string;
  videoModel: string;
}

export interface ChannelData {
  id: string;
  name: string;
  niche?: string;
  [key: string]: unknown;
}

export interface BlueprintData {
  topic?: string;
  persona_prompt?: string;
  script_rules?: string;
  visual_style?: string;
  character_description?: string;
  char_limit?: number;
  voice_id?: string;
  [key: string]: unknown;
}

export type PipelineStage =
  | "idle"
  | "analyzing_trends"
  | "generating_ideas"
  | "waiting_approval"
  | "generating_script"
  | "generating_audio"
  | "extracting_scenes"
  | "generating_visuals"
  | "assembling"
  | "generating_seo"
  | "saving"
  | "done"
  | "error";

export interface PipelineState {
  stage: PipelineStage;
  progress: number;
  message: string;
  ideas?: GeneratedIdea[];
  approvedIdea?: GeneratedIdea;
  script?: ScriptResult;
  seo?: SEOPackage;
  videoUrl?: string;
  error?: string;
}
