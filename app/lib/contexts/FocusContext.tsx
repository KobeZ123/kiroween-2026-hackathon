"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

// All possible focus contexts — drives keyboard nav behavior
export type FocusContextType =
  | "FEED_LIST"
  | "CURATED_LIST"
  | "CONTENT_PAGE"
  | "SUBSCRIPTIONS"
  | "COLLECTION"
  | "SETTINGS"
  | "BOOT";

export type TabId = "curated" | "feed" | "subscriptions" | "collection";

interface FocusContextValue {
  focusContext: FocusContextType;
  setFocusContext: (ctx: FocusContextType) => void;
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
  /** Push a context onto the history stack (for back-navigation with ESC) */
  pushContext: (ctx: FocusContextType) => void;
  /** Pop back to the previous context */
  popContext: () => void;
}

const FocusCtx = createContext<FocusContextValue | null>(null);

export function FocusProvider({ children }: { children: React.ReactNode }) {
  const [focusContext, setFocusContextRaw] = useState<FocusContextType>("FEED_LIST");
  const [activeTab, setActiveTab] = useState<TabId>("feed");
  const [contextStack, setContextStack] = useState<FocusContextType[]>([]);

  const setFocusContext = useCallback((ctx: FocusContextType) => {
    setFocusContextRaw(ctx);
  }, []);

  const pushContext = useCallback((ctx: FocusContextType) => {
    setContextStack((prev) => [...prev, focusContext]);
    setFocusContextRaw(ctx);
  }, [focusContext]);

  const popContext = useCallback(() => {
    setContextStack((prev) => {
      if (prev.length === 0) return prev;
      const next = [...prev];
      const last = next.pop()!;
      setFocusContextRaw(last);
      return next;
    });
  }, []);

  return (
    <FocusCtx.Provider
      value={{
        focusContext,
        setFocusContext,
        activeTab,
        setActiveTab,
        pushContext,
        popContext,
      }}
    >
      {children}
    </FocusCtx.Provider>
  );
}

export function useFocus() {
  const ctx = useContext(FocusCtx);
  if (!ctx) throw new Error("useFocus must be used within FocusProvider");
  return ctx;
}
