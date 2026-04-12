import { useState } from "react";
import { Link } from "react-router-dom";
import { BlueprintTab } from "./BlueprintTab";
import { SettingsTab } from "./SettingsTab";
import type { Channel } from "@/hooks/useChannels";
import { Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ConfigTabProps {
  channelId: string;
  channel: Channel;
}

type Section = "blueprint" | "settings";

export function ConfigTab({ channelId, channel }: ConfigTabProps) {
  const [section, setSection] = useState<Section>("blueprint");

  return (
    <div className="space-y-6">
      {/* Sub-nav */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setSection("blueprint")}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors border ${
            section === "blueprint"
              ? "bg-primary text-primary-foreground border-primary"
              : "border-white/10 text-muted-foreground hover:text-white"
          }`}
        >
          Blueprint
        </button>
        <button
          onClick={() => setSection("settings")}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors border ${
            section === "settings"
              ? "bg-primary text-primary-foreground border-primary"
              : "border-white/10 text-muted-foreground hover:text-white"
          }`}
        >
          Configurações
        </button>
        <Link
          to={`/channel/${channelId}/prompts`}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium border border-white/10 text-muted-foreground hover:text-white transition-colors ml-auto"
        >
          <Terminal className="w-3.5 h-3.5" /> Prompts
        </Link>
      </div>

      {section === "blueprint" && <BlueprintTab channelId={channelId} />}
      {section === "settings" && <SettingsTab channelId={channelId} channel={channel} />}
    </div>
  );
}
