import { getDb } from "../db";
import type { Collection, CollectionType } from "../types";

export class CollectionRepo {
  private get db() {
    return getDb();
  }

  /** Upserts by compound key (articleId + type) */
  async add(articleId: string, type: CollectionType): Promise<void> {
    const id = `${articleId}:${type}`;
    await this.db.collections.put({ id, articleId, type, createdAt: Date.now() });
  }

  async remove(articleId: string, type: CollectionType): Promise<void> {
    const id = `${articleId}:${type}`;
    await this.db.collections.delete(id);
  }

  async getAll(): Promise<Collection[]> {
    const all = await this.db.collections.toArray();
    return all.sort((a, b) => b.createdAt - a.createdAt);
  }

  async getByType(type: CollectionType): Promise<Collection[]> {
    return this.db.collections
      .where("type")
      .equals(type)
      .reverse()
      .sortBy("createdAt");
  }

  async getByArticleId(articleId: string): Promise<Collection[]> {
    return this.db.collections.where("articleId").equals(articleId).toArray();
  }

  async has(articleId: string, type: CollectionType): Promise<boolean> {
    const id = `${articleId}:${type}`;
    return (await this.db.collections.get(id)) !== undefined;
  }

  async count(): Promise<number> {
    return this.db.collections.count();
  }
}
