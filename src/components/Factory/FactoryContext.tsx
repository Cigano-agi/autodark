import React, { createContext, useContext, ReactNode, useMemo } from "react";
import { usePipelineOrchestrator } from "@/agents/pipelineOrchestrator";
import { useChannel } from "@/hooks/useChannels";
import { useBlueprint } from "@/hooks/useBlueprint";
import { useChannelFoundation } from "@/hooks/useChannelFoundation";
import { PipelineState, GeneratedIdea, VideoLanguage } from "@/agents/types";

interface FactoryContextProps {
  channelId: string;
  state: PipelineState;
  runTrends: () => Promise<any>;
  runIdeas: () => Promise<any>;
  runSemiAuto: (approvedIdea: GeneratedIdea, language?: VideoLanguage, durationMin?: number) => Promise<void>;
  reset: () => void;
  resetProductionState: () => void;
  channel: any;
  blueprint: any;
  foundation: any;
}

const FactoryContext = createContext<FactoryContextProps | undefined>(undefined);

export function FactoryProvider({ channelId, children }: { channelId: string; children: ReactNode }) {
  const { data: channel } = useChannel(channelId);
  const { blueprint } = useBlueprint(channelId);
  const { data: foundation } = useChannelFoundation(channelId);
  const orchestrator = usePipelineOrchestrator(channelId, channel, blueprint, foundation);

  const value = useMemo(() => ({
    channelId,
    ...orchestrator,
    channel,
    blueprint,
    foundation,
  }), [channelId, orchestrator, channel, blueprint, foundation]);

  return <FactoryContext.Provider value={value}>{children}</FactoryContext.Provider>;
}

export function useFactory() {
  const context = useContext(FactoryContext);
  if (!context) {
    throw new Error("useFactory deve ser utilizado dentro de um FactoryProvider. Uplink não estabelecido.");
  }
  return context;
}
