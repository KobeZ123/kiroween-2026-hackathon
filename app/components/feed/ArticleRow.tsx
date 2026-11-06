"use client";

import type { Article, Feed } from "@/lib/db";

interface ArticleRowProps {
  article: Article;
  feed?: Feed;
  index: number;
  isCursor: boolean;
  /** Optional reason string (used in Curated tab) */
  reason?: string;
  /** True if this is an exploratory pick (Curated tab) */
  isExploration?: boolean;
  onClick?: () => void;
}

export function ArticleRow({
  article,
  feed,
  index,
  isCursor,
  reason,
  isExploration,
  onClick,
}: ArticleRowProps) {
  const isRead = article.readAt !== null;
  const rowNum = String(index + 1).padStart(2, "0");

  const published = new Date(article.publishedAt);
  const dateStr = published.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  return (
    <div
      className="px-4 py-3 border-b cursor-pointer transition-colors"
      style={{
        borderColor: "var(--color-border)",
        backgroundColor: isCursor
          ? "var(--color-bg-selected)"
          : "transparent",
        boxShadow: isCursor ? "inset 2px 0 0 var(--color-primary)" : "none",
        opacity: isRead ? 0.5 : 1,
      }}
      onClick={onClick}
      role="option"
      aria-selected={isCursor}
    >
      <div className="flex items-start gap-3">
        {/* Row number */}
        <span
          className="text-sm shrink-0 mt-0.5 w-6"
          style={{ color: isCursor ? "var(--color-primary)" : "var(--color-dim)" }}
        >
          {isCursor ? "▶" : rowNum}
        </span>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 flex-wrap">
            <span
              className="text-sm font-medium leading-snug"
              style={{ color: "var(--color-primary)" }}
            >
              {article.title}
            </span>
            {isExploration && (
              <span
                className="text-xs px-1 border shrink-0"
                style={{
                  color: "var(--color-dim)",
                  borderColor: "var(--color-border)",
                }}
              >
                EXPLORE
              </span>
            )}
          </div>

          {/* Meta row */}
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {feed?.category && (
              <span
                className="text-xs tracking-wider"
                style={{ color: "var(--color-dim)" }}
              >
                {feed.category.toUpperCase()}
              </span>
            )}
            <span style={{ color: "var(--color-border)" }}>·</span>
            <span
              className="text-xs"
              style={{ color: "var(--color-dim)" }}
            >
              {article.estimatedReadTime} MIN READ
            </span>
            {feed?.title && (
              <>
                <span style={{ color: "var(--color-border)" }}>·</span>
                <span
                  className="text-xs"
                  style={{ color: "var(--color-dim)" }}
                >
                  {feed.title}
                </span>
              </>
            )}
            <span style={{ color: "var(--color-border)" }}>·</span>
            <span
              className="text-xs"
              style={{ color: "var(--color-dim)" }}
            >
              {dateStr}
            </span>
            {article.readProgress > 0 && !isRead && (
              <>
                <span style={{ color: "var(--color-border)" }}>·</span>
                <span
                  className="text-xs"
                  style={{ color: "var(--color-primary)" }}
                >
                  {article.readProgress}% READ
                </span>
              </>
            )}
          </div>

          {/* Reason string (Curated tab) */}
          {reason && (
            <div
              className="text-xs mt-1 italic"
              style={{ color: "var(--color-dim)" }}
            >
              → {reason}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
