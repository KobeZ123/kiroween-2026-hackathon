"use client";

import { useCallback, useState } from "react";
import { FocusProvider, useFocus, TabId } from "@/lib/contexts/FocusContext";
import { useKeyboard } from "@/lib/hooks/useKeyboard";
import { StatusBar } from "./StatusBar";
import { TabBar } from "./TabBar";
import { KeyboardHintBar } from "./KeyboardHintBar";
import { PlaceholderTab } from "@/components/tabs/PlaceholderTab";

// Inner shell content — has access to FocusProvider context
function ShellContent() {
  const { activeTab, setActiveTab, setFocusContext } = useFocus();
  const [systemMessage, setSystemMessage] = useState<string | undefined>(undefined);

  const tabOrder: TabId[] = ["curated", "feed", "subscriptions", "collection"];

  const handleAction = useCallback(
    (action: { type: string; tab?: TabId }) => {
      if (action.type === "SWITCH_TAB" && action.tab) {
        setActiveTab(action.tab);
      }
      if (action.type === "SETTINGS") {
        setFocusContext("SETTINGS");
        setSystemMessage("SETTINGS");
      }
    },
    [setActiveTab, setFocusContext]
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  useKeyboard(handleAction as any);

  const tabContent: Record<TabId, React.ReactNode> = {
    curated: (
      <PlaceholderTab
        title="CURATED"
        description="Personalized recommendations — coming in Task 8"
      />
    ),
    feed: (
      <PlaceholderTab
        title="FEED"
        description="Live article feed — coming in Task 4"
      />
    ),
    subscriptions: (
      <PlaceholderTab
        title="SUBSCRIPTIONS"
        description="Manage your RSS sources — coming in Task 6"
      />
    ),
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
      {/* Top: status bar */}
      <StatusBar systemMessage={systemMessage} />

      {/* Tab navigation */}
      <TabBar />

      {/* Main content area */}
      <main className="flex-1 overflow-hidden relative" role="main">
        {tabOrder.map((tab) => (
          <div
            key={tab}
            className="absolute inset-0 overflow-y-auto"
            style={{ display: activeTab === tab ? "block" : "none" }}
            role="tabpanel"
            aria-label={tab}
          >
            {tabContent[tab]}
          </div>
        ))}
      </main>

      {/* Bottom: keyboard hints */}
      <KeyboardHintBar />
    </div>
  );
}

/** Root shell — provides all context and renders the full terminal layout */
export function TerminalShell() {
  return (
    <FocusProvider>
      <ShellContent />
    </FocusProvider>
  );
}
