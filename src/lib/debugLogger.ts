/**
 * Debug Logger — accumulates pipeline trace steps in memory,
 * then persists the full trace to pipeline_traces DB table on completion.
 * Also provides Markdown export for AI-agent consumption.
 */

import { supabase } from "@/integrations/supabase/client";
import type { TraceContext, TraceStep } from "./traceContext";

// ── Step logging ──────────────────────────────────────────────

/** Wrap an async pipeline step with timing + status tracking */
export async function logStep<T>(
  ctx: TraceContext,
  stepName: string,
  fn: () => Promise<T>,
  opts?: { provider?: string },
): Promise<T> {
  const startedAt = new Date().toISOString();
  const t0 = performance.now();

  try {
    const result = await fn();
    const durationMs = Math.round(performance.now() - t0);

    ctx.steps.push({
      step: stepName,
      status: "ok",
      startedAt,
      finishedAt: new Date().toISOString(),
      durationMs,
      provider: opts?.provider,
    });

    return result;
  } catch (err) {
    const durationMs = Math.round(performance.now() - t0);
    const errorMsg = err instanceof Error ? err.message : String(err);

    ctx.steps.push({
      step: stepName,
      status: "fail",
      startedAt,
      finishedAt: new Date().toISOString(),
      durationMs,
      provider: opts?.provider,
      error: errorMsg,
    });

    throw err; // re-throw so pipeline can handle it
  }
}

/** Log a step that was skipped (e.g. blocked by prior failure) */
export function logSkip(ctx: TraceContext, stepName: string, reason: string) {
  const now = new Date().toISOString();
  ctx.steps.push({
    step: stepName,
    status: "skip",
    startedAt: now,
    finishedAt: now,
    durationMs: 0,
    details: reason,
  });
}

/** Log a warning on an existing step (e.g. fallback was used) */
export function logWarn(
  ctx: TraceContext,
  stepName: string,
  details: string,
  fallbackUsed?: string,
) {
  const existing = ctx.steps.find(s => s.step === stepName);
  if (existing) {
    existing.status = "warn";
    existing.details = details;
    if (fallbackUsed) existing.fallbackUsed = fallbackUsed;
  }
}

// ── Edge function debug metadata ──────────────────────────────

export interface EdgeDebug {
  provider: string;
  latencyMs: number;
  fallbackUsed?: string;
  attempts: number;
  status: number;
}

/** Parse _debug from edge function response and log it to trace */
export function logEdgeCall(
  ctx: TraceContext,
  stepName: string,
  debug: EdgeDebug,
) {
  const existing = ctx.steps.find(s => s.step === stepName);
  if (existing) {
    existing.provider = debug.provider;
    if (debug.fallbackUsed) {
      existing.status = "warn";
      existing.fallbackUsed = debug.fallbackUsed;
      existing.details = `Fallback: ${debug.fallbackUsed} after ${debug.attempts} attempts`;
    }
  }
}

// ── Persist trace to DB ───────────────────────────────────────

export async function persistTrace(
  ctx: TraceContext,
  finalStatus: "ok" | "warn" | "fail",
): Promise<void> {
  const finishedAt = new Date().toISOString();
  const errorSummary = ctx.steps
    .filter(s => s.status === "fail")
    .map(s => `${s.step}: ${s.error}`)
    .join("; ");

  try {
    await (supabase.from as any)("pipeline_traces").insert({
      channel_id: ctx.channelId,
      content_id: ctx.contentId,
      trace_id: ctx.traceId,
      started_at: ctx.startedAt,
      finished_at: finishedAt,
      status: finalStatus,
      steps: ctx.steps,
      error_summary: errorSummary || null,
    });
  } catch (e) {
    console.error("[debugLogger] Failed to persist trace:", e);
  }
}

// ── Markdown export ───────────────────────────────────────────

export function traceToMarkdown(ctx: TraceContext, finalStatus: string): string {
  const finishedAt = new Date().toISOString();
  const lines: string[] = [
    `### Run: ${ctx.traceId} | ${ctx.startedAt} | Channel: ${ctx.channelName || ctx.channelId}`,
    "",
    "| Step | Status | Duration | Provider | Details |",
    "|------|--------|----------|----------|---------|",
  ];

  for (const s of ctx.steps) {
    const dur = s.durationMs > 0 ? `${s.durationMs}ms` : "--";
    const prov = s.provider || "--";
    const det = [s.details, s.fallbackUsed ? `fallback=${s.fallbackUsed}` : "", s.error]
      .filter(Boolean)
      .join("; ") || "--";
    lines.push(`| ${s.step} | ${s.status.toUpperCase()} | ${dur} | ${prov} | ${det} |`);
  }

  const errors = ctx.steps.filter(s => s.status === "fail");
  if (errors.length > 0) {
    lines.push("");
    lines.push(`**Error:** ${errors.map(e => `${e.step}: ${e.error}`).join(" | ")}`);
  }

  lines.push("");
  lines.push(`**Final status:** ${finalStatus} | **Finished:** ${finishedAt}`);
  lines.push("");
  lines.push("---");
  lines.push("");

  return lines.join("\n");
}
