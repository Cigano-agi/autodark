import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useChannels } from "@/hooks/useChannels";
import { useContents } from "@/hooks/useContents";
import { useContentIdeas } from "@/hooks/useContentIdeas";
import { useHeadAgent } from "@/hooks/useHeadAgent";
import { useYouTubeMetrics } from "@/hooks/useYouTubeMetrics";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users, Settings, Lightbulb, Zap, Activity, ChevronLeft
} from "lucide-react";

// Sub-components
import { ChannelHeaderCard } from "./components/ChannelHeaderCard";
import { DashboardTab } from "./tabs/DashboardTab";
import { IdeasTab } from "./tabs/IdeasTab";
import { QueueTab } from "./tabs/QueueTab";
import { CompetitorsTab } from "./tabs/CompetitorsTab";
import { ConfigTab } from "./tabs/ConfigTab";
import { useChannelFoundation } from "@/hooks/useChannelFoundation";
import { useBlueprint } from "@/hooks/useBlueprint";
import { ChannelSetupBanner } from "@/components/Channel/ChannelSetupBanner";
import { ConnectYouTubeModal } from "@/components/YouTube/ConnectYouTubeModal";

export default function ChannelView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "dashboard";
  const { channels } = useChannels();
  const channel = channels?.find(c => c.id === id);

  const { contents } = useContents(id);
  const { ideas } = useContentIdeas(id);
  const { blueprint } = useBlueprint(id);
  const { data: foundation } = useChannelFoundation(id || "");
  const { generateStrategy, isLoading: isAiLoading } = useHeadAgent();
  const { connectWithApify, syncMetrics } = useYouTubeMetrics();

  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);

  // Setup status calculation
  const hubData = localStorage.getItem("autodark_hub_defaults_v2");
  const hasHub = hubData ? !!JSON.parse(hubData)[id || ""] : false;
  
  const setupStatus = {
    foundation: !!foundation?.is_complete,
    blueprint: !!(blueprint?.persona_prompt && blueprint?.visual_style),
    hub: hasHub
  };

  if (!channel || !id) return null;

  const totalContents = contents?.length || 0;
  const doneContents = contents?.filter(c => c.status === 'tts_done' || c.status === 'published').length || 0;

  return (
    <div className="pt-32 pb-20 px-6 md:px-12 w-full min-h-screen">
      <div className="max-w-7xl mx-auto space-y-10 animate-fade-in">

        {/* Breadcrumb */}
        <div className="flex items-center gap-3 text-sm text-muted-foreground mb-8 ml-1">
          <button
            onClick={() => navigate('/dashboard')}
            className="hover:text-primary transition-all flex items-center gap-2 group"
          >
            <div className="p-1.5 rounded-lg bg-secondary border border-border group-hover:border-primary/50 transition-all">
              <ChevronLeft className="w-4 h-4 text-foreground" />
            </div>
            Dashboard
          </button>
          <span className="opacity-20">/</span>
          <span className="text-foreground font-black uppercase tracking-widest text-[10px] italic">{channel.name}</span>
        </div>

        {/* Setup Assistant */}
        <ChannelSetupBanner channelId={id} setupStatus={setupStatus} />

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
          onStudio={() => navigate(`/channel/${id}/videos`)}
          onHeadAgent={() => generateStrategy(id)}
        />

        {/* Navigation Tabs */}
        <Tabs 
          value={activeTab} 
          onValueChange={(val) => {
            navigate(`/channel/${id}?tab=${val}`, { replace: true });
          }}
          className="space-y-10"
        >
          <div className="flex items-center justify-between border-b border-border pb-2">
            <TabsList className="bg-transparent h-auto p-0 gap-8">
              {[
                { value: "dashboard", label: "Analytics", icon: Activity },
                { value: "ideas", label: "Estratégia", icon: Lightbulb, count: ideas.length },
                { value: "queue", label: "Fábrica", icon: Zap, count: contents?.length },
                { value: "competitors", label: "Concorrentes", icon: Users },
                { value: "config", label: "Configuração", icon: Settings },
              ].map((t) => (
                <TabsTrigger 
                  key={t.value}
                  value={t.value} 
                  className="data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-primary rounded-none px-0 pb-4 h-auto gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground transition-all relative group"
                >
                  <t.icon className="w-3.5 h-3.5" />
                  {t.label}
                  {t.count !== undefined && (
                    <span className="ml-1 text-primary opacity-50">[{t.count}]</span>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <TabsContent value="dashboard" className="focus-visible:outline-none animate-in fade-in slide-in-from-bottom-4 duration-500">
            <DashboardTab channelId={id} channel={channel} />
          </TabsContent>

          <TabsContent value="ideas" className="focus-visible:outline-none animate-in fade-in slide-in-from-bottom-4 duration-500">
            <IdeasTab channelId={id} />
          </TabsContent>

          <TabsContent value="queue" className="focus-visible:outline-none animate-in fade-in slide-in-from-bottom-4 duration-500">
            <QueueTab channelId={id} />
          </TabsContent>

          <TabsContent value="competitors" className="focus-visible:outline-none animate-in fade-in slide-in-from-bottom-4 duration-500">
            <CompetitorsTab channelId={id} />
          </TabsContent>

          <TabsContent value="config" className="focus-visible:outline-none animate-in fade-in slide-in-from-bottom-4 duration-500">
            <ConfigTab channelId={id} channel={channel} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
