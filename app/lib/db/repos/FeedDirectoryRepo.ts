import { getDb } from "../db";
import type { FeedDirectoryEntry, FeedCategory } from "../types";

export class FeedDirectoryRepo {
  private get db() {
    return getDb();
  }

  async getAll(): Promise<FeedDirectoryEntry[]> {
    return this.db.feedDirectory.toArray();
  }

  async getById(id: string): Promise<FeedDirectoryEntry | undefined> {
    return this.db.feedDirectory.get(id);
  }

  async getByCategory(category: FeedCategory): Promise<FeedDirectoryEntry[]> {
    return this.db.feedDirectory.where("category").equals(category).toArray();
  }

  async search(query: string): Promise<FeedDirectoryEntry[]> {
    if (!query.trim()) return this.getAll();
    const q = query.toLowerCase();
    return this.db.feedDirectory
      .filter(
        (entry) =>
          entry.title.toLowerCase().includes(q) ||
          entry.category.toLowerCase().includes(q) ||
          entry.description.toLowerCase().includes(q)
      )
      .toArray();
  }

  async count(): Promise<number> {
    return this.db.feedDirectory.count();
  }

  async seedMany(entries: FeedDirectoryEntry[]): Promise<void> {
    await this.db.feedDirectory.bulkPut(entries);
  }
}
