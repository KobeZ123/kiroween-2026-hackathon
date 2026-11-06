import { getDb } from "../db";
import type { Feed, FeedCategory } from "../types";

export class FeedRepo {
  private get db() {
    return getDb();
  }

  async create(feed: Feed): Promise<void> {
    await this.db.feeds.put(feed);
  }

  async getById(id: string): Promise<Feed | undefined> {
    return this.db.feeds.get(id);
  }

  async getByUrl(url: string): Promise<Feed | undefined> {
    return this.db.feeds.where("url").equals(url).first();
  }

  async getSubscribed(): Promise<Feed[]> {
    return this.db.feeds
      .where("isSubscribed")
      .equals(1) // Dexie stores boolean as 0/1
      .toArray();
  }

  async getAll(): Promise<Feed[]> {
    return this.db.feeds.toArray();
  }

  async subscribe(feedId: string): Promise<void> {
    await this.db.feeds.update(feedId, {
      isSubscribed: true,
      subscribedAt: Date.now(),
    });
  }

  async unsubscribe(feedId: string): Promise<void> {
    await this.db.feeds.update(feedId, { isSubscribed: false });
  }

  async updateLastFetched(feedId: string): Promise<void> {
    await this.db.feeds.update(feedId, { lastFetchedAt: Date.now() });
  }

  async count(): Promise<number> {
    return this.db.feeds.count();
  }

  async delete(feedId: string): Promise<void> {
    await this.db.feeds.delete(feedId);
  }
}
