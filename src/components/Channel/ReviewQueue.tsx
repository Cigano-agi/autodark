import { useState } from "react";
import { useContents, type Content } from "@/hooks/useContents";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  CheckCircle2, XCircle, Youtube, Calendar, Play,
  Pencil, Loader2, Clock, CheckCheck, Radio,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ─── Status helpers ───────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  draft:            "Rascunho",
  awaiting_review:  "Aguardando Revisão",
  approved:         "Aprovado",
  published:        "Publicado",
  tts_done:         "TTS Pronto",
};

const STATUS_COLOR: Record<string, string> = {
  draft:            "bg-white/10 text-white/50",
  awaiting_review:  "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  approved:         "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  published:        "bg-blue-500/20 text-blue-300 border-blue-500/30",
  tts_done:         "bg-purple-500/20 text-purple-300 border-purple-500/30",
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  awaiting_review: <Clock className="w-3.5 h-3.5" />,
  approved:        <CheckCircle2 className="w-3.5 h-3.5" />,
  published:       <CheckCheck className="w-3.5 h-3.5" />,
  draft:           <Radio className="w-3.5 h-3.5" />,
};

// ─── Filter tabs ──────────────────────────────────────────────────────────────

type FilterTab = "all" | "awaiting_review" | "approved" | "published";

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: "all",             label: "Todos" },
  { key: "awaiting_review", label: "Aguardando Revisão" },
  { key: "approved",        label: "Aprovados" },
  { key: "published",       label: "Publicados" },
];

// ─── Edit / Approve modal ─────────────────────────────────────────────────────

interface ReviewModalProps {
  content: Content;
  open: boolean;
  onClose: () => void;
  onSave: (updates: { title: string; angle: string; scheduled_date: string | null }) => Promise<void>;
  onApprove: (scheduledDate: string | null) => Promise<void>;
  onPublishNow: () => Promise<void>;
  isSaving: boolean;
}

function ReviewModal({ content, open, onClose, onSave, onApprove, onPublishNow, isSaving }: ReviewModalProps) {
  const [title, setTitle] = useState(content.title);
  const [description, setDescription] = useState(content.angle || "");
  const [scheduledDate, setScheduledDate] = useState<string>(
    content.scheduled_date ? content.scheduled_date.slice(0, 16) : ""
  );

  const handleApprove = () => onApprove(scheduledDate || null);

  // Helper to get video URL
  const getVideoUrl = (c: any) => {
    if (c.video_path?.startsWith('http')) return c.video_path;
    if (c.video_path) {
      const { data } = supabase.storage.from('videos').getPublicUrl(c.video_path);
      return data.publicUrl;
    }
    return c.reference || null;
  };

  const videoUrl = getVideoUrl(content);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[640px] bg-card border-white/10 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
            <Pencil className="w-5 h-5 text-primary" />
            Revisar Conteúdo
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          {/* Video preview */}
          {videoUrl && (
            <div className="aspect-video bg-black/60 rounded-xl border border-white/10 flex items-center justify-center relative overflow-hidden">
              <video
                src={videoUrl}
                controls
                className="w-full h-full rounded-xl object-contain"
                poster={content.thumbnail_path}
              />
            </div>
          )}
          {!videoUrl && (
            <div className="aspect-video bg-black/40 rounded-xl border border-dashed border-white/10 flex flex-col items-center justify-center gap-2">
              <Play className="w-10 h-10 text-white/20" />
              <p className="text-xs text-muted-foreground">Vídeo não gerado ainda</p>
            </div>
          )}

          {/* Editable fields */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-white/80 text-sm">Título do vídeo</Label>
              <Input
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="bg-white/5 border-white/10 text-white"
                placeholder="Título para o YouTube (max 70 chars)"
                maxLength={100}
              />
              <p className="text-xs text-muted-foreground text-right">{title.length}/100</p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-white/80 text-sm">Descrição / SEO</Label>
              <Textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="bg-white/5 border-white/10 text-white resize-none"
                placeholder="Descrição para o YouTube. Inclua keywords, timestamps, links..."
                rows={4}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-white/80 text-sm flex items-center gap-2">
                <Calendar className="w-4 h-4" /> Agendar publicação
              </Label>
              <Input
                type="datetime-local"
                value={scheduledDate}
                onChange={e => setScheduledDate(e.target.value)}
                className="bg-white/5 border-white/10 text-white"
              />
              <p className="text-xs text-muted-foreground">
                Deixe vazio para publicar imediatamente ao aprovar.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-4 border-t border-white/10">
          <Button
            variant="ghost"
            onClick={() => onSave({ title, angle: description, scheduled_date: scheduledDate || null })}
            disabled={isSaving}
            className="text-muted-foreground hover:text-white border border-white/10"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Salvar Rascunho
          </Button>

          <div className="flex gap-2 sm:ml-auto">
            <Button
              onClick={onPublishNow}
              disabled={isSaving}
              className="bg-red-500 hover:bg-red-600 text-white gap-2"
            >
              <Youtube className="w-4 h-4" />
              Publicar Agora
            </Button>

            <Button
              onClick={handleApprove}
              disabled={isSaving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              {scheduledDate ? "Aprovar e Agendar" : "Aprovar"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Content card ─────────────────────────────────────────────────────────────

interface ContentCardProps {
  content: Content;
  onReview: (c: Content) => void;
  onQuickApprove: (c: Content) => void;
  onQuickReject: (c: Content) => void;
  isUpdating: boolean;
}

function ContentCard({ content, onReview, onQuickApprove, onQuickReject, isUpdating }: ContentCardProps) {
  const status = content.status || "draft";
  const isAwaiting = status === "awaiting_review";

  // Helper for thumbnail preview
  const videoUrl = content.video_path?.startsWith('http') 
    ? content.video_path 
    : content.video_path 
      ? supabase.storage.from('videos').getPublicUrl(content.video_path).data.publicUrl 
      : content.reference;

  return (
    <Card className={cn(
      "bg-card/30 backdrop-blur border transition-all",
      isAwaiting
        ? "border-yellow-500/30 ring-1 ring-yellow-500/10"
        : "border-white/10 hover:border-white/20"
    )}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Thumbnail / preview */}
          <div className="w-28 shrink-0 aspect-video bg-black/50 rounded-lg overflow-hidden border border-white/10 relative flex items-center justify-center">
            {videoUrl ? (
              <video src={videoUrl} className="w-full h-full object-cover" poster={content.thumbnail_path} />
            ) : (
              <Play className="w-6 h-6 text-white/20" />
            )}
            {isAwaiting && (
              <div className="absolute inset-0 bg-yellow-500/10 flex items-center justify-center">
                <span className="text-[9px] font-bold text-yellow-300 uppercase tracking-wider bg-yellow-500/30 px-1.5 py-0.5 rounded">
                  Revisar
                </span>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={cn("text-[10px] gap-1 border", STATUS_COLOR[status])}>
                {STATUS_ICON[status]}
                {STATUS_LABEL[status] || status}
              </Badge>
              {content.topic && (
                <span className="text-[10px] text-muted-foreground truncate max-w-[200px]">
                  📌 {content.topic}
                </span>
              )}
            </div>

            <h3 className="text-sm font-medium text-white leading-tight line-clamp-2">
              {content.title}
            </h3>

            <div className="flex items-center gap-3 text-[11px] text-white/30">
              {content.audio_duration && (
                <span>⏱ {Math.round(content.audio_duration)}s</span>
              )}
              {content.script && (
                <span>📄 {Math.round(content.script.length / 5)} palavras</span>
              )}
              {content.scheduled_date && (
                <span className="text-blue-400/70">
                  📅 {new Date(content.scheduled_date).toLocaleDateString("pt-BR")}
                </span>
              )}
              <span className="ml-auto">
                {new Date(content.created_at).toLocaleDateString("pt-BR")}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-1.5 shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onReview(content)}
              className="h-8 text-xs border-white/10 text-white/70 hover:text-white gap-1.5"
            >
              <Pencil className="w-3 h-3" /> Revisar
            </Button>

            {isAwaiting && (
              <>
                <Button
                  size="sm"
                  onClick={() => onQuickApprove(content)}
                  disabled={isUpdating}
                  className="h-8 text-xs bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600/30 gap-1"
                >
                  <CheckCircle2 className="w-3 h-3" /> Aprovar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onQuickReject(content)}
                  disabled={isUpdating}
                  className="h-8 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 gap-1"
                >
                  <XCircle className="w-3 h-3" /> Rejeitar
                </Button>
              </>
            )}

            {status === "approved" && (
              <Button
                size="sm"
                onClick={() => onReview(content)}
                className="h-8 text-xs bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 gap-1"
              >
                <Youtube className="w-3 h-3" /> Publicar
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main ReviewQueue component ───────────────────────────────────────────────

interface ReviewQueueProps {
  channelId: string;
}

export function ReviewQueue({ channelId }: ReviewQueueProps) {
  const { contents, isLoading, updateContent } = useContents(channelId);
  const [filter, setFilter] = useState<FilterTab>("all");
  const [reviewingContent, setReviewingContent] = useState<Content | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const awaitingCount = contents.filter(c => c.status === "awaiting_review").length;

  const filtered = filter === "all"
    ? contents
    : contents.filter(c => c.status === filter);

  const handleSave = async (updates: { title: string; angle: string; scheduled_date: string | null }) => {
    if (!reviewingContent) return;
    setIsUpdating(true);
    try {
      await updateContent.mutateAsync({
        id: reviewingContent.id,
        updates: {
          title: updates.title,
          angle: updates.angle,
          scheduled_date: updates.scheduled_date || undefined,
        },
      });
      toast.success("Conteúdo salvo.");
      setReviewingContent(null);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleApprove = async (content: Content, scheduledDate: string | null = null) => {
    setIsUpdating(true);
    try {
      await updateContent.mutateAsync({
        id: content.id,
        updates: {
          status: "approved",
          scheduled_date: scheduledDate || undefined,
        },
      });
      toast.success(scheduledDate ? "Vídeo aprovado e agendado!" : "Vídeo aprovado!");
      setReviewingContent(null);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleReject = async (content: Content) => {
    setIsUpdating(true);
    try {
      await updateContent.mutateAsync({
        id: content.id,
        updates: { status: "draft" },
      });
      toast.info("Vídeo movido para rascunho.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePublishNow = async () => {
    if (!reviewingContent) return;
    setIsUpdating(true);
    try {
      // TODO: Integrar YouTube Data API v3 aqui
      // await publishToYouTube(reviewingContent);
      await updateContent.mutateAsync({
        id: reviewingContent.id,
        updates: { status: "published" },
      });
      toast.success("Vídeo marcado como publicado!");
      setReviewingContent(null);
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-white/20" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Alert se tem itens aguardando revisão */}
      {awaitingCount > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
          <Clock className="w-4 h-4 text-yellow-400 shrink-0" />
          <p className="text-sm text-yellow-300">
            <strong>{awaitingCount}</strong> vídeo{awaitingCount > 1 ? "s" : ""} aguardando sua revisão antes de publicar.
          </p>
          <Button
            size="sm"
            variant="outline"
            className="ml-auto shrink-0 border-yellow-500/30 text-yellow-300 hover:bg-yellow-500/10 text-xs h-7"
            onClick={() => setFilter("awaiting_review")}
          >
            Ver todos
          </Button>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 bg-card/20 backdrop-blur border border-white/10 p-1 rounded-xl w-fit">
        {FILTER_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
              filter === tab.key
                ? "bg-primary text-primary-foreground shadow"
                : "text-muted-foreground hover:text-white"
            )}
          >
            {tab.label}
            {tab.key === "awaiting_review" && awaitingCount > 0 && (
              <span className="ml-1.5 bg-yellow-500 text-black text-[9px] font-bold rounded-full px-1.5 py-0.5">
                {awaitingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content list */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center bg-white/5 rounded-2xl border border-dashed border-white/10">
          <Play className="w-10 h-10 text-white/10 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">
            {filter === "awaiting_review"
              ? "Nenhum vídeo aguardando revisão."
              : filter === "approved"
              ? "Nenhum vídeo aprovado ainda."
              : filter === "published"
              ? "Nenhum vídeo publicado ainda."
              : "Nenhum conteúdo criado ainda."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(content => (
            <ContentCard
              key={content.id}
              content={content}
              onReview={setReviewingContent}
              onQuickApprove={c => handleApprove(c)}
              onQuickReject={handleReject}
              isUpdating={isUpdating}
            />
          ))}
        </div>
      )}

      {/* Review modal */}
      {reviewingContent && (
        <ReviewModal
          content={reviewingContent}
          open={!!reviewingContent}
          onClose={() => setReviewingContent(null)}
          onSave={handleSave}
          onApprove={d => handleApprove(reviewingContent, d)}
          onPublishNow={handlePublishNow}
          isSaving={isUpdating}
        />
      )}
    </div>
  );
}
