import { TelemetryRepo, UserProfileRepo } from "@/lib/db";
import type { TelemetryEvent } from "@/lib/db";

/**
 * Collects reading behavior telemetry and writes it to IndexedDB.
 * Respects the user's telemetryEnabled preference.
 */
export class TelemetryCollector {
  private telemetryRepo = new TelemetryRepo();
  private profileRepo = new UserProfileRepo();

  private async isEnabled(): Promise<boolean> {
    const profile = await this.profileRepo.get();
    return profile?.telemetryEnabled ?? true;
  }

  async record(articleId: string, event: TelemetryEvent): Promise<void> {
    if (!(await this.isEnabled())) return;
    await this.telemetryRepo.record(articleId, event);
  }
}

// Singleton
let _instance: TelemetryCollector | null = null;
export function getTelemetryCollector(): TelemetryCollector {
  if (!_instance) _instance = new TelemetryCollector();
  return _instance;
}
