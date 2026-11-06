"use client";

import { useCallback, useEffect, useState } from "react";
import { FocusProvider, useFocus, TabId } from "@/lib/contexts/FocusContext";
import { useKeyboard } from "@/lib/hooks/useKeyboard";
import { useEmbeddingStatus } from "@/lib/hooks/useEmbeddingStatus";
import { StatusBar } from "./StatusBar";
import { TabBar } from "./TabBar";
import { BootSequence } from "@/components/boot/BootSequence";
import { CuratedFeed } from "@/components/curated/CuratedFeed";
import { LiveFeed } from "@/components/feed/LiveFeed";
import { SubscriptionsTab } from "@/components/subscriptions/SubscriptionsTab";
import { CollectionTab } from "@/components/collection/CollectionTab";
import { ContentPage } from "@/components/reader/ContentPage";
import { SettingsPanel } from "@/components/settings/SettingsPanel";
import { getFeedIngestionService } from "@/lib/services/FeedIngestionService";
import { getSignalProcessor } from "@/lib/recommendation/SignalProcessor";
import { seedFeedDirectory, initializeUserProfile, UserProfileRepo } from "@/lib/db";

interface OpenArticleState {
  articleId: string;
  listIndex: number;
  articleList: string[];
}

function ShellContent() {
  const { activeTab, setActiveTab, setFocusContext, focusContext } = useFocus();
  const embeddingStatus = useEmbeddingStatus();

  const [showBoot, setShowBoot] = useState(false);
  const [bootChecked, setBootChecked] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [openArticle, setOpenArticle] = useState<OpenArticleState | null>(null);

  // First-run detection and DB initialization
  useEffect(() => {
    async function init() {
      try {
        await seedFeedDirectory();
        const profileRepo = new UserProfileRepo();
        const exists = await profileRepo.exists();
        if (!exists) {
          setShowBoot(true);
        } else {
          setBootChecked(true);
        }
      } catch (e) {
        console.warn("DB init error:", e);
        setBootChecked(true);
      }
    }
    init();
  }, []);

  function handleBootComplete() {
    // Create profile and start feed polling
    initializeUserProfile().then(() => {
      setShowBoot(false);
      setBootChecked(true);
      // Start ingestion after boot
      const ingestion = getFeedIngestionService();
      ingestion.startPolling();
    });
  }

  // Start polling once app is ready (not first run)
  useEffect(() => {
    if (!bootChecked) return;
    const ingestion = getFeedIngestionService();
    ingestion.startPolling();
    return () => ingestion.stopPolling();
  }, [bootChecked]);

  // Sync tab → focus context
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
        setShowSettings(true);
        setFocusContext("SETTINGS");
      }
    },
    [setActiveTab, setFocusContext]
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  useKeyboard(handleAction as any);

  function handleOpenArticle(
    articleId: string,
    listIndex: number,
    articleList?: string[]
  ) {
    setOpenArticle({
      articleId,
      listIndex,
      articleList: articleList ?? [articleId],
    });
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

  function handleCloseSettings() {
    setShowSettings(false);
    const map: Record<TabId, typeof focusContext> = {
      curated:       "CURATED_LIST",
      feed:          "FEED_LIST",
      subscriptions: "SUBSCRIPTIONS",
      collection:    "COLLECTION",
    };
    setFocusContext(map[activeTab]);
  }

  // Wire B/L/X signals to SignalProcessor
  async function handleArticleSignal(
    type: "bookmark" | "more_like" | "less_like",
    articleId: string
  ) {
    const processor = getSignalProcessor();
    if (type === "bookmark") await processor.onBookmark(articleId);
    if (type === "more_like") await processor.onMoreLike(articleId);
    if (type === "less_like") await processor.onLessLike(articleId);
  }

  // Derive system status message
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
      <CollectionTab
        onOpenArticle={(id, idx, list) => handleOpenArticle(id, idx, list)}
      />
    ),
  };

  // Don't render the main app until boot check completes
  if (!bootChecked && !showBoot) {
    return (
      <div
        className="fixed inset-0 flex items-center justify-center"
        style={{ backgroundColor: "var(--color-bg)" }}
      />
    );
  }

  return (
    <div
      className="flex flex-col h-full select-none"
      style={{ backgroundColor: "var(--color-bg)" }}
    >
      {/* Boot sequence overlay — first run only */}
      {showBoot && (
        <BootSequence
          modelProgress={embeddingStatus.modelProgress}
          onComplete={handleBootComplete}
        />
      )}

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

      {/* Settings panel */}
      {showSettings && <SettingsPanel onClose={handleCloseSettings} />}

      {/* Content page overlay */}
      {openArticle && (
        <ContentPage
          articleId={openArticle.articleId}
          articleList={openArticle.articleList}
          listIndex={openArticle.listIndex}
          onClose={handleCloseArticle}
          onOpenArticle={(id, idx) =>
            handleOpenArticle(id, idx, openArticle.articleList)
          }
        />
      )}
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
