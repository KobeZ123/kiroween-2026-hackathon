import { getDb } from "../db";
import type { Article } from "../types";

export class ArticleRepo {
  private get db() {
    return getDb();
  }

  async create(article: Article): Promise<void> {
    await this.db.articles.put(article);
  }

  async createMany(articles: Article[]): Promise<void> {
    await this.db.articles.bulkPut(articles);
  }

  async getById(id: string): Promise<Article | undefined> {
    return this.db.articles.get(id);
  }

  async getByFeedId(feedId: string): Promise<Article[]> {
    return this.db.articles
      .where("feedId")
      .equals(feedId)
      .sortBy("publishedAt");
  }

  async getUnread(limit = 100): Promise<Article[]> {
    return this.db.articles
      .where("readAt")
      .equals(null as unknown as number)
      .reverse()
      .sortBy("publishedAt")
      .then((items) => items.slice(0, limit));
  }

  /** Unread articles from the past N days, sorted newest-first */
  async getRecentUnread(days = 7): Promise<Article[]> {
    const since = Date.now() - days * 24 * 60 * 60 * 1000;
    return this.db.articles
      .where("publishedAt")
      .above(since)
      .filter((a) => a.readAt === null)
      .toArray();
  }

  /** All articles sorted newest-first, with optional feed filter */
  async getAll(feedIds?: string[]): Promise<Article[]> {
    if (feedIds && feedIds.length > 0) {
      const all = await this.db.articles
        .where("feedId")
        .anyOf(feedIds)
        .toArray();
      return all.sort((a, b) => b.publishedAt - a.publishedAt);
    }
    const all = await this.db.articles.toArray();
    return all.sort((a, b) => b.publishedAt - a.publishedAt);
  }

  async updateProgress(id: string, progress: number): Promise<void> {
    await this.db.articles.update(id, { readProgress: progress });
  }

  async markRead(id: string): Promise<void> {
    await this.db.articles.update(id, { readAt: Date.now() });
  }

  async markManyRead(ids: string[]): Promise<void> {
    const now = Date.now();
    await this.db.transaction("rw", this.db.articles, async () => {
      for (const id of ids) {
        await this.db.articles.update(id, { readAt: now });
      }
    });
  }

  async updateEmbedding(id: string, embedding: number[]): Promise<void> {
    await this.db.articles.update(id, { embedding });
  }

  async exists(id: string): Promise<boolean> {
    return (await this.db.articles.get(id)) !== undefined;
  }

  async existsMany(ids: string[]): Promise<Set<string>> {
    const existing = await this.db.articles
      .where("id")
      .anyOf(ids)
      .primaryKeys();
    return new Set(existing as string[]);
  }

  async countByFeedId(feedId: string): Promise<number> {
    return this.db.articles.where("feedId").equals(feedId).count();
  }

  async delete(id: string): Promise<void> {
    await this.db.articles.delete(id);
  }
}
