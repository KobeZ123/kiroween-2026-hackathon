"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useFocus } from "@/lib/contexts/FocusContext";
import { useKeyboard } from "@/lib/hooks/useKeyboard";
import { ArticleRepo, CollectionRepo, FeedRepo } from "@/lib/db";
import type { Article, Collection, Feed, CollectionType } from "@/lib/db";
import { KeyboardHintBar } from "@/components/shell/KeyboardHintBar";

type FilterType = "all" | CollectionType;

const FILTERS: { id: FilterType; label: string }[] = [
  { id: "all",      label: "ALL" },
  { id: "bookmark", label: "BOOKMARKS" },
  { id: "read",     label: "READ" },
  { id: "saved",    label: "SAVED" },
];

interface CollectionItem {
  collection: Collection;
  article: Article;
  feed?: Feed;
  readProgress: number;
}

interface CollectionTabProps {
  onOpenArticle?: (articleId: string, listIndex: number, list: string[]) => void;
}

export function CollectionTab({ onOpenArticle }: CollectionTabProps) {
  const { focusContext } = useFocus();

  const [filter, setFilter] = useState<FilterType>("all");
  const [filterCursorIdx, setFilterCursorIdx] = useState(0);
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [cursorIdx, setCursorIdx] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const collectionRepo = new CollectionRepo();
  const articleRepo = new ArticleRepo();
  const feedRepo = new FeedRepo();

  async function load() {
    setIsLoading(true);
    const [collections, feeds] = await Promise.all([
      filter === "all"
        ? collectionRepo.getAll()
        : collectionRepo.getByType(filter as CollectionType),
      feedRepo.getAll(),
    ]);

    const feedsById = feeds.reduce<Record<string, Feed>>((acc, f) => {
      acc[f.id] = f;
      return acc;
    }, {});

    // Deduplicate by articleId (show each article once, showing its "best" type)
    const seen = new Set<string>();
    const deduped: Collection[] = [];
    for (const c of collections) {
      if (!seen.has(c.articleId)) {
        seen.add(c.articleId);
        deduped.push(c);
      }
    }

    const articles = await Promise.all(
      deduped.map((c) => articleRepo.getById(c.articleId))
    );

    const hydrated: CollectionItem[] = deduped
      .map((c, i) => {
        const article = articles[i];
        if (!article) return null;
        const item: CollectionItem = {
          collection: c,
          article,
          feed: feedsById[article.feedId],
          readProgress: article.readProgress,
        };
        return item;
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    setItems(hydrated);
    setIsLoading(false);
    setCursorIdx(0);
  }

  useEffect(() => {
    load();
  }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll cursor into view
  useEffect(() => {
    const el = containerRef.current?.querySelector(
      `[data-collection-row="${cursorIdx}"]`
    ) as HTMLElement | null;
    el?.scrollIntoView({ block: "nearest" });
  }, [cursorIdx]);

  const handleAction = useCallback(
    async (action: { type: string }) => {
      if (focusContext !== "COLLECTION") return;

      switch (action.type) {
        case "CURSOR_UP":
          setCursorIdx((i) => Math.max(0, i - 1));
          break;
        case "CURSOR_DOWN":
          setCursorIdx((i) => Math.min(items.length - 1, i + 1));
          break;

        // Left/right arrow switches filters
        case "CURSOR_LEFT":
          setFilterCursorIdx((i) => {
            const next = Math.max(0, i - 1);
            setFilter(FILTERS[next].id);
            return next;
          });
          break;
        case "CURSOR_RIGHT":
          setFilterCursorIdx((i) => {
            const next = Math.min(FILTERS.length - 1, i + 1);
            setFilter(FILTERS[next].id);
            return next;
          });
          break;

        case "SELECT": {
          const item = items[cursorIdx];
          if (item) {
            const list = items.map((x) => x.article.id);
            onOpenArticle?.(item.article.id, cursorIdx, list);
          }
          break;
        }
      }
    },
    [focusContext, cursorIdx, items, onOpenArticle] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  useKeyboard(handleAction as any);

  const BADGE_COLORS: Record<CollectionType, string> = {
    bookmark: "var(--color-primary)",
    read:     "var(--color-dim)",
    saved:    "#ffaa00",
  };

  const TYPE_LABEL: Record<CollectionType, string> = {
    bookmark: "BOOKMARKED",
    read:     "READ",
    saved:    "SAVED",
  };

  return (
    <div className="flex flex-col h-full">
      {/* Filter sub-tabs */}
      <div
        className="flex items-center gap-1 px-4 py-2 border-b"
        style={{ borderColor: "var(--color-border)" }}
        role="tablist"
        aria-label="Collection filter"
      >
        {FILTERS.map((f, i) => {
          const isActive = filter === f.id;
          return (
            <button
              key={f.id}
              onClick={() => {
                setFilter(f.id);
                setFilterCursorIdx(i);
              }}
              className="text-xs px-2 py-0.5 border tracking-wider"
              role="tab"
              aria-selected={isActive}
              style={{
                borderColor: isActive ? "var(--color-primary)" : "var(--color-border)",
                backgroundColor: isActive ? "var(--color-bg-selected)" : "transparent",
                color: isActive ? "var(--color-primary)" : "var(--color-dim)",
              }}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center flex-1">
          <span style={{ color: "var(--color-dim)" }} className="text-sm tracking-wider">
            LOADING...
          </span>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 gap-2">
          <span style={{ color: "var(--color-dim)" }} className="text-sm tracking-wider">
            [ EMPTY ]
          </span>
          <span style={{ color: "var(--color-border)" }} className="text-xs">
            {filter === "bookmark"
              ? "Press B on an article to bookmark it"
              : filter === "saved"
              ? "Press S on an article to save it"
              : "Read articles appear here"}
          </span>
        </div>
      ) : (
        <div ref={containerRef} className="flex-1 overflow-y-auto" role="listbox">
          {items.map((item, i) => {
            const isCursor = i === cursorIdx;
            const collType = item.collection.type as CollectionType;
            const date = new Date(item.collection.createdAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            });

            return (
              <div
                key={item.collection.id}
                data-collection-row={i}
                className="flex items-start gap-3 px-4 py-3 border-b cursor-pointer"
                style={{
                  borderColor: "var(--color-border)",
                  backgroundColor: isCursor ? "var(--color-bg-selected)" : "transparent",
                  boxShadow: isCursor ? "inset 2px 0 0 var(--color-primary)" : "none",
                }}
                onClick={() => {
                  setCursorIdx(i);
                  const list = items.map((x) => x.article.id);
                  onOpenArticle?.(item.article.id, i, list);
                }}
              >
                {/* Cursor indicator */}
                <span
                  className="text-sm shrink-0 mt-0.5 w-5"
                  style={{ color: isCursor ? "var(--color-primary)" : "var(--color-dim)" }}
                >
                  {isCursor ? "▶" : ""}
                </span>

                {/* Article info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2 flex-wrap">
                    <span
                      className="text-sm font-medium leading-snug"
                      style={{ color: "var(--color-primary)" }}
                    >
                      {item.article.title}
                    </span>
                    <span
                      className="text-xs px-1 border shrink-0"
                      style={{
                        color: BADGE_COLORS[collType],
                        borderColor: BADGE_COLORS[collType],
                      }}
                    >
                      {TYPE_LABEL[collType]}
                    </span>
                  </div>

                  {/* Meta */}
                  <div className="flex items-center gap-2 mt-1 flex-wrap text-xs">
                    {item.feed?.title && (
                      <span style={{ color: "var(--color-dim)" }}>
                        {item.feed.title}
                      </span>
                    )}
                    <span style={{ color: "var(--color-border)" }}>·</span>
                    <span style={{ color: "var(--color-dim)" }}>{date}</span>
                    {item.readProgress > 0 && (
                      <>
                        <span style={{ color: "var(--color-border)" }}>·</span>
                        <span style={{ color: "var(--color-primary)" }}>
                          {item.readProgress}% READ
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <KeyboardHintBar
        override="J/K NAVIGATE  ·  ENTER READ  ·  ←/→ FILTER  ·  1-4 TABS"
      />
    </div>
  );
}
