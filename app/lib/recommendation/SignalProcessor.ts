import { ArticleRepo, FeedRepo, CollectionRepo } from "@/lib/db";
import { UserInterestProfile } from "./UserInterestProfile";

/**
 * Processes explicit and implicit signals and updates the user interest profile.
 * Called from ContentPage shortcuts and TelemetryCollector events.
 */
export class SignalProcessor {
  private articleRepo = new ArticleRepo();
  private feedRepo = new FeedRepo();
  private collectionRepo = new CollectionRepo();
  private profile = new UserInterestProfile();

  private async getArticleTopicAndEmbedding(
    articleId: string
  ): Promise<{ topicKey: string; embedding: number[] } | null> {
    const article = await this.articleRepo.getById(articleId);
    if (!article?.embedding) return null;

    const feed = await this.feedRepo.getById(article.feedId);
    const topicKey = this.profile.topicKeyForCategory(feed?.category ?? "technology");
    return { topicKey, embedding: article.embedding };
  }

  async onOpen(articleId: string): Promise<void> {
    const data = await this.getArticleTopicAndEmbedding(articleId);
    if (!data) return;
    await this.profile.updateVector(data.topicKey, data.embedding, +0.2);
  }

  async onRead50(articleId: string): Promise<void> {
    const data = await this.getArticleTopicAndEmbedding(articleId);
    if (!data) return;
    await this.profile.updateVector(data.topicKey, data.embedding, +0.5);
  }

  async onRead80(articleId: string): Promise<void> {
    const data = await this.getArticleTopicAndEmbedding(articleId);
    if (!data) return;
    await this.profile.updateVector(data.topicKey, data.embedding, +0.8);
  }

  async onQuickExit(articleId: string): Promise<void> {
    const data = await this.getArticleTopicAndEmbedding(articleId);
    if (!data) return;
    await this.profile.updateVector(data.topicKey, data.embedding, -0.3);
  }

  async onBookmark(articleId: string): Promise<void> {
    const data = await this.getArticleTopicAndEmbedding(articleId);
    if (!data) return;
    await this.collectionRepo.add(articleId, "bookmark");
    await this.profile.updateVector(data.topicKey, data.embedding, +0.6);
  }

  async onMoreLike(articleId: string): Promise<void> {
    const data = await this.getArticleTopicAndEmbedding(articleId);
    if (!data) return;
    await this.profile.updateVector(data.topicKey, data.embedding, +1.5);
  }

  async onLessLike(articleId: string): Promise<void> {
    const data = await this.getArticleTopicAndEmbedding(articleId);
    if (!data) return;
    await this.profile.updateVector(data.topicKey, data.embedding, -1.5);
  }
}

let _instance: SignalProcessor | null = null;
export function getSignalProcessor(): SignalProcessor {
  if (!_instance) _instance = new SignalProcessor();
  return _instance;
}
