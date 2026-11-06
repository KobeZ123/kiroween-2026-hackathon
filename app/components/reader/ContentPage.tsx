"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useFocus } from "@/lib/contexts/FocusContext";
import { useKeyboard } from "@/lib/hooks/useKeyboard";
import { ArticleRepo, CollectionRepo } from "@/lib/db";
import type { Article, Feed } from "@/lib/db";
import { getTelemetryCollector } from "@/lib/services/TelemetryCollector";
import { ReadingProgressBar } from "./ReadingProgressBar";

interface ContentPageProps {
  articleId: string;
  /** Optional: list of article IDs in the current context for N-next navigation */
  articleList?: string[];
  listIndex?: number;
  onClose: () => void;
  onOpenArticle?: (articleId: string, listIndex: number) => void;
}

export function ContentPage({
  articleId,
  articleList = [],
  listIndex = 0,
  onClose,
  onOpenArticle,
}: ContentPageProps) {
  const { pushContext, popContext } = useFocus();

  const [article, setArticle] = useState<Article | null>(null);
  const [feed, setFeed] = useState<Feed | null>(null);
  const [progress, setProgress] = useState(0);
  const [isBookmarked, setIsBookmarked] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const openedAtRef = useRef<number>(Date.now());
  const fired50Ref = useRef(false);
  const fired80Ref = useRef(false);
  const articleRepo = new ArticleRepo();
  const collectionRepo = new CollectionRepo();
  const telemetry = getTelemetryCollector();

  // Load article on mount
  useEffect(() => {
    async function load() {
      const art = await articleRepo.getById(articleId);
      if (!art) return;
      setArticle(art);
      setProgress(art.readProgress);

      // Check bookmark status
      const bookmarked = await collectionRepo.has(articleId, "bookmark");
      setIsBookmarked(bookmarked);
    }
    load();
  }, [articleId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Record open event
  useEffect(() => {
    openedAtRef.current = Date.now();
    fired50Ref.current = false;
    fired80Ref.current = false;
    telemetry.record(articleId, "open");
  }, [articleId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Set focus context to CONTENT_PAGE
  useEffect(() => {
    pushContext("CONTENT_PAGE");
    return () => popContext();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll progress tracking
  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    const scrollable = scrollHeight - clientHeight;
    if (scrollable <= 0) return;
    const pct = Math.round((scrollTop / scrollable) * 100);
    setProgress(pct);

    // Telemetry milestones
    if (!fired50Ref.current && pct >= 50) {
      fired50Ref.current = true;
      telemetry.record(articleId, "read_50");
    }
    if (!fired80Ref.current && pct >= 80) {
      fired80Ref.current = true;
      telemetry.record(articleId, "read_80");
    }
  }

  async function close() {
    // Record quick_exit if closed within 10 seconds
    const elapsed = (Date.now() - openedAtRef.current) / 1000;
    if (elapsed < 10) {
      await telemetry.record(articleId, "quick_exit");
    }
    // Persist reading progress
    await articleRepo.updateProgress(articleId, progress);
    if (progress > 0 && article?.readAt === null) {
      // Mark as partially read in collections
      await collectionRepo.add(articleId, "read");
    }
    onClose();
  }

  const handleAction = useCallback(
    async (action: { type: string }) => {
      switch (action.type) {
        case "BACK":
          await close();
          break;

        case "CURSOR_UP":
          scrollRef.current?.scrollBy({ top: -120, behavior: "smooth" });
          break;

        case "CURSOR_DOWN":
          scrollRef.current?.scrollBy({ top: 120, behavior: "smooth" });
          break;

        case "NEXT": {
          await articleRepo.updateProgress(articleId, progress);
          const nextIdx = listIndex + 1;
          const nextId = articleList[nextIdx];
          if (nextId && onOpenArticle) {
            onOpenArticle(nextId, nextIdx);
          }
          break;
        }

        case "BOOKMARK": {
          await collectionRepo.add(articleId, "bookmark");
          setIsBookmarked(true);
          // Stub: will trigger recommendation vector update in Task 8
          console.log("[signal] BOOKMARK", articleId);
          break;
        }

        case "MORE_LIKE":
          // Stub: implemented fully in Task 8
          console.log("[signal] MORE_LIKE", articleId);
          break;

        case "LESS_LIKE":
          // Stub: implemented fully in Task 8
          console.log("[signal] LESS_LIKE", articleId);
          break;

        case "SAVE":
          await collectionRepo.add(articleId, "saved");
          break;

        case "OPEN_ORIGINAL":
          if (article?.url) {
            window.open(article.url, "_blank", "noopener,noreferrer");
          }
          break;
      }
    },
    [article, articleId, progress, listIndex, articleList, onOpenArticle] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  useKeyboard(handleAction as any);

  if (!article) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center"
        style={{ backgroundColor: "var(--color-bg)" }}
      >
        <span style={{ color: "var(--color-dim)" }} className="text-sm tracking-wider">
          LOADING...
        </span>
      </div>
    );
  }

  const articleNum = String(listIndex + 1).padStart(3, "0");

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ backgroundColor: "var(--color-bg)" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-2 border-b shrink-0"
        style={{ borderColor: "var(--color-border)" }}
      >
        <span
          className="text-xs tracking-widest"
          style={{ color: "var(--color-dim)" }}
        >
          READER / ARTICLE {articleNum}
          {isBookmarked && (
            <span style={{ color: "var(--color-primary)" }} className="ml-2">
              [BOOKMARKED]
            </span>
          )}
        </span>
        <button
          onClick={close}
          className="text-xs tracking-wider"
          style={{ color: "var(--color-dim)" }}
        >
          ESC EXIT
        </button>
      </div>

      {/* Divider */}
      <div
        className="h-px shrink-0"
        style={{ backgroundColor: "var(--color-border)" }}
      />

      {/* Content scroll area */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-6 py-6"
        style={{ maxWidth: "72ch", margin: "0 auto", width: "100%" }}
      >
        {/* Title */}
        <h1
          className="text-xl font-bold mb-3 leading-snug glow"
          style={{ color: "var(--color-primary)" }}
        >
          {article.title}
        </h1>

        {/* Meta */}
        <div
          className="text-xs tracking-wider mb-6 flex flex-wrap gap-2"
          style={{ color: "var(--color-dim)" }}
        >
          <span>{feed?.category?.toUpperCase() ?? "ARTICLE"}</span>
          <span>·</span>
          <span>{article.estimatedReadTime} MIN READ</span>
          {feed?.title && (
            <>
              <span>·</span>
              <span>{feed.title}</span>
            </>
          )}
        </div>

        {/* Article body */}
        <div
          className="prose-terminal text-sm leading-relaxed"
          style={{ color: "var(--color-primary)" }}
          dangerouslySetInnerHTML={{
            __html: article.content || article.summary,
          }}
        />
      </div>

      {/* Progress bar */}
      <div className="shrink-0" style={{ borderTop: "1px solid var(--color-border)" }}>
        <ReadingProgressBar progress={progress} />
      </div>

      {/* Keyboard hints */}
      <div
        className="flex items-center justify-between px-4 py-2 border-t text-xs tracking-wider shrink-0"
        style={{ borderColor: "var(--color-border)", color: "var(--color-dim)" }}
      >
        <span>↑/↓ SCROLL  ·  N NEXT  ·  ESC EXIT  ·  B BOOKMARK  ·  L MORE  ·  X LESS  ·  O OPEN  ·  S SAVE</span>
      </div>
    </div>
  );
}
