import { UserProfileRepo, FeedDirectoryRepo } from "@/lib/db";
import { momentumUpdate, normalize } from "./math";
import type { ExplicitSignal } from "@/lib/db";

/**
 * Weight delta → momentum conversion.
 * Higher absolute delta = stronger pull toward/away from article.
 */
function deltaToMomentum(weightDelta: number): number {
  return Math.min(0.8, Math.abs(weightDelta) / 3);
}

const CATEGORY_TOPIC_KEYS = [
  "technology",
  "finance",
  "science",
  "gaming",
  "culture",
];

const TOPIC_LABELS: Record<string, string> = {
  technology: "Technology",
  finance:    "Finance",
  science:    "Science",
  gaming:     "Gaming",
  culture:    "Culture",
};

export interface TopicSummary {
  key: string;
  label: string;
  weight: number;
  vectorLength: number;
}

export class UserInterestProfile {
  private profileRepo = new UserProfileRepo();
  private directoryRepo = new FeedDirectoryRepo();

  /**
   * Update a topic vector toward (positive delta) or away (negative delta)
   * from the given article embedding.
   */
  async updateVector(
    topicKey: string,
    articleEmbedding: number[],
    weightDelta: number
  ): Promise<void> {
    const profile = await this.profileRepo.getOrCreate();
    const currentVec = profile.interestVectors[topicKey] ?? articleEmbedding;
    const currentWeight = profile.topicWeights[topicKey] ?? 0;

    let updated: number[];
    const momentum = deltaToMomentum(weightDelta);

    if (weightDelta > 0) {
      updated = momentumUpdate(currentVec, articleEmbedding, momentum);
    } else {
      // For negative signals: move AWAY from article embedding
      const away = currentVec.map((c, i) => c - momentum * (articleEmbedding[i] ?? 0));
      updated = normalize(away);
    }

    const newWeight = Math.max(0, currentWeight + weightDelta);

    await this.profileRepo.setInterestVector(topicKey, updated, newWeight);
  }

  async getTopics(): Promise<TopicSummary[]> {
    const profile = await this.profileRepo.getOrCreate();
    return Object.keys(profile.topicWeights)
      .map((key) => ({
        key,
        label: TOPIC_LABELS[key] ?? key,
        weight: profile.topicWeights[key],
        vectorLength: (profile.interestVectors[key] ?? []).length,
      }))
      .sort((a, b) => b.weight - a.weight);
  }

  async getVectors(): Promise<Record<string, { vector: number[]; weight: number }>> {
    const profile = await this.profileRepo.getOrCreate();
    const result: Record<string, { vector: number[]; weight: number }> = {};
    for (const key of Object.keys(profile.interestVectors)) {
      result[key] = {
        vector: profile.interestVectors[key],
        weight: profile.topicWeights[key] ?? 1,
      };
    }
    return result;
  }

  /** Best-guess topic key from feed category */
  topicKeyForCategory(category: string): string {
    return CATEGORY_TOPIC_KEYS.includes(category) ? category : "technology";
  }

  /** All category-seeded topic keys */
  get allTopicKeys(): string[] {
    return CATEGORY_TOPIC_KEYS;
  }

  get topicLabels(): Record<string, string> {
    return TOPIC_LABELS;
  }
}
