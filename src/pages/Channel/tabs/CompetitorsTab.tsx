import { CompetitorMonitor } from "@/components/Strategy/CompetitorMonitor";
import { Users } from "lucide-react";

interface CompetitorsTabProps {
  channelId: string;
}

export function CompetitorsTab({ channelId }: CompetitorsTabProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" /> Concorrentes
        </h2>
      </div>
      <CompetitorMonitor channelId={channelId} />
    </div>
  );
}
