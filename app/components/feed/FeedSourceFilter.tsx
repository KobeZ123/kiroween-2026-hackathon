"use client";

import type { Feed } from "@/lib/db";

interface FeedSourceFilterProps {
  feeds: Feed[];
  selected: Set<string>;
  cursorIndex: number;
  onToggle: (feedId: string) => void;
}

export function FeedSourceFilter({
  feeds,
  selected,
  cursorIndex,
  onToggle,
}: FeedSourceFilterProps) {
  if (feeds.length === 0) return null;

  return (
    <div
      className="flex items-center gap-2 px-4 py-2 border-b overflow-x-auto"
      style={{ borderColor: "var(--color-border)" }}
      role="toolbar"
      aria-label="Filter by feed source"
    >
      <span
        className="text-xs tracking-wider shrink-0 mr-1"
        style={{ color: "var(--color-dim)" }}
      >
        FILTER:
      </span>
      {feeds.map((feed, i) => {
        const isSelected = selected.has(feed.id);
        const isCursor = i === cursorIndex;
        return (
          <button
            key={feed.id}
            onClick={() => onToggle(feed.id)}
            className="text-xs px-2 py-0.5 border shrink-0 tracking-wider transition-colors"
            style={{
              borderColor: isCursor
                ? "var(--color-primary)"
                : isSelected
                ? "var(--color-dim)"
                : "var(--color-border)",
              backgroundColor: isSelected
                ? "var(--color-bg-selected)"
                : "transparent",
              color: isSelected ? "var(--color-primary)" : "var(--color-dim)",
              boxShadow: isCursor ? "var(--glow-spread)" : "none",
            }}
            aria-pressed={isSelected}
          >
            {isSelected ? "[×]" : "[ ]"} {feed.title}
          </button>
        );
      })}
    </div>
  );
}
