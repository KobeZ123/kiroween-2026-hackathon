import { getDb } from "../db";
import type { TelemetryRecord, TelemetryEvent } from "../types";

export class TelemetryRepo {
  private get db() {
    return getDb();
  }

  async record(articleId: string, event: TelemetryEvent): Promise<void> {
    const id = `${articleId}:${event}:${Date.now()}`;
    await this.db.telemetry.put({ id, articleId, event, timestamp: Date.now() });
  }

  async getByArticle(articleId: string): Promise<TelemetryRecord[]> {
    return this.db.telemetry.where("articleId").equals(articleId).toArray();
  }

  async getAll(): Promise<TelemetryRecord[]> {
    return this.db.telemetry.toArray();
  }

  async clear(): Promise<void> {
    await this.db.telemetry.clear();
  }

  async count(): Promise<number> {
    return this.db.telemetry.count();
  }
}
