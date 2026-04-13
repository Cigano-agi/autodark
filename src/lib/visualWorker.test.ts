import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock do módulo supabase para evitar chamadas reais
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
  },
}));

import { supabase } from "@/integrations/supabase/client";
import { runVisualWorker, hasUnfinishedVisuals } from "./visualWorker";

const mockInvoke = supabase.functions.invoke as ReturnType<typeof vi.fn>;

describe("runVisualWorker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("para imediatamente quando não há cenas pending (remaining = 0)", async () => {
    mockInvoke.mockResolvedValueOnce({
      data: { processed: 0, succeeded: 0, remaining: 0 },
      error: null,
    });

    const result = await runVisualWorker("test-channel-id");
    expect(mockInvoke).toHaveBeenCalledTimes(1);
    expect(result).toBe(0);
  });

  it("continua o loop enquanto remaining > 0", async () => {
    // Batch 1: processa 5, sobram 3
    mockInvoke.mockResolvedValueOnce({
      data: { processed: 5, succeeded: 5, remaining: 3 },
      error: null,
    });
    // Batch 2: processa 3, sobram 0
    mockInvoke.mockResolvedValueOnce({
      data: { processed: 3, succeeded: 3, remaining: 0 },
      error: null,
    });

    const result = await runVisualWorker("test-channel-id");
    expect(mockInvoke).toHaveBeenCalledTimes(2);
    expect(result).toBe(8); // 5 + 3 succeeded
  });

  it("continua após erro temporário no worker", async () => {
    // Primeira invocação: erro de rede
    mockInvoke.mockResolvedValueOnce({
      data: null,
      error: { message: "Network error" },
    });
    // Segunda invocação: sucesso, fila vazia
    mockInvoke.mockResolvedValueOnce({
      data: { processed: 2, succeeded: 2, remaining: 0 },
      error: null,
    });

    const result = await runVisualWorker("test-channel-id");
    expect(mockInvoke).toHaveBeenCalledTimes(2);
    expect(result).toBe(2);
  });

  it("invoca onProgress com o número de cenas restantes", async () => {
    mockInvoke.mockResolvedValueOnce({
      data: { processed: 5, succeeded: 5, remaining: 2 },
      error: null,
    });
    mockInvoke.mockResolvedValueOnce({
      data: { processed: 2, succeeded: 2, remaining: 0 },
      error: null,
    });

    const onProgress = vi.fn();
    await runVisualWorker("test-channel-id", onProgress);

    expect(onProgress).toHaveBeenCalledWith(2);
    expect(onProgress).toHaveBeenCalledWith(0);
  });
});

describe("hasUnfinishedVisuals", () => {
  it("retorna true se há cenas pending", () => {
    const scenes = [
      { chapterIndex: 0, sceneIndex: 0, status: "visual_done" as const },
      { chapterIndex: 0, sceneIndex: 1, status: "pending" as const },
    ];
    expect(hasUnfinishedVisuals(scenes)).toBe(true);
  });

  it("retorna true se há cenas processing", () => {
    const scenes = [
      { chapterIndex: 0, sceneIndex: 0, status: "processing" as const },
    ];
    expect(hasUnfinishedVisuals(scenes)).toBe(true);
  });

  it("retorna false quando todas as cenas estão done ou error", () => {
    const scenes = [
      { chapterIndex: 0, sceneIndex: 0, status: "visual_done" as const },
      { chapterIndex: 0, sceneIndex: 1, status: "error" as const },
      { chapterIndex: 0, sceneIndex: 2, status: "complete" as const },
    ];
    expect(hasUnfinishedVisuals(scenes)).toBe(false);
  });

  it("retorna false para array vazio", () => {
    expect(hasUnfinishedVisuals([])).toBe(false);
  });
});
