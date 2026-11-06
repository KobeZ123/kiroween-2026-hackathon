"use client";

import { useFocus } from "@/lib/contexts/FocusContext";

// Hints per context
const HINTS: Record<string, string> = {
  FEED_LIST:    "J/K NAVIGATE  ·  ENTER READ  ·  SPACE MARK READ  ·  M MARK ALL  ·  1-4 TABS",
  CURATED_LIST: "J/K NAVIGATE  ·  ENTER READ  ·  R REFRESH  ·  1-4 TABS",
  SUBSCRIPTIONS:"J/K NAVIGATE  ·  SPACE SELECT  ·  ENTER DETAILS  ·  U UNSUBSCRIBE  ·  1-4 TABS",
  COLLECTION:   "J/K NAVIGATE  ·  ENTER READ  ·  ←/→ FILTER  ·  1-4 TABS",
  CONTENT_PAGE: "↑/↓ SCROLL  ·  N NEXT  ·  ESC EXIT  ·  B BOOKMARK  ·  L MORE  ·  X LESS  ·  O OPEN  ·  S SAVE",
  SETTINGS:     "ESC CLOSE  ·  ↑/↓ NAVIGATE",
  BOOT:         "",
};

interface KeyboardHintBarProps {
  /** Override the hint string (e.g. from a sub-context) */
  override?: string;
  /** Page number display, e.g. "PAGE 1/5" */
  pageInfo?: string;
}

export function KeyboardHintBar({ override, pageInfo }: KeyboardHintBarProps) {
  const { focusContext } = useFocus();
  const hint = override ?? HINTS[focusContext] ?? "";

  return (
    <div
      className="flex items-center justify-between px-4 py-2 border-t text-xs tracking-wider"
      style={{
        borderColor: "var(--color-border)",
        color: "var(--color-dim)",
        minHeight: "2.25rem",
      }}
    >
      <span className="truncate">{hint}</span>
      {pageInfo && (
        <span
          className="ml-4 shrink-0"
          style={{ color: "var(--color-primary)" }}
        >
          {pageInfo}
        </span>
      )}
    </div>
  );
}
