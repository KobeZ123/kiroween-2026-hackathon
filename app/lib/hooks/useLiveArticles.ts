"use client";

import { useEffect, useState, useCallback } from "react";
import { ArticleRepo, FeedRepo } from "@/lib/db";
import type { Article, Feed } from "@/lib/db";

interface LiveArticlesOptions {
  /** If set, only show articles from these feed IDs */
  feedFilter?: string[];
}

export function useLiveArticles({ feedFilter }: LiveArticlesOptions = {}) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const articleRepo = new ArticleRepo();
  const feedRepo = new FeedRepo();

  const refresh = useCallback(async () => {
    const [allArticles, subscribedFeeds] = await Promise.all([
      articleRepo.getAll(feedFilter && feedFilter.length > 0 ? feedFilter : undefined),
      feedRepo.getSubscribed(),
    ]);
    setArticles(allArticles);
    setFeeds(subscribedFeeds);
    setIsLoading(false);
  }, [feedFilter?.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Listen for feed:updated events and re-fetch
  useEffect(() => {
    function onFeedUpdated() {
      refresh();
    }
    window.addEventListener("feed:updated", onFeedUpdated);
    return () => window.removeEventListener("feed:updated", onFeedUpdated);
  }, [refresh]);

  return { articles, feeds, isLoading, refresh };
}
