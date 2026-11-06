import { getDb } from "../db";
import type { UserProfile, ExplicitSignal } from "../types";

const DEFAULT_PROFILE: UserProfile = {
  id: "default",
  interestVectors: {},
  topicWeights: {},
  explicitSignals: [],
  telemetryEnabled: true,
  diversityRatio: 0.2,
  updatedAt: Date.now(),
};

export class UserProfileRepo {
  private get db() {
    return getDb();
  }

  async get(): Promise<UserProfile | undefined> {
    return this.db.userProfile.get("default");
  }

  async getOrCreate(): Promise<UserProfile> {
    const existing = await this.get();
    if (existing) return existing;
    await this.db.userProfile.put({ ...DEFAULT_PROFILE, updatedAt: Date.now() });
    return { ...DEFAULT_PROFILE };
  }

  async update(patch: Partial<Omit<UserProfile, "id">>): Promise<void> {
    await this.db.userProfile.update("default", {
      ...patch,
      updatedAt: Date.now(),
    });
  }

  async addExplicitSignal(signal: ExplicitSignal): Promise<void> {
    const profile = await this.getOrCreate();
    const signals = [...profile.explicitSignals, signal];
    await this.update({ explicitSignals: signals });
  }

  async setInterestVector(topicKey: string, vector: number[], weight: number): Promise<void> {
    const profile = await this.getOrCreate();
    await this.update({
      interestVectors: { ...profile.interestVectors, [topicKey]: vector },
      topicWeights: { ...profile.topicWeights, [topicKey]: weight },
    });
  }

  async deleteTopic(topicKey: string): Promise<void> {
    const profile = await this.getOrCreate();
    const vectors = { ...profile.interestVectors };
    const weights = { ...profile.topicWeights };
    delete vectors[topicKey];
    delete weights[topicKey];
    await this.update({ interestVectors: vectors, topicWeights: weights });
  }

  /** Reset all learned preferences — zeroes vectors and clears signals */
  async reset(): Promise<void> {
    await this.update({
      interestVectors: {},
      topicWeights: {},
      explicitSignals: [],
      updatedAt: Date.now(),
    });
  }

  async exists(): Promise<boolean> {
    return (await this.get()) !== undefined;
  }
}
