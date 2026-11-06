"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useFocus } from "@/lib/contexts/FocusContext";
import { useKeyboard } from "@/lib/hooks/useKeyboard";
import { useLiveArticles } from "@/lib/hooks/useLiveArticles";
import { ArticleRepo, FeedRepo } from "@/lib/db";
import type { Feed } from "@/lib/db";
import { FeedSourceFilter } from "./FeedSourceFilter";
import { ArticleRow } from "./ArticleRow";
import { KeyboardHintBar } from "@/components/shell/KeyboardHintBar";

const PAGE_SIZE = 20;

interface LiveFeedProps {
  onOpenArticle?: (articleId: string, listIndex: number) => void;
}

export function LiveFeed({ onOpenArticle }: LiveFeedProps) {
  const { focusContext } = useFocus();

  // Feed filter state
  const [selectedFeeds, setSelectedFeeds] = useState<Set<string>>(new Set());
  const [filterCursorIdx, setFilterCursorIdx] = useState(-1); // -1 = in list, >=0 = in filter bar
  const [inFilterBar, setInFilterBar] = useState(false);

  // List state
  const [cursorIdx, setCursorIdx] = useState(0);
  const [page, setPage] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const feedFilter = selectedFeeds.size > 0 ? Array.from(selectedFeeds) : undefined;
  const { articles, feeds, isLoading } = useLiveArticles({ feedFilter });

  const articleRepo = new ArticleRepo();

  const pageCount = Math.max(1, Math.ceil(articles.length / PAGE_SIZE));
  const pageArticles = articles.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const feedsById = feeds.reduce<Record<string, Feed>>((acc, f) => {
    acc[f.id] = f;
    return acc;
  }, {});

  // Reset cursor when page changes
  useEffect(() => {
    setCursorIdx(0);
  }, [page]);

  // Scroll cursor into view
  useEffect(() => {
    const el = containerRef.current?.querySelector(
      `[data-row="${cursorIdx}"]`
    ) as HTMLElement | null;
    el?.scrollIntoView({ block: "nearest" });
  }, [cursorIdx]);

  const handleAction = useCallback(
    async (action: { type: string }) => {
      if (focusContext !== "FEED_LIST") return;

      if (inFilterBar) {
        // Navigation is in the filter bar
        if (action.type === "CURSOR_LEFT" || action.type === "CURSOR_UP") {
          setFilterCursorIdx((i) => Math.max(0, i - 1));
        } else if (action.type === "CURSOR_RIGHT" || action.type === "CURSOR_DOWN") {
          if (filterCursorIdx >= feeds.length - 1) {
            setInFilterBar(false);
            setFilterCursorIdx(-1);
          } else {
            setFilterCursorIdx((i) => Math.min(feeds.length - 1, i + 1));
          }
        } else if (action.type === "TOGGLE") {
          const feed = feeds[filterCursorIdx];
          if (feed) {
            setSelectedFeeds((prev) => {
              const next = new Set(prev);
              if (next.has(feed.id)) next.delete(feed.id);
              else next.add(feed.id);
              return next;
            });
          }
        } else if (action.type === "BACK") {
          setInFilterBar(false);
          setFilterCursorIdx(-1);
        }
        return;
      }

      // Navigation is in the article list
      switch (action.type) {
        case "CURSOR_UP":
          if (cursorIdx > 0) {
            setCursorIdx((i) => i - 1);
          } else if (page > 0) {
            setPage((p) => p - 1);
            setCursorIdx(PAGE_SIZE - 1);
          }
          break;

        case "CURSOR_DOWN":
          if (cursorIdx < pageArticles.length - 1) {
            setCursorIdx((i) => i + 1);
          } else if (page < pageCount - 1) {
            setPage((p) => p + 1);
          }
          break;

        case "SELECT": {
          const article = pageArticles[cursorIdx];
          if (article) {
            onOpenArticle?.(article.id, page * PAGE_SIZE + cursorIdx);
          }
          break;
        }

        case "TOGGLE": {
          const article = pageArticles[cursorIdx];
          if (article) {
            await articleRepo.markRead(article.id);
            // Advance cursor
            if (cursorIdx < pageArticles.length - 1) {
              setCursorIdx((i) => i + 1);
            }
          }
          break;
        }

        case "MARK_ALL": {
          const ids = pageArticles.map((a) => a.id);
          await articleRepo.markManyRead(ids);
          break;
        }
      }
    },
    [
      focusContext,
      inFilterBar,
      filterCursorIdx,
      cursorIdx,
      page,
      pageCount,
      pageArticles,
      feeds,
      onOpenArticle,
    ]
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  useKeyboard(handleAction as any);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <span style={{ color: "var(--color-dim)" }} className="text-sm tracking-wider">
          LOADING FEED...
        </span>
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-32 gap-2">
        <span style={{ color: "var(--color-dim)" }} className="text-sm tracking-wider">
          NO ARTICLES
        </span>
        <span style={{ color: "var(--color-border)" }} className="text-xs">
          Subscribe to feeds in the SUBSCRIPTIONS tab
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Feed source filter bar */}
      <FeedSourceFilter
        feeds={feeds}
        selected={selectedFeeds}
        cursorIndex={inFilterBar ? filterCursorIdx : -1}
        onToggle={(id) =>
          setSelectedFeeds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
          })
        }
      />

      {/* Article list */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto"
        role="listbox"
        aria-label="Article feed"
      >
        {/* Inbox header */}
        <div
          className="px-4 py-2 border-b"
          style={{ borderColor: "var(--color-border)" }}
        >
          <span
            className="text-xs tracking-widest"
            style={{ color: "var(--color-dim)" }}
          >
            [{String(page * PAGE_SIZE + 1).padStart(2, "0")}] FEED — {articles.length} ARTICLES
          </span>
        </div>

        {pageArticles.map((article, i) => (
          <div key={article.id} data-row={i}>
            <ArticleRow
              article={article}
              feed={feedsById[article.feedId]}
              index={page * PAGE_SIZE + i}
              isCursor={!inFilterBar && i === cursorIdx}
              onClick={() => onOpenArticle?.(article.id, page * PAGE_SIZE + i)}
            />
          </div>
        ))}
      </div>

      {/* Bottom hint bar with page info */}
      <KeyboardHintBar
        pageInfo={`PAGE ${page + 1}/${pageCount}`}
      />
    </div>
  );
}
