/// <reference lib="webworker" />

/**
 * Embedding Web Worker
 * Loads Xenova/all-MiniLM-L6-v2 and processes EMBED messages.
 *
 * Message protocol:
 *   Receives: { type: 'EMBED', id: string, text: string }
 *   Sends:    { type: 'EMBEDDING_DONE', id: string, embedding: number[] }
 *             { type: 'MODEL_LOADING', progress: number }
 *             { type: 'MODEL_READY' }
 *             { type: 'EMBEDDING_ERROR', id: string, error: string }
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { pipeline, env } = require("@xenova/transformers");

// Allow downloading the model from the CDN
env.allowLocalModels = false;

type EmbeddingPipeline = Awaited<ReturnType<typeof pipeline>>;

let embedder: EmbeddingPipeline | null = null;
let modelLoading = false;
const pendingQueue: Array<{ id: string; text: string }> = [];

async function loadModel() {
  if (embedder || modelLoading) return;
  modelLoading = true;

  try {
    embedder = await pipeline(
      "feature-extraction",
      "Xenova/all-MiniLM-L6-v2",
      {
        progress_callback: (progress: { progress?: number }) => {
          if (progress.progress !== undefined) {
            self.postMessage({
              type: "MODEL_LOADING",
              progress: Math.round(progress.progress),
            });
          }
        },
      }
    );
    modelLoading = false;
    self.postMessage({ type: "MODEL_READY" });

    // Process any messages that arrived while model was loading
    for (const item of pendingQueue) {
      await processEmbed(item.id, item.text);
    }
    pendingQueue.length = 0;
  } catch (err) {
    modelLoading = false;
    console.error("[embedding.worker] Failed to load model:", err);
  }
}

async function processEmbed(id: string, text: string) {
  if (!embedder) return;
  try {
    // Truncate to ~512 tokens worth of characters (~2000 chars)
    const truncated = text.slice(0, 2000);
    const output = await embedder(truncated, {
      pooling: "mean",
      normalize: true,
    }) as { data: Float32Array };

    // output.data is a Float32Array — convert to plain number[]
    const embedding = Array.from(output.data);

    self.postMessage({ type: "EMBEDDING_DONE", id, embedding });
  } catch (err) {
    self.postMessage({
      type: "EMBEDDING_ERROR",
      id,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

self.addEventListener("message", async (event: MessageEvent) => {
  const { type, id, text } = event.data as {
    type: string;
    id: string;
    text: string;
  };

  if (type === "EMBED") {
    if (!embedder) {
      if (!modelLoading) {
        loadModel(); // start loading, will process pending queue when done
      }
      pendingQueue.push({ id, text });
    } else {
      await processEmbed(id, text);
    }
  }
});

// Start loading on worker creation
loadModel();
