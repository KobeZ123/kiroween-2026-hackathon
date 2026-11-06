import { FeedRepo, ArticleRepo, CollectionRepo, UserProfileRepo, TelemetryRepo } from "@/lib/db";

/**
 * Handles OPML and JSON export/import for user state portability.
 */
export class StateExportService {
  private feedRepo = new FeedRepo();
  private articleRepo = new ArticleRepo();
  private collectionRepo = new CollectionRepo();
  private profileRepo = new UserProfileRepo();
  private telemetryRepo = new TelemetryRepo();

  // ── OPML Export ───────────────────────────────────────────────

  async exportOPML(): Promise<void> {
    const feeds = await this.feedRepo.getSubscribed();

    const opml = `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head>
    <title>READER.EXE Subscriptions</title>
    <dateCreated>${new Date().toUTCString()}</dateCreated>
  </head>
  <body>
${feeds
  .map(
    (f) =>
      `    <outline type="rss" text="${escapeXml(f.title)}" title="${escapeXml(f.title)}" xmlUrl="${escapeXml(f.url)}" category="${f.category}" />`
  )
  .join("\n")}
  </body>
</opml>`;

    downloadFile(opml, "reader-subscriptions.opml", "text/xml");
  }

  // ── OPML Import ───────────────────────────────────────────────

  async importOPML(file: File): Promise<{ added: number; skipped: number }> {
    const text = await file.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, "text/xml");
    const outlines = doc.querySelectorAll("outline[xmlUrl]");

    let added = 0;
    let skipped = 0;

    for (const outline of Array.from(outlines)) {
      const url = outline.getAttribute("xmlUrl");
      const title = outline.getAttribute("title") ?? outline.getAttribute("text") ?? "Untitled";
      const category = (outline.getAttribute("category") as "technology" | "finance" | "science" | "gaming" | "culture") ?? "technology";

      if (!url) continue;

      const existing = await this.feedRepo.getByUrl(url);
      if (existing?.isSubscribed) {
        skipped++;
        continue;
      }

      if (existing) {
        await this.feedRepo.subscribe(existing.id);
      } else {
        const feedId = btoa(url).replace(/[^a-z0-9]/gi, "").slice(0, 20);
        await this.feedRepo.create({
          id: feedId,
          url,
          title,
          category,
          favicon: null,
          subscribedAt: Date.now(),
          lastFetchedAt: null,
          isSubscribed: true,
        });
      }
      added++;
    }

    return { added, skipped };
  }

  // ── Full JSON Export ──────────────────────────────────────────

  async exportJSON(): Promise<void> {
    const [feeds, articles, collections, profile, telemetry] = await Promise.all([
      this.feedRepo.getAll(),
      this.articleRepo.getAll(),
      this.collectionRepo.getAll(),
      this.profileRepo.get(),
      this.telemetryRepo.getAll(),
    ]);

    const state = {
      version: "1.0",
      exportedAt: Date.now(),
      feeds,
      articles: articles.map((a) => ({ ...a, embedding: null })), // don't export large embeddings
      collections,
      profile,
      telemetry,
    };

    downloadFile(
      JSON.stringify(state, null, 2),
      `reader-state-${new Date().toISOString().split("T")[0]}.json`,
      "application/json"
    );
  }

  // ── Full JSON Import ──────────────────────────────────────────

  async importJSON(
    file: File
  ): Promise<{ feeds: number; collections: number; profileRestored: boolean }> {
    const text = await file.text();
    const state = JSON.parse(text);

    let feedsImported = 0;
    let collectionsImported = 0;

    // Import feeds
    if (Array.isArray(state.feeds)) {
      for (const feed of state.feeds) {
        const existing = await this.feedRepo.getById(feed.id);
        if (!existing || feed.subscribedAt > (existing.subscribedAt ?? 0)) {
          await this.feedRepo.create(feed);
          feedsImported++;
        }
      }
    }

    // Import collections (newer wins)
    if (Array.isArray(state.collections)) {
      for (const c of state.collections) {
        const existing = await this.collectionRepo.has(c.articleId, c.type);
        if (!existing) {
          await this.collectionRepo.add(c.articleId, c.type);
          collectionsImported++;
        }
      }
    }

    // Import profile (newer updatedAt wins)
    let profileRestored = false;
    if (state.profile) {
      const existing = await this.profileRepo.get();
      if (!existing || state.profile.updatedAt > existing.updatedAt) {
        await this.profileRepo.update(state.profile);
        profileRestored = true;
      }
    }

    return { feeds: feedsImported, collections: collectionsImported, profileRestored };
  }
}

// ── Utilities ─────────────────────────────────────────────────

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Singleton
let _instance: StateExportService | null = null;
export function getStateExportService(): StateExportService {
  if (!_instance) _instance = new StateExportService();
  return _instance;
}
