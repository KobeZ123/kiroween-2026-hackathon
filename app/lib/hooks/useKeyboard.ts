"use client";

import { useEffect, useCallback } from "react";
import { useFocus, TabId } from "@/lib/contexts/FocusContext";

export type KeyboardAction =
  | { type: "CURSOR_UP" }
  | { type: "CURSOR_DOWN" }
  | { type: "SELECT" }        // ENTER
  | { type: "TOGGLE" }        // SPACE
  | { type: "BACK" }          // ESC
  | { type: "MARK_ALL" }      // M
  | { type: "REFRESH" }       // R
  | { type: "NEXT" }          // N
  | { type: "BOOKMARK" }      // B
  | { type: "MORE_LIKE" }     // L
  | { type: "LESS_LIKE" }     // X
  | { type: "OPEN_ORIGINAL" } // O
  | { type: "UNSUBSCRIBE" }   // U
  | { type: "SAVE" }          // S
  | { type: "SETTINGS" }      // ?
  | { type: "SWITCH_TAB"; tab: TabId };

export type ActionHandler = (action: KeyboardAction) => void;

const TAB_KEYS: Record<string, TabId> = {
  "1": "curated",
  "2": "feed",
  "3": "subscriptions",
  "4": "collection",
};

/**
 * Global keyboard hook. Attach one handler per page/component that needs
 * keyboard input. All global tab-switch keys are always active.
 */
export function useKeyboard(handler: ActionHandler) {
  const { focusContext, setActiveTab } = useFocus();

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't intercept when user is typing in an input/textarea
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      // Global tab switching (1–4) — always active unless in an input
      if (!isInput && TAB_KEYS[e.key]) {
        e.preventDefault();
        setActiveTab(TAB_KEYS[e.key]);
        return;
      }

      // Settings shortcut (?)
      if (!isInput && e.key === "?") {
        e.preventDefault();
        handler({ type: "SETTINGS" });
        return;
      }

      // Context-specific keys
      switch (e.key) {
        case "ArrowUp":
        case "k":
          if (!isInput) {
            e.preventDefault();
            handler({ type: "CURSOR_UP" });
          }
          break;

        case "ArrowDown":
        case "j":
          if (!isInput) {
            e.preventDefault();
            handler({ type: "CURSOR_DOWN" });
          }
          break;

        case "Enter":
          e.preventDefault();
          handler({ type: "SELECT" });
          break;

        case " ":
          if (!isInput) {
            e.preventDefault();
            handler({ type: "TOGGLE" });
          }
          break;

        case "Escape":
          e.preventDefault();
          handler({ type: "BACK" });
          break;

        case "m":
        case "M":
          if (!isInput) {
            e.preventDefault();
            handler({ type: "MARK_ALL" });
          }
          break;

        case "r":
        case "R":
          if (!isInput) {
            e.preventDefault();
            handler({ type: "REFRESH" });
          }
          break;

        case "n":
        case "N":
          if (!isInput) {
            e.preventDefault();
            handler({ type: "NEXT" });
          }
          break;

        case "b":
        case "B":
          if (!isInput) {
            e.preventDefault();
            handler({ type: "BOOKMARK" });
          }
          break;

        case "l":
        case "L":
          if (!isInput) {
            e.preventDefault();
            handler({ type: "MORE_LIKE" });
          }
          break;

        case "x":
        case "X":
          if (!isInput) {
            e.preventDefault();
            handler({ type: "LESS_LIKE" });
          }
          break;

        case "o":
        case "O":
          if (!isInput) {
            e.preventDefault();
            handler({ type: "OPEN_ORIGINAL" });
          }
          break;

        case "u":
        case "U":
          if (!isInput) {
            e.preventDefault();
            handler({ type: "UNSUBSCRIBE" });
          }
          break;

        case "s":
        case "S":
          if (!isInput) {
            e.preventDefault();
            handler({ type: "SAVE" });
          }
          break;
      }
    },
    [handler, setActiveTab, focusContext]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}
