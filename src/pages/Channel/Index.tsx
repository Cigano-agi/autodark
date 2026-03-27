import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useChannels } from "@/hooks/useChannels";
import { useContents } from "@/hooks/useContents";
import { useContentIdeas } from "@/hooks/useContentIdeas";
import { useHeadAgent } from "@/hooks/useHeadAgent";
import { useYouTubeMetrics } from "@/hooks/useYouTubeMetrics";
import { ConnectYouTubeModal } from "@/components/YouTube/ConnectYouTubeModal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users, Video, Settings, Terminal,
  Wand2, Zap, Lightbulb, BarChart3,
} from "lucide-react";

// Sub-components
import { ChannelHeaderCard } from "./components/ChannelHeaderCard";
import { DashboardTab } from "./tabs/DashboardTab";
import { IdeasTab } from "./tabs/IdeasTab";
import { ContentsTab } from "./tabs/ContentsTab";
import { PipelineTab } from "./tabs/PipelineTab";
import { CompetitorsTab } from "./tabs/CompetitorsTab";
import { BlueprintTab } from "./tabs/BlueprintTab";
import { SettingsTab } from "./tabs/SettingsTab";

export default function ChannelView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") || "dashboard";
  const { channels } = useChannels();
  const channel = channels?.find(c => c.id === id);

  const { contents } = useContents(id);
  const { ideas } = useContentIdeas(id);
  const { generateStrategy, isLoading: isAiLoading } = useHeadAgent();
  const { connectWithApify, syncMetrics } = useYouTubeMetrics();

  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);

  // Auto-sync: scrape YouTube metrics if stale (>24h)
  useEffect(() => {
    const raw = channel as Record<string, unknown> | undefined;
    if (raw?.youtube_channel_id) {
      const lastScraped = raw.last_scraped_at ? new Date(raw.last_scraped_at as string) : new Date(0);
      const hoursSince = (Date.now() - lastScraped.getTime()) / (1000 * 60 * 60);
      if (hoursSince > 24 && !syncMetrics.isPending) {
        syncMetrics.mutate({
          channelId: channel!.id,
          youtubeUrl: channel!.youtube_username ? `https://youtube.com/@${channel!.youtube_username}` : '',
        });
      }
    }
  }, [channel?.id]);

  if (!channel || !id) return null;

  const totalContents = contents?.length || 0;
  const doneContents = contents?.filter(c => c.status === 'tts_done' || c.status === 'published').length || 0;

  return (
    <main className="pt-28 pb-12 px-6 max-w-7xl mx-auto min-h-screen relative z-10 text-foreground">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <button
          onClick={() => navigate('/dashboard')}
          className="hover:text-white transition-colors flex items-center gap-1.5"
        >
          ← Meus Canais
        </button>
        <span>/</span>
        <span className="text-white">{channel.name}</span>
      </div>

      {/* Connect YouTube Modal */}
      <ConnectYouTubeModal
        open={isConnectModalOpen}
        onOpenChange={setIsConnectModalOpen}
        onConnect={async (url) => { await connectWithApify.mutateAsync({ channelId: channel.id, youtubeUrl: url }); }}
        isConnecting={connectWithApify.isPending}
      />

      {/* Channel Header */}
      <ChannelHeaderCard
        channel={channel}
        doneContents={doneContents}
        totalContents={totalContents}
        isConnecting={connectWithApify.isPending}
        isSyncing={syncMetrics.isPending}
        isAiLoading={isAiLoading}
        onConnect={() => setIsConnectModalOpen(true)}
        onSync={() => syncMetrics.mutate({ channelId: channel.id, youtubeUrl: channel.youtube_username ? `https://youtube.com/@${channel.youtube_username}` : '' })}
        onNewVideo={() => navigate(`/channel/${id}/production`)}
        onStudio={() => navigate(`/channel/${id}/studio`)}
        onHeadAgent={() => generateStrategy(id)}
      />

      {/* Tabs */}
      <Tabs
        defaultValue={initialTab}
        className="space-y-8"
        onValueChange={(value) => {
          if (value === "prompts") navigate(`/channel/${id}/prompts`);
        }}
      >
        <TabsList className="bg-card/30 backdrop-blur border border-white/10 p-1 flex flex-wrap gap-1 h-auto rounded-xl">
          <TabsTrigger value="dashboard" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <BarChart3 className="w-4 h-4" /> Dashboard
          </TabsTrigger>
          <TabsTrigger value="ideas" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Lightbulb className="w-4 h-4" /> Ideias AI ({ideas.length})
          </TabsTrigger>
          <TabsTrigger value="videos" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Video className="w-4 h-4" /> Conteúdos
          </TabsTrigger>
          <TabsTrigger value="pipeline" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Zap className="w-4 h-4" /> Pipeline
          </TabsTrigger>
          <TabsTrigger value="competitors" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Users className="w-4 h-4" /> Concorrentes
          </TabsTrigger>
          <TabsTrigger value="prompts" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Terminal className="w-4 h-4" /> Prompts
          </TabsTrigger>
          <TabsTrigger value="blueprint" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Wand2 className="w-4 h-4" /> Blueprint
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Settings className="w-4 h-4" /> Configurações
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="focus-visible:outline-none">
          <DashboardTab channelId={id} channel={channel} />
        </TabsContent>

        <TabsContent value="ideas" className="focus-visible:outline-none">
          <IdeasTab channelId={id} />
        </TabsContent>

        <TabsContent value="videos" className="focus-visible:outline-none">
          <ContentsTab channelId={id} />
        </TabsContent>

        <TabsContent value="pipeline" className="focus-visible:outline-none">
          <PipelineTab channelId={id} />
        </TabsContent>

        <TabsContent value="competitors" className="focus-visible:outline-none">
          <CompetitorsTab channelId={id} />
        </TabsContent>

        <TabsContent value="blueprint" className="focus-visible:outline-none">
          <BlueprintTab channelId={id} />
        </TabsContent>

        <TabsContent value="settings" className="focus-visible:outline-none">
          <SettingsTab channelId={id} channel={channel} />
        </TabsContent>
      </Tabs>
    </main>
  );
}
