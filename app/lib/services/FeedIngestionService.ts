import { ArticleRepo, FeedRepo } from "@/lib/db";
import type { Article } from "@/lib/db";
import type { NormalizedFeedItem } from "@/app/api/feed/route";

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

/** Simple hash: djb2 on a string */
function hashString(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h) ^ s.charCodeAt(i);
  }
  return (h >>> 0).toString(36);
}

/** Derive a stable article ID from feedId + item guid */
function articleId(feedId: string, guid: string): string {
  return hashString(`${feedId}::${guid}`);
}

/** Strip HTML tags to get plain text */
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

/** Estimate reading time in minutes from plain text */
export function estimateReadTime(text: string): number {
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(wordCount / 200));
}

// ─────────────────────────────────────────────────────────────
// FeedIngestionService
// ─────────────────────────────────────────────────────────────

export type EmbedEnqueueFn = (id: string, text: string) => void;

export class FeedIngestionService {
  private articleRepo = new ArticleRepo();
  private feedRepo = new FeedRepo();
  private pollingIntervals = new Map<string, ReturnType<typeof setInterval>>();
  /** Optional hook to enqueue articles for embedding after ingestion */
  public onNewArticles: EmbedEnqueueFn | null = null;

  /**
   * Fetches a single feed and writes new articles to IndexedDB.
   * Returns the count of newly written articles.
   */
  async fetchAndIngest(feedId: string): Promise<number> {
    const feed = await this.feedRepo.getById(feedId);
    if (!feed) throw new Error(`Feed not found: ${feedId}`);

    let data: { items: NormalizedFeedItem[] };
    try {
      const res = await fetch(
        `/api/feed?url=${encodeURIComponent(feed.url)}`
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      data = await res.json();
    } catch (err) {
      console.warn(`[FeedIngestionService] Failed to fetch ${feed.url}:`, err);
      return 0;
    }

    const incomingIds = data.items.map((item) =>
      articleId(feedId, item.guid)
    );

    // Diff: only process IDs we don't already have
    const existingIds = await this.articleRepo.existsMany(incomingIds);
    const newItems = data.items.filter(
      (item) => !existingIds.has(articleId(feedId, item.guid))
    );

    if (newItems.length === 0) {
      await this.feedRepo.updateLastFetched(feedId);
      return 0;
    }

    const articles: Article[] = newItems.map((item) => {
      const id = articleId(feedId, item.guid);
      const plainText = stripHtml(item.content || item.contentSnippet);
      return {
        id,
        feedId,
        title: item.title,
        url: item.link,
        content: item.content || item.contentSnippet,
        summary: item.contentSnippet || plainText.slice(0, 300),
        publishedAt: item.pubDate
          ? new Date(item.pubDate).getTime()
          : Date.now(),
        readAt: null,
        savedAt: null,
        readProgress: 0,
        estimatedReadTime: estimateReadTime(plainText),
        embedding: null,
      };
    });

    await this.articleRepo.createMany(articles);
    await this.feedRepo.updateLastFetched(feedId);

    // Enqueue for embedding if a handler is registered
    if (this.onNewArticles) {
      for (const article of articles) {
        const text = `${article.title}. ${article.summary}`;
        this.onNewArticles(article.id, text);
      }
    }

    // Notify listeners (e.g. LiveFeed component)
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("feed:updated", {
          detail: { feedId, newCount: articles.length },
        })
      );
    }

    return articles.length;
  }

  /** Start polling all subscribed feeds at the given interval */
  startPolling(intervalMs = 15 * 60 * 1000): void {
    this.stopPolling();
    this.pollAll(); // immediate first poll

    const id = setInterval(async () => {
      await this.pollAll();
    }, intervalMs);
    this.pollingIntervals.set("__global__", id);
  }

  stopPolling(): void {
    for (const id of this.pollingIntervals.values()) {
      clearInterval(id);
    }
    this.pollingIntervals.clear();
  }

  private async pollAll(): Promise<void> {
    const feeds = await this.feedRepo.getSubscribed();
    await Promise.allSettled(
      feeds.map((f) => this.fetchAndIngest(f.id))
    );
  }
}

// Singleton for use across the app
let _instance: FeedIngestionService | null = null;
export function getFeedIngestionService(): FeedIngestionService {
  if (!_instance) _instance = new FeedIngestionService();
  return _instance;
}
