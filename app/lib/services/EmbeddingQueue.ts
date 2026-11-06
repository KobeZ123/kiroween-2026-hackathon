"use client";

import { ArticleRepo } from "@/lib/db";

export type EmbeddingStatusCallback = (status: {
  type: "MODEL_LOADING" | "MODEL_READY" | "EMBEDDING_DONE" | "EMBEDDING_ERROR";
  progress?: number;
  id?: string;
}) => void;

/**
 * EmbeddingQueue
 *
 * Manages a backlog of articles awaiting semantic embedding.
 * Spins up a Web Worker on first use and processes items lazily
 * via requestIdleCallback to avoid competing with UI work.
 */
export class EmbeddingQueue {
  private worker: Worker | null = null;
  private queue: Array<{ id: string; text: string }> = [];
  private processing = false;
  private modelReady = false;
  private articleRepo = new ArticleRepo();
  public onStatus: EmbeddingStatusCallback | null = null;

  private getWorker(): Worker {
    if (!this.worker) {
      // Next.js bundler picks up the worker via this constructor
      this.worker = new Worker(
        new URL("../workers/embedding.worker.ts", import.meta.url),
        { type: "module" }
      );

      this.worker.onmessage = (event: MessageEvent) => {
        const { type, progress, id, embedding, error } = event.data;

        if (type === "MODEL_LOADING") {
          this.onStatus?.({ type: "MODEL_LOADING", progress });
        }

        if (type === "MODEL_READY") {
          this.modelReady = true;
          this.onStatus?.({ type: "MODEL_READY" });
        }

        if (type === "EMBEDDING_DONE") {
          this.onStatus?.({ type: "EMBEDDING_DONE", id });
          // Persist embedding to IndexedDB
          if (id && embedding) {
            this.articleRepo
              .updateEmbedding(id, embedding)
              .catch((err) =>
                console.warn("[EmbeddingQueue] DB write failed:", err)
              );
          }
          this.processing = false;
          this.processNext();
        }

        if (type === "EMBEDDING_ERROR") {
          console.warn("[EmbeddingQueue] Embedding error for", id, ":", error);
          this.onStatus?.({ type: "EMBEDDING_ERROR", id });
          this.processing = false;
          this.processNext(); // skip and continue
        }
      };

      this.worker.onerror = (err) => {
        console.error("[EmbeddingQueue] Worker error:", err);
        this.processing = false;
        this.processNext();
      };
    }
    return this.worker;
  }

  /** Add an article to the embedding backlog */
  enqueue(id: string, text: string): void {
    if (typeof window === "undefined") return;
    this.queue.push({ id, text });
    this.getWorker(); // ensure worker is started
    if (!this.processing) {
      this.scheduleNext();
    }
  }

  private scheduleNext(): void {
    if (typeof requestIdleCallback !== "undefined") {
      requestIdleCallback(() => this.processNext(), { timeout: 5000 });
    } else {
      setTimeout(() => this.processNext(), 100);
    }
  }

  private processNext(): void {
    if (this.processing || this.queue.length === 0) return;
    const item = this.queue.shift()!;
    this.processing = true;
    this.getWorker().postMessage({ type: "EMBED", id: item.id, text: item.text });
  }

  get queueLength(): number {
    return this.queue.length;
  }

  get isModelReady(): boolean {
    return this.modelReady;
  }

  destroy(): void {
    this.worker?.terminate();
    this.worker = null;
    this.queue = [];
    this.processing = false;
    this.modelReady = false;
  }
}

// Singleton for app-wide use
let _instance: EmbeddingQueue | null = null;
export function getEmbeddingQueue(): EmbeddingQueue {
  if (typeof window === "undefined") {
    throw new Error("EmbeddingQueue is browser-only");
  }
  if (!_instance) _instance = new EmbeddingQueue();
  return _instance;
}
