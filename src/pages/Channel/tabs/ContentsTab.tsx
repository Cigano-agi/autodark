import { useNavigate } from "react-router-dom";
import { ReviewQueue } from "@/components/Channel/ReviewQueue";
import { Button } from "@/components/ui/button";
import { Video, Wand2 } from "lucide-react";

interface ContentsTabProps {
  channelId: string;
}

export function ContentsTab({ channelId }: ContentsTabProps) {
  const navigate = useNavigate();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Video className="w-5 h-5 text-primary" /> Conteúdos
        </h2>
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => navigate(`/channel/${channelId}/production`)}
            className="gap-1.5 bg-primary/20 text-primary hover:bg-primary/30 border border-primary/20 text-xs h-8"
          >
            <Video className="w-3.5 h-3.5" /> Novo Vídeo
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate(`/channel/${channelId}/studio`)}
            className="gap-1.5 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 text-xs h-8"
          >
            <Wand2 className="w-3.5 h-3.5" /> Studio Longo
          </Button>
        </div>
      </div>

      <ReviewQueue channelId={channelId} />
    </div>
  );
}
