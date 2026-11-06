"use client";

import { useEffect, useState } from "react";
import { getEmbeddingQueue } from "@/lib/services/EmbeddingQueue";
import type { EmbeddingStatusCallback } from "@/lib/services/EmbeddingQueue";
import { getFeedIngestionService } from "@/lib/services/FeedIngestionService";

export type EmbeddingPhase = "idle" | "loading_model" | "ready" | "processing";

export interface EmbeddingStatus {
  phase: EmbeddingPhase;
  modelProgress: number; // 0–100
  queueLength: number;
}

/**
 * Initializes the embedding queue and wires it to the feed ingestion service.
 * Returns live status for the UI status bar.
 */
export function useEmbeddingStatus(): EmbeddingStatus {
  const [status, setStatus] = useState<EmbeddingStatus>({
    phase: "idle",
    modelProgress: 0,
    queueLength: 0,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    let queue: ReturnType<typeof getEmbeddingQueue>;
    try {
      queue = getEmbeddingQueue();
    } catch {
      return;
    }

    const ingestion = getFeedIngestionService();

    // Wire new articles from ingestion → embedding queue
    ingestion.onNewArticles = (id, text) => {
      queue.enqueue(id, text);
      setStatus((prev) => ({
        ...prev,
        queueLength: queue.queueLength,
        phase: prev.phase === "ready" ? "processing" : prev.phase,
      }));
    };

    const handleStatus: EmbeddingStatusCallback = ({ type, progress }) => {
      if (type === "MODEL_LOADING") {
        setStatus((prev) => ({
          ...prev,
          phase: "loading_model",
          modelProgress: progress ?? prev.modelProgress,
        }));
      }
      if (type === "MODEL_READY") {
        setStatus((prev) => ({ ...prev, phase: "ready", modelProgress: 100 }));
      }
      if (type === "EMBEDDING_DONE") {
        setStatus((prev) => ({
          ...prev,
          phase: queue.queueLength > 0 ? "processing" : "ready",
          queueLength: queue.queueLength,
        }));
      }
      if (type === "EMBEDDING_ERROR") {
        setStatus((prev) => ({
          ...prev,
          phase: queue.queueLength > 0 ? "processing" : "ready",
          queueLength: queue.queueLength,
        }));
      }
    };

    queue.onStatus = handleStatus;

    // Start the queue (loads model in background)
    setStatus({ phase: "loading_model", modelProgress: 0, queueLength: 0 });

    return () => {
      if (ingestion.onNewArticles) ingestion.onNewArticles = null;
      if (queue.onStatus) queue.onStatus = null;
    };
  }, []);

  return status;
}
