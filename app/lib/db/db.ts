import Dexie, { type EntityTable } from "dexie";
import type {
  Article,
  Feed,
  FeedDirectoryEntry,
  UserProfile,
  CuratedCacheEntry,
  Collection,
  TelemetryRecord,
} from "./types";

// ─────────────────────────────────────────────────────────────
// Database definition
// ─────────────────────────────────────────────────────────────
class ReaderDatabase extends Dexie {
  articles!: EntityTable<Article, "id">;
  feeds!: EntityTable<Feed, "id">;
  feedDirectory!: EntityTable<FeedDirectoryEntry, "id">;
  userProfile!: EntityTable<UserProfile, "id">;
  curatedCache!: EntityTable<CuratedCacheEntry, "id">;
  collections!: EntityTable<Collection, "id">;
  telemetry!: EntityTable<TelemetryRecord, "id">;

  constructor() {
    super("ReaderEXE");

    this.version(1).stores({
      articles:
        "id, feedId, publishedAt, readAt, savedAt, readProgress, estimatedReadTime",
      feeds:
        "id, url, category, isSubscribed, subscribedAt, lastFetchedAt",
      feedDirectory:
        "id, url, title, category",
      userProfile:
        "id",
      curatedCache:
        "id, articleId, score, generatedAt",
      collections:
        "id, articleId, type, createdAt, [articleId+type]",
      telemetry:
        "id, articleId, event, timestamp",
    });
  }
}

// Singleton — safe to call from client components
let _db: ReaderDatabase | null = null;

export function getDb(): ReaderDatabase {
  if (typeof window === "undefined") {
    throw new Error("IndexedDB is only available in the browser");
  }
  if (!_db) {
    _db = new ReaderDatabase();
  }
  return _db;
}

export type { ReaderDatabase };
