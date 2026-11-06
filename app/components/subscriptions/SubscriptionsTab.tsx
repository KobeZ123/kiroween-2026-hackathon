"use client";

import { useCallback, useEffect, useState } from "react";
import { useFocus } from "@/lib/contexts/FocusContext";
import { useKeyboard } from "@/lib/hooks/useKeyboard";
import {
  FeedDirectoryRepo,
  FeedRepo,
} from "@/lib/db";
import type { Feed, FeedDirectoryEntry } from "@/lib/db";
import { getFeedIngestionService } from "@/lib/services/FeedIngestionService";
import { KeyboardHintBar } from "@/components/shell/KeyboardHintBar";

type SearchResult = {
  entry: FeedDirectoryEntry;
  isSubscribed: boolean;
  feed?: Feed;
};

interface FeedDetailState {
  entry: FeedDirectoryEntry;
  isSubscribed: boolean;
  articleCount: number;
}

export function SubscriptionsTab() {
  const { focusContext } = useFocus();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [subscribed, setSubscribed] = useState<Feed[]>([]);
  const [cursorIdx, setCursorIdx] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detail, setDetail] = useState<FeedDetailState | null>(null);
  const [customUrl, setCustomUrl] = useState("");
  const [customStatus, setCustomStatus] = useState<string | null>(null);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isCustomFocused, setIsCustomFocused] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const directoryRepo = new FeedDirectoryRepo();
  const feedRepo = new FeedRepo();
  const ingestion = getFeedIngestionService();

  async function loadSubscribed() {
    const feeds = await feedRepo.getSubscribed();
    setSubscribed(feeds);
    return feeds;
  }

  async function search(q: string) {
    const [entries, feeds] = await Promise.all([
      directoryRepo.search(q),
      feedRepo.getAll(),
    ]);
    const feedsByUrl = new Map(feeds.map((f) => [f.url, f]));

    const mapped: SearchResult[] = entries.map((entry) => {
      const feed = feedsByUrl.get(entry.url);
      return {
        entry,
        isSubscribed: feed?.isSubscribed ?? false,
        feed,
      };
    });

    // Subscribed first, then alphabetical
    mapped.sort((a, b) => {
      if (a.isSubscribed && !b.isSubscribed) return -1;
      if (!a.isSubscribed && b.isSubscribed) return 1;
      return a.entry.title.localeCompare(b.entry.title);
    });

    setResults(mapped);
    setCursorIdx(0);
  }

  useEffect(() => {
    loadSubscribed();
    search("");
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    search(query);
  }, [query]); // eslint-disable-line react-hooks/exhaustive-deps

  async function subscribe(entry: FeedDirectoryEntry) {
    setStatusMessage(`SUBSCRIBING TO ${entry.title.toUpperCase()}...`);
    // Upsert feed record
    const existing = await feedRepo.getByUrl(entry.url);
    const feedId = existing?.id ?? btoa(entry.url).replace(/[^a-z0-9]/gi, "").slice(0, 16);
    if (!existing) {
      await feedRepo.create({
        id: feedId,
        url: entry.url,
        title: entry.title,
        category: entry.category,
        favicon: null,
        subscribedAt: Date.now(),
        lastFetchedAt: null,
        isSubscribed: true,
      });
    } else {
      await feedRepo.subscribe(existing.id);
    }
    await loadSubscribed();
    await search(query);
    // Trigger immediate ingest in background
    ingestion.fetchAndIngest(feedId).catch(console.warn);
    setStatusMessage(null);
  }

  async function unsubscribeSelected() {
    for (const feedId of Array.from(selected)) {
      await feedRepo.unsubscribe(feedId);
    }
    setSelected(new Set());
    await loadSubscribed();
    await search(query);
  }

  async function showDetail(result: SearchResult) {
    const { ArticleRepo } = await import("@/lib/db");
    const articleRepo = new ArticleRepo();
    const count = result.feed
      ? await articleRepo.countByFeedId(result.feed.id)
      : 0;
    setDetail({
      entry: result.entry,
      isSubscribed: result.isSubscribed,
      articleCount: count,
    });
  }

  async function validateCustomUrl() {
    if (!customUrl.trim()) return;
    setCustomStatus("VALIDATING...");
    try {
      const res = await fetch(
        `/api/discover?url=${encodeURIComponent(customUrl.trim())}`
      );
      const data = await res.json();
      if (data.valid) {
        setCustomStatus(`✓ ${data.title} (${data.itemCount} items)`);
      } else {
        setCustomStatus(`✗ ${data.error}`);
      }
    } catch {
      setCustomStatus("✗ Network error");
    }
  }

  async function subscribeCustomUrl() {
    if (!customUrl.trim() || !customStatus?.startsWith("✓")) return;
    const title = customStatus.replace(/^✓ (.+) \(\d+ items\)$/, "$1");
    const entry: FeedDirectoryEntry = {
      id: btoa(customUrl).replace(/[^a-z0-9]/gi, "").slice(0, 16),
      url: customUrl.trim(),
      title,
      category: "technology",
      description: "Custom feed",
    };
    await subscribe(entry);
    setCustomUrl("");
    setCustomStatus(null);
  }

  const currentResult = results[cursorIdx];

  const handleAction = useCallback(
    async (action: { type: string }) => {
      if (focusContext !== "SUBSCRIPTIONS") return;
      if (isSearchFocused || isCustomFocused) return;

      switch (action.type) {
        case "CURSOR_UP":
          setCursorIdx((i) => Math.max(0, i - 1));
          break;
        case "CURSOR_DOWN":
          setCursorIdx((i) => Math.min(results.length - 1, i + 1));
          break;
        case "TOGGLE": {
          if (!currentResult) break;
          if (currentResult.isSubscribed && currentResult.feed) {
            setSelected((prev) => {
              const next = new Set(prev);
              if (next.has(currentResult.feed!.id)) next.delete(currentResult.feed!.id);
              else next.add(currentResult.feed!.id);
              return next;
            });
          } else {
            await subscribe(currentResult.entry);
          }
          break;
        }
        case "SELECT":
          if (currentResult) await showDetail(currentResult);
          break;
        case "UNSUBSCRIBE":
          await unsubscribeSelected();
          break;
        case "BACK":
          setDetail(null);
          break;
      }
    },
    [focusContext, isSearchFocused, isCustomFocused, cursorIdx, results, currentResult, selected] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  useKeyboard(handleAction as any);

  return (
    <div className="flex flex-col h-full">
      {/* Search bar */}
      <div
        className="px-4 py-2 border-b"
        style={{ borderColor: "var(--color-border)" }}
      >
        <div className="flex items-center gap-2">
          <span style={{ color: "var(--color-dim)" }} className="text-xs tracking-wider shrink-0">
            SEARCH:
          </span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            placeholder="search feed directory..."
            className="flex-1 bg-transparent text-sm outline-none tracking-wide"
            style={{
              color: "var(--color-primary)",
              caretColor: "var(--color-primary)",
            }}
            aria-label="Search feed directory"
          />
        </div>
      </div>

      {/* Custom URL bar */}
      <div
        className="px-4 py-2 border-b"
        style={{ borderColor: "var(--color-border)" }}
      >
        <div className="flex items-center gap-2 flex-wrap">
          <span style={{ color: "var(--color-dim)" }} className="text-xs tracking-wider shrink-0">
            CUSTOM URL:
          </span>
          <input
            type="url"
            value={customUrl}
            onChange={(e) => setCustomUrl(e.target.value)}
            onFocus={() => setIsCustomFocused(true)}
            onBlur={() => setIsCustomFocused(false)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (customStatus?.startsWith("✓")) {
                  subscribeCustomUrl();
                } else {
                  validateCustomUrl();
                }
              }
            }}
            placeholder="paste feed URL and press Enter to validate..."
            className="flex-1 bg-transparent text-sm outline-none tracking-wide"
            style={{
              color: "var(--color-primary)",
              caretColor: "var(--color-primary)",
            }}
            aria-label="Custom RSS feed URL"
          />
          {customStatus && (
            <span
              className="text-xs shrink-0"
              style={{
                color: customStatus.startsWith("✓")
                  ? "var(--color-primary)"
                  : "#ff4444",
              }}
            >
              {customStatus}
            </span>
          )}
          {customStatus?.startsWith("✓") && (
            <button
              onClick={subscribeCustomUrl}
              className="text-xs px-2 py-0.5 border tracking-wider"
              style={{
                borderColor: "var(--color-primary)",
                color: "var(--color-primary)",
              }}
            >
              SUBSCRIBE
            </button>
          )}
        </div>
      </div>

      {/* Status message */}
      {statusMessage && (
        <div
          className="px-4 py-1 text-xs tracking-wider"
          style={{ color: "var(--color-dim)" }}
        >
          {statusMessage}
        </div>
      )}

      {/* Feed detail overlay */}
      {detail && (
        <div
          className="flex-1 overflow-y-auto px-4 py-4"
          role="region"
          aria-label="Feed details"
        >
          <div className="flex items-center justify-between mb-4">
            <span
              className="text-sm font-bold tracking-wider glow"
              style={{ color: "var(--color-primary)" }}
            >
              {detail.entry.title}
            </span>
            <button
              onClick={() => setDetail(null)}
              className="text-xs tracking-wider"
              style={{ color: "var(--color-dim)" }}
            >
              ESC BACK
            </button>
          </div>
          <div className="flex flex-col gap-2 text-sm">
            <div style={{ color: "var(--color-dim)" }}>
              <span className="tracking-wider text-xs">CATEGORY: </span>
              <span style={{ color: "var(--color-primary)" }}>
                {detail.entry.category.toUpperCase()}
              </span>
            </div>
            <div style={{ color: "var(--color-dim)" }}>
              <span className="tracking-wider text-xs">ARTICLES: </span>
              <span style={{ color: "var(--color-primary)" }}>
                {detail.articleCount}
              </span>
            </div>
            <div style={{ color: "var(--color-dim)" }}>
              <span className="tracking-wider text-xs">STATUS: </span>
              <span style={{ color: "var(--color-primary)" }}>
                {detail.isSubscribed ? "SUBSCRIBED" : "NOT SUBSCRIBED"}
              </span>
            </div>
            <p className="text-xs mt-2" style={{ color: "var(--color-dim)" }}>
              {detail.entry.description}
            </p>
            {!detail.isSubscribed && (
              <button
                onClick={async () => {
                  await subscribe(detail.entry);
                  setDetail(null);
                }}
                className="mt-4 text-xs px-3 py-1.5 border tracking-wider self-start"
                style={{
                  borderColor: "var(--color-primary)",
                  color: "var(--color-primary)",
                }}
              >
                SUBSCRIBE
              </button>
            )}
          </div>
        </div>
      )}

      {/* Feed list */}
      {!detail && (
        <div className="flex-1 overflow-y-auto">
          {results.length === 0 && (
            <div className="flex items-center justify-center h-24">
              <span style={{ color: "var(--color-dim)" }} className="text-xs tracking-wider">
                NO RESULTS
              </span>
            </div>
          )}
          {results.map((result, i) => {
            const isCursor = i === cursorIdx && !isSearchFocused;
            const isSelected = result.feed ? selected.has(result.feed.id) : false;
            return (
              <div
                key={result.entry.id}
                className="flex items-center gap-3 px-4 py-3 border-b cursor-pointer"
                style={{
                  borderColor: "var(--color-border)",
                  backgroundColor: isCursor
                    ? "var(--color-bg-selected)"
                    : "transparent",
                  boxShadow: isCursor ? "inset 2px 0 0 var(--color-primary)" : "none",
                }}
                onClick={() => {
                  setCursorIdx(i);
                  showDetail(result);
                }}
              >
                {/* Checkbox */}
                <span
                  className="text-sm shrink-0"
                  style={{ color: isCursor ? "var(--color-primary)" : "var(--color-dim)" }}
                >
                  {result.isSubscribed
                    ? isSelected
                      ? "[×]"
                      : "[✓]"
                    : "[ ]"}
                </span>

                {/* Feed info */}
                <div className="flex-1 min-w-0">
                  <span
                    className="text-sm"
                    style={{ color: "var(--color-primary)" }}
                  >
                    {result.entry.title}
                  </span>
                  <span
                    className="text-xs ml-2"
                    style={{ color: "var(--color-dim)" }}
                  >
                    {result.entry.category.toUpperCase()}
                  </span>
                </div>

                {result.isSubscribed && (
                  <span
                    className="text-xs shrink-0"
                    style={{ color: "var(--color-dim)" }}
                  >
                    SUBSCRIBED
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      <KeyboardHintBar
        override={
          selected.size > 0
            ? `J/K NAVIGATE  ·  SPACE SELECT  ·  ENTER DETAILS  ·  U UNSUBSCRIBE (${selected.size} selected)`
            : "J/K NAVIGATE  ·  SPACE SUBSCRIBE/SELECT  ·  ENTER DETAILS  ·  U UNSUBSCRIBE"
        }
      />
    </div>
  );
}
