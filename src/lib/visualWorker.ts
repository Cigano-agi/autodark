import { supabase } from "@/integrations/supabase/client";
import type { SceneSnapshot } from "@/hooks/useProductionState";

const MAX_ITERATIONS = 50; // Proteção contra loop infinito
const BATCH_PAUSE_MS = 2_000; // Pausa entre batches para não saturar a API

interface WorkerBatchResult {
  processed: number;
  succeeded: number;
  remaining: number;
}

/**
 * Invoca a Edge Function worker-generate-visuals em loop até esvaziar a fila.
 *
 * - Cada invocação processa até 5 cenas pending.
 * - Loop termina quando o worker retorna { remaining: 0 }.
 * - Proteção: máximo MAX_ITERATIONS iterações para evitar loop eterno.
 * - A UI atualiza via Realtime (useProductionState) — este loop é apenas o gatilho.
 *
 * @param channelId UUID do canal sendo processado
 * @param onProgress Callback opcional chamado após cada batch com contagem de cenas restantes
 * @returns Número total de cenas geradas com sucesso
 */
export async function runVisualWorker(
  channelId: string,
  onProgress?: (remaining: number) => void,
): Promise<number> {
  let totalSucceeded = 0;
  let iterations = 0;

  console.log(`[visualWorker] Iniciando ping loop para channel=${channelId}`);

  while (iterations < MAX_ITERATIONS) {
    iterations++;

    let result: WorkerBatchResult;
    try {
      const { data, error } = await supabase.functions.invoke<WorkerBatchResult>(
        "worker-generate-visuals",
        { body: { channel_id: channelId } }
      );

      if (error) {
        console.error(`[visualWorker] Erro na invocação do worker (iter ${iterations}):`, error.message);
        // Não abortar no primeiro erro — o worker pode estar temporariamente indisponível
        // Aguardar e tentar novamente na próxima iteração
        await pause(BATCH_PAUSE_MS);
        continue;
      }

      result = data!;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[visualWorker] Exceção na invocação (iter ${iterations}):`, msg);
      await pause(BATCH_PAUSE_MS);
      continue;
    }

    totalSucceeded += result.succeeded ?? 0;
    const remaining = result.remaining ?? 0;

    console.log(
      `[visualWorker] iter=${iterations} processed=${result.processed} succeeded=${result.succeeded} remaining=${remaining}`
    );

    onProgress?.(remaining);

    if (remaining === 0) {
      console.log(`[visualWorker] Fila esvaziada após ${iterations} iterações. Total gerado: ${totalSucceeded}`);
      break;
    }

    // Pausa entre batches para não sobrecarregar a API AI33
    await pause(BATCH_PAUSE_MS);
  }

  if (iterations >= MAX_ITERATIONS) {
    console.warn(`[visualWorker] Limite de ${MAX_ITERATIONS} iterações atingido — possível loop infinito evitado`);
  }

  return totalSucceeded;
}

/**
 * Verifica se há cenas pending ou processing para um canal.
 * Usado pelo orchestrator ao montar o componente para decidir se deve retomar o worker.
 *
 * @param scenes Array de SceneSnapshot do production_state atual
 */
export function hasUnfinishedVisuals(scenes: SceneSnapshot[]): boolean {
  return scenes.some(s => s.status === "pending" || s.status === "processing");
}

function pause(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}
