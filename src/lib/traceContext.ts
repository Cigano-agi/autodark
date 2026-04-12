/** Trace context for pipeline execution logging */

export interface TraceStep {
  step: string;
  status: "ok" | "warn" | "fail" | "skip";
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  provider?: string;
  fallbackUsed?: string;
  details?: string;
  error?: string;
}

export interface TraceContext {
  traceId: string;
  channelId: string;
  contentId: string | null;
  channelName?: string;
  startedAt: string;
  steps: TraceStep[];
}

export function createTraceId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).substring(2, 8);
  return `${ts}-${rand}`;
}

export function createTraceContext(
  channelId: string,
  channelName?: string,
): TraceContext {
  return {
    traceId: createTraceId(),
    channelId,
    contentId: null,
    channelName,
    startedAt: new Date().toISOString(),
    steps: [],
  };
}
