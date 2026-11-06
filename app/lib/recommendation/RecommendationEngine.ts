import {
  ArticleRepo,
  FeedRepo,
  FeedDirectoryRepo,
  UserProfileRepo,
} from "@/lib/db";
import type { Article, CuratedCacheEntry } from "@/lib/db";
import { getDb } from "@/lib/db/db";
import { cosineSimilarity, recencyDecay } from "./math";
import { UserInterestProfile } from "./UserInterestProfile";

interface ScoredArticle {
  article: Article;
  score: number;
  topTopic: string;
  topSimilarity: number;
  isExploration: boolean;
}

export class RecommendationEngine {
  private articleRepo = new ArticleRepo();
  private feedRepo = new FeedRepo();
  private directoryRepo = new FeedDirectoryRepo();
  private profileRepo = new UserProfileRepo();
  private interestProfile = new UserInterestProfile();

  /** Fetch unread articles from the past 7 days that have embeddings */
  async getCandidates(): Promise<Article[]> {
    return this.articleRepo.getRecentUnread(7);
  }

  /** Score a single article against all topic vectors */
  private scoreArticle(
    article: Article,
    topicVectors: Record<string, { vector: number[]; weight: number }>
  ): { score: number; topTopic: string; topSimilarity: number } {
    if (!article.embedding || Object.keys(topicVectors).length === 0) {
      return { score: 0, topTopic: "general", topSimilarity: 0 };
    }

    let topTopic = "general";
    let topSimilarity = 0;
    let weightedScore = 0;

    for (const [topicKey, { vector, weight }] of Object.entries(topicVectors)) {
      const sim = cosineSimilarity(article.embedding, vector);
      const weighted = sim * weight;
      if (weighted > weightedScore) {
        weightedScore = weighted;
        topTopic = topicKey;
        topSimilarity = sim;
      }
    }

    // Combine similarity + recency + diversity
    const decay = recencyDecay(article.publishedAt);
    const score = 0.6 * topSimilarity + 0.3 * decay + 0.1;

    return { score, topTopic, topSimilarity };
  }

  /**
   * MMR (Maximal Marginal Relevance) diversity reranking.
   * λ = balance between relevance and diversity (higher = more relevant).
   */
  private mmrRerank(
    scored: ScoredArticle[],
    topN: number,
    lambda = 0.7
  ): ScoredArticle[] {
    if (scored.length === 0) return [];
    const selected: ScoredArticle[] = [];
    const remaining = [...scored];

    while (selected.length < topN && remaining.length > 0) {
      let bestIdx = 0;
      let bestMmr = -Infinity;

      for (let i = 0; i < remaining.length; i++) {
        const candidate = remaining[i];
        const relevance = candidate.score;

        // Max similarity to any already-selected article
        let maxSim = 0;
        for (const sel of selected) {
          if (candidate.article.embedding && sel.article.embedding) {
            const sim = cosineSimilarity(
              candidate.article.embedding,
              sel.article.embedding
            );
            if (sim > maxSim) maxSim = sim;
          }
        }

        const mmr = lambda * relevance - (1 - lambda) * maxSim;
        if (mmr > bestMmr) {
          bestMmr = mmr;
          bestIdx = i;
        }
      }

      selected.push(remaining[bestIdx]);
      remaining.splice(bestIdx, 1);
    }

    return selected;
  }

  /** Generate a human-readable explanation for a recommendation */
  private explain(item: ScoredArticle, isFromSubscription: boolean): string {
    if (item.isExploration) {
      return "Exploratory pick outside your subscriptions";
    }
    if (item.topSimilarity > 0.8) {
      return `Strong match with your interest in ${
        item.topTopic.charAt(0).toUpperCase() + item.topTopic.slice(1)
      }`;
    }
    if (item.topSimilarity > 0.5) {
      return `Matches your interest in ${
        item.topTopic.charAt(0).toUpperCase() + item.topTopic.slice(1)
      }`;
    }
    if (isFromSubscription) {
      return "From a source you follow";
    }
    if (recencyDecay(item.article.publishedAt) > 0.9) {
      return "Recently published";
    }
    return "Recommended based on your reading history";
  }

  /**
   * Run the full recommendation pipeline and write results to curatedCache.
   * Returns the number of items written.
   */
  async run(): Promise<number> {
    const [candidates, topicVectors, profile, subscribedFeeds, directory] =
      await Promise.all([
        this.getCandidates(),
        this.interestProfile.getVectors(),
        this.profileRepo.getOrCreate(),
        this.feedRepo.getSubscribed(),
        this.directoryRepo.getAll(),
      ]);

    const subscribedFeedIds = new Set(subscribedFeeds.map((f) => f.id));
    const subscribedFeedUrls = new Set(subscribedFeeds.map((f) => f.url));

    // Score candidates
    const scored: ScoredArticle[] = candidates
      .filter((a) => a.embedding !== null)
      .map((article) => {
        const { score, topTopic, topSimilarity } = this.scoreArticle(
          article,
          topicVectors
        );
        return {
          article,
          score,
          topTopic,
          topSimilarity,
          isExploration: !subscribedFeedIds.has(article.feedId),
        };
      });

    // Sort by score
    scored.sort((a, b) => b.score - a.score);

    const diversityRatio = profile.diversityRatio ?? 0.2;
    const totalSlots = Math.min(50, scored.length);
    const explorationSlots = Math.round(totalSlots * diversityRatio);
    const personalizedSlots = totalSlots - explorationSlots;

    // Personalized: from subscribed sources
    const personalizedPool = scored.filter((s) => !s.isExploration);
    const mmrPersonalized = this.mmrRerank(personalizedPool, personalizedSlots);

    // Exploration: from non-subscribed directory entries (random sample)
    const explorationPool = scored.filter((s) => s.isExploration);
    const explorationPicks = explorationPool
      .sort(() => Math.random() - 0.5)
      .slice(0, explorationSlots);

    const combined = [...mmrPersonalized, ...explorationPicks];

    // Write to curatedCache
    const db = getDb();
    await db.curatedCache.clear();

    const now = Date.now();
    const entries: CuratedCacheEntry[] = combined.map((item, i) => {
      const isFromSubscription = subscribedFeedIds.has(item.article.feedId);
      const reason = this.explain(item, isFromSubscription);
      return {
        id: `curated:${item.article.id}`,
        articleId: item.article.id,
        score: item.score,
        reason,
        isExploration: item.isExploration,
        generatedAt: now,
      };
    });

    await db.curatedCache.bulkPut(entries);
    return entries.length;
  }
}

// Singleton
let _instance: RecommendationEngine | null = null;
export function getRecommendationEngine(): RecommendationEngine {
  if (!_instance) _instance = new RecommendationEngine();
  return _instance;
}
