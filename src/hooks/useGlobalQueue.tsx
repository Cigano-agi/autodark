import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface GlobalQueueItem {
  id: string;
  title: string;
  topic: string | null;
  status: string;
  created_at: string;
  channel_id: string;
  channel_name: string;
  channel_niche: string;
  reference: string | null;  // video URL
}

export interface ChannelQueueCount {
  channel_id: string;
  pending_review: number;
  in_production: number;  // draft + tts_done
}

export function useGlobalQueue() {
  // Fetch all awaiting_review contents across all channels
  const { data: queueItems = [], isLoading: queueLoading } = useQuery({
    queryKey: ["global_queue"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("channel_contents")
        .select(`
          id, title, topic, status, created_at, channel_id, reference,
          channels!channel_id(name, niche)
        `)
        .eq("status", "awaiting_review")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []).map((row: any) => ({
        id: row.id,
        title: row.title,
        topic: row.topic,
        status: row.status,
        created_at: row.created_at,
        channel_id: row.channel_id,
        channel_name: row.channels?.name || "Canal",
        channel_niche: row.channels?.niche || "",
        reference: row.reference,
      })) as GlobalQueueItem[];
    },
  });

  // Fetch counts per channel (all non-published, non-approved)
  const { data: channelCounts = [] } = useQuery({
    queryKey: ["channel_queue_counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("channel_contents")
        .select("channel_id, status")
        .in("status", ["awaiting_review", "draft", "tts_done"]);

      if (error) throw error;

      const countMap = new Map<string, ChannelQueueCount>();
      for (const row of data || []) {
        if (!countMap.has(row.channel_id)) {
          countMap.set(row.channel_id, { channel_id: row.channel_id, pending_review: 0, in_production: 0 });
        }
        const entry = countMap.get(row.channel_id)!;
        if (row.status === "awaiting_review") {
          entry.pending_review++;
        } else {
          entry.in_production++;
        }
      }
      return Array.from(countMap.values()) as ChannelQueueCount[];
    },
  });

  return { queueItems, queueLoading, channelCounts };
}
