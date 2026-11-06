// ─────────────────────────────────────────────────────────────
// READER.EXE — IndexedDB entity types
// ─────────────────────────────────────────────────────────────

export type FeedCategory =
  | "technology"
  | "finance"
  | "science"
  | "gaming"
  | "culture";

export type CollectionType = "bookmark" | "read" | "saved";

export type TelemetryEvent = "open" | "read_50" | "read_80" | "quick_exit";

// ── Article ────────────────────────────────────────────────────
export interface Article {
  /** Hash of feedId + item GUID */
  id: string;
  feedId: string;
  title: string;
  url: string;
  /** Raw HTML content (sanitized before render) */
  content: string;
  /** Plain-text excerpt */
  summary: string;
  publishedAt: number; // Unix ms
  readAt: number | null;
  savedAt: number | null;
  /** 0–100 */
  readProgress: number;
  /** Minutes, ceil(wordCount / 200) */
  estimatedReadTime: number;
  /** 384-dim Float32Array, null until embedded */
  embedding: number[] | null;
}

// ── Feed (subscribed) ──────────────────────────────────────────
export interface Feed {
  id: string;
  url: string;
  title: string;
  category: FeedCategory;
  favicon: string | null;
  subscribedAt: number;
  lastFetchedAt: number | null;
  isSubscribed: boolean;
}

// ── Feed Directory (predefined sources) ───────────────────────
export interface FeedDirectoryEntry {
  id: string;
  url: string;
  title: string;
  category: FeedCategory;
  description: string;
}

// ── User Profile (singleton, id = "default") ──────────────────
export interface ExplicitSignal {
  articleId: string;
  type: "more_like" | "less_like" | "bookmark";
  timestamp: number;
}

export interface UserProfile {
  id: "default";
  /** topic key → flat number[] (serialized Float32Array) */
  interestVectors: Record<string, number[]>;
  topicWeights: Record<string, number>;
  explicitSignals: ExplicitSignal[];
  telemetryEnabled: boolean;
  /** 0.0–1.0, portion of curated that is exploratory. Default 0.2 */
  diversityRatio: number;
  updatedAt: number;
}

// ── Curated Cache ──────────────────────────────────────────────
export interface CuratedCacheEntry {
  id: string;
  articleId: string;
  score: number;
  reason: string;
  /** True if sourced from outside subscribed feeds */
  isExploration: boolean;
  generatedAt: number;
}

// ── Collection ─────────────────────────────────────────────────
export interface Collection {
  /** Compound: articleId + ":" + type */
  id: string;
  articleId: string;
  type: CollectionType;
  createdAt: number;
}

// ── Telemetry ─────────────────────────────────────────────────
export interface TelemetryRecord {
  id: string;
  articleId: string;
  event: TelemetryEvent;
  timestamp: number;
}
