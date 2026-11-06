"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useFocus } from "@/lib/contexts/FocusContext";
import { useKeyboard } from "@/lib/hooks/useKeyboard";
import { ArticleRepo, FeedRepo } from "@/lib/db";
import type { Article, Feed, CuratedCacheEntry } from "@/lib/db";
import { getDb } from "@/lib/db/db";
import { getRecommendationEngine } from "@/lib/recommendation/RecommendationEngine";
import { ArticleRow } from "@/components/feed/ArticleRow";
import { KeyboardHintBar } from "@/components/shell/KeyboardHintBar";

interface CuratedItem {
  entry: CuratedCacheEntry;
  article: Article;
  feed?: Feed;
}

interface CuratedFeedProps {
  onOpenArticle?: (articleId: string, listIndex: number, list: string[]) => void;
}

export function CuratedFeed({ onOpenArticle }: CuratedFeedProps) {
  const { focusContext } = useFocus();
  const [items, setItems] = useState<CuratedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [cursorIdx, setCursorIdx] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const articleRepo = new ArticleRepo();
  const feedRepo = new FeedRepo();
  const engine = getRecommendationEngine();

  async function loadCachedCurated() {
    const db = getDb();
    const cached = await db.curatedCache.orderBy("score").reverse().toArray();
    if (cached.length === 0) {
      setItems([]);
      setIsLoading(false);
      return;
    }

    const [articles, feeds] = await Promise.all([
      Promise.all(cached.map((e) => articleRepo.getById(e.articleId))),
      feedRepo.getAll(),
    ]);

    const feedsById = feeds.reduce<Record<string, Feed>>((acc, f) => {
      acc[f.id] = f;
      return acc;
    }, {});

    const hydrated: CuratedItem[] = cached
      .map((entry, i) => {
        const article = articles[i];
        if (!article) return null;
        const item: CuratedItem = {
          entry,
          article,
          feed: feedsById[article.feedId],
        };
        return item;
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    setItems(hydrated);
    setIsLoading(false);
  }

  async function refresh() {
    setIsRefreshing(true);
    await engine.run();
    await loadCachedCurated();
    setIsRefreshing(false);
    setCursorIdx(0);
  }

  useEffect(() => {
    loadCachedCurated();
  }, []);

  // Scroll cursor into view
  useEffect(() => {
    const el = containerRef.current?.querySelector(
      `[data-curated-row="${cursorIdx}"]`
    ) as HTMLElement | null;
    el?.scrollIntoView({ block: "nearest" });
  }, [cursorIdx]);

  const handleAction = useCallback(
    async (action: { type: string }) => {
      if (focusContext !== "CURATED_LIST") return;

      switch (action.type) {
        case "CURSOR_UP":
          setCursorIdx((i) => Math.max(0, i - 1));
          break;
        case "CURSOR_DOWN":
          setCursorIdx((i) => Math.min(items.length - 1, i + 1));
          break;
        case "SELECT": {
          const item = items[cursorIdx];
          if (item) {
            const list = items.map((x) => x.article.id);
            onOpenArticle?.(item.article.id, cursorIdx, list);
          }
          break;
        }
        case "REFRESH":
          await refresh();
          break;
      }
    },
    [focusContext, cursorIdx, items, onOpenArticle] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  useKeyboard(handleAction as any);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <span style={{ color: "var(--color-dim)" }} className="text-sm tracking-wider">
          LOADING CURATED FEED...
        </span>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 p-6">
        <div
          className="text-sm tracking-wider"
          style={{ color: "var(--color-dim)" }}
        >
          [ NO CURATED CONTENT YET ]
        </div>
        <div
          className="text-xs text-center max-w-sm"
          style={{ color: "var(--color-border)" }}
        >
          Subscribe to feeds and read some articles, then press R to generate
          your first curated feed.
        </div>
        <button
          onClick={refresh}
          disabled={isRefreshing}
          className="text-xs px-3 py-1.5 border tracking-wider mt-2"
          style={{
            borderColor: "var(--color-primary)",
            color: "var(--color-primary)",
            opacity: isRefreshing ? 0.5 : 1,
          }}
        >
          {isRefreshing ? "GENERATING..." : "R  GENERATE CURATED FEED"}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="px-4 py-2 border-b flex items-center justify-between"
        style={{ borderColor: "var(--color-border)" }}
      >
        <span
          className="text-xs tracking-widest"
          style={{ color: "var(--color-dim)" }}
        >
          CURATED — {items.length} RECOMMENDATIONS
        </span>
        <button
          onClick={refresh}
          disabled={isRefreshing}
          className="text-xs tracking-wider"
          style={{ color: "var(--color-dim)", opacity: isRefreshing ? 0.5 : 1 }}
        >
          {isRefreshing ? "REFRESHING..." : "R REFRESH"}
        </button>
      </div>

      {/* Article list */}
      <div ref={containerRef} className="flex-1 overflow-y-auto">
        {items.map((item, i) => (
          <div key={item.entry.id} data-curated-row={i}>
            <ArticleRow
              article={item.article}
              feed={item.feed}
              index={i}
              isCursor={i === cursorIdx}
              reason={item.entry.reason}
              isExploration={item.entry.isExploration}
              onClick={() => {
                setCursorIdx(i);
                const list = items.map((x) => x.article.id);
                onOpenArticle?.(item.article.id, i, list);
              }}
            />
          </div>
        ))}
      </div>

      <KeyboardHintBar
        override="J/K NAVIGATE  ·  ENTER READ  ·  R REFRESH  ·  1-4 TABS"
      />
    </div>
  );
}
