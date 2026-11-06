"use client";

import { useCallback, useEffect, useState } from "react";
import { FocusProvider, useFocus, TabId } from "@/lib/contexts/FocusContext";
import { useKeyboard } from "@/lib/hooks/useKeyboard";
import { useEmbeddingStatus } from "@/lib/hooks/useEmbeddingStatus";
import { StatusBar } from "./StatusBar";
import { TabBar } from "./TabBar";
import { KeyboardHintBar } from "./KeyboardHintBar";
import { PlaceholderTab } from "@/components/tabs/PlaceholderTab";
import { CuratedFeed } from "@/components/curated/CuratedFeed";
import { LiveFeed } from "@/components/feed/LiveFeed";
import { SubscriptionsTab } from "@/components/subscriptions/SubscriptionsTab";
import { seedFeedDirectory, initializeUserProfile } from "@/lib/db";

interface OpenArticleState {
  articleId: string;
  listIndex: number;
  articleList: string[];
}

function ShellContent() {
  const { activeTab, setActiveTab, setFocusContext, focusContext } = useFocus();
  const embeddingStatus = useEmbeddingStatus();
  const [openArticle, setOpenArticle] = useState<OpenArticleState | null>(null);

  useEffect(() => {
    async function init() {
      try {
        await seedFeedDirectory();
        await initializeUserProfile();
      } catch (e) {
        console.warn("DB init error:", e);
      }
    }
    init();
  }, []);

  useEffect(() => {
    const map: Record<TabId, typeof focusContext> = {
      curated:       "CURATED_LIST",
      feed:          "FEED_LIST",
      subscriptions: "SUBSCRIPTIONS",
      collection:    "COLLECTION",
    };
    if (focusContext !== "CONTENT_PAGE" && focusContext !== "SETTINGS") {
      setFocusContext(map[activeTab]);
    }
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAction = useCallback(
    (action: { type: string; tab?: TabId }) => {
      if (action.type === "SWITCH_TAB" && action.tab) {
        setActiveTab(action.tab);
      }
    },
    [setActiveTab]
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  useKeyboard(handleAction as any);

  function handleOpenArticle(articleId: string, listIndex: number, articleList?: string[]) {
    setOpenArticle({ articleId, listIndex, articleList: articleList ?? [articleId] });
    setFocusContext("CONTENT_PAGE");
  }

  function handleCloseArticle() {
    setOpenArticle(null);
    const map: Record<TabId, typeof focusContext> = {
      curated:       "CURATED_LIST",
      feed:          "FEED_LIST",
      subscriptions: "SUBSCRIPTIONS",
      collection:    "COLLECTION",
    };
    setFocusContext(map[activeTab]);
  }

  let systemMessage: string | undefined;
  if (embeddingStatus.phase === "loading_model") {
    const bar = "█".repeat(Math.floor(embeddingStatus.modelProgress / 10));
    const empty = "░".repeat(10 - bar.length);
    systemMessage = `CALIBRATING ENGINE [${bar}${empty}] ${embeddingStatus.modelProgress}%`;
  } else if (embeddingStatus.phase === "processing") {
    systemMessage = `EMBEDDING ARTICLES... (${embeddingStatus.queueLength} remaining)`;
  }

  const tabOrder: TabId[] = ["curated", "feed", "subscriptions", "collection"];

  const tabContent: Record<TabId, React.ReactNode> = {
    curated: (
      <CuratedFeed
        onOpenArticle={(id, idx, list) => handleOpenArticle(id, idx, list)}
      />
    ),
    feed: (
      <LiveFeed
        onOpenArticle={(id, idx) => handleOpenArticle(id, idx)}
      />
    ),
    subscriptions: <SubscriptionsTab />,
    collection: (
      <PlaceholderTab
        title="COLLECTION"
        description="Bookmarks, saves, and reading history — coming in Task 9"
      />
    ),
  };

  return (
    <div
      className="flex flex-col h-full select-none"
      style={{ backgroundColor: "var(--color-bg)" }}
    >
      <StatusBar systemMessage={systemMessage} />
      <TabBar />
      <main className="flex-1 overflow-hidden relative" role="main">
        {tabOrder.map((tab) => (
          <div
            key={tab}
            className="absolute inset-0 overflow-hidden flex flex-col"
            style={{ display: activeTab === tab ? "flex" : "none" }}
            role="tabpanel"
            aria-label={tab}
          >
            {tabContent[tab]}
          </div>
        ))}
      </main>
      {!openArticle && <KeyboardHintBar />}
    </div>
  );
}

export function TerminalShell() {
  return (
    <FocusProvider>
      <ShellContent />
    </FocusProvider>
  );
}
