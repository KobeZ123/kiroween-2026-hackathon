"use client";

import { useCallback, useEffect, useState } from "react";
import { FocusProvider, useFocus, TabId } from "@/lib/contexts/FocusContext";
import { useKeyboard } from "@/lib/hooks/useKeyboard";
import { StatusBar } from "./StatusBar";
import { TabBar } from "./TabBar";
import { KeyboardHintBar } from "./KeyboardHintBar";
import { PlaceholderTab } from "@/components/tabs/PlaceholderTab";
import { LiveFeed } from "@/components/feed/LiveFeed";
import { SubscriptionsTab } from "@/components/subscriptions/SubscriptionsTab";
import { seedFeedDirectory, initializeUserProfile } from "@/lib/db";

function ShellContent() {
  const { activeTab, setActiveTab, setFocusContext, focusContext } = useFocus();
  const [systemMessage, setSystemMessage] = useState<string | undefined>(undefined);

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
      if (action.type === "SETTINGS") {
        setFocusContext("SETTINGS");
        setSystemMessage("[ SETTINGS ]");
      }
    },
    [setActiveTab, setFocusContext]
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  useKeyboard(handleAction as any);

  const tabOrder: TabId[] = ["curated", "feed", "subscriptions", "collection"];

  const tabContent: Record<TabId, React.ReactNode> = {
    curated: (
      <PlaceholderTab
        title="CURATED"
        description="Personalized recommendations — coming in Task 8"
      />
    ),
    feed: (
      <LiveFeed
        onOpenArticle={(articleId) => {
          console.log("Open article:", articleId);
        }}
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
      <KeyboardHintBar />
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
