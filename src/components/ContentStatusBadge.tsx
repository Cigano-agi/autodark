import { Badge } from "@/components/ui/badge";

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  // Pipeline stages (Sprint A)
  queued:                { label: "Na Fila",            variant: "outline" },
  config_set:            { label: "Configurado",        variant: "outline" },
  draft:                 { label: "Rascunho",           variant: "outline" },
  idea_generated:        { label: "Ideia Gerada",       variant: "secondary" },
  script_generated:      { label: "Roteiro Pronto",     variant: "secondary" },
  pending_tts:           { label: "Gerando Áudio...",    variant: "secondary" },
  tts_done:              { label: "Áudio Pronto",       variant: "default" },
  visuals_done:          { label: "Imagens Prontas",    variant: "default" },
  assembled:             { label: "Vídeo Montado",      variant: "default" },
  seo_done:              { label: "SEO Pronto",         variant: "default" },
  awaiting_review:       { label: "Aguardando Revisão", variant: "default" },
  published:             { label: "Publicado",          variant: "default" },
  // Error states
  failed:                { label: "Falhou",             variant: "destructive" },
  tts_failed:            { label: "Falhou — Áudio",     variant: "destructive" },
  audio_storage_failed:  { label: "Falhou — Storage",   variant: "destructive" },
  // Legacy
  subtitle_generated:    { label: "Legendas Geradas",   variant: "default" },
  pending:               { label: "Pendente",           variant: "outline" },
  generating:            { label: "Gerando...",          variant: "secondary" },
};

interface ContentStatusBadgeProps {
  status: string | null | undefined;
}

export function ContentStatusBadge({ status }: ContentStatusBadgeProps) {
  const key = status ?? "pending";
  const { label, variant } = STATUS_MAP[key] ?? { label: key, variant: "outline" as const };

  return (
    <Badge variant={variant} className="text-xs">
      {label}
    </Badge>
  );
}
