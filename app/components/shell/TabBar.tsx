"use client";

import { useFocus, TabId } from "@/lib/contexts/FocusContext";

const TABS: { id: TabId; label: string; num: string }[] = [
  { id: "curated",       label: "CURATED",       num: "01" },
  { id: "feed",          label: "FEED",           num: "02" },
  { id: "subscriptions", label: "SUBSCRIPTIONS",  num: "03" },
  { id: "collection",    label: "COLLECTION",     num: "04" },
];

export function TabBar() {
  const { activeTab, setActiveTab, setFocusContext } = useFocus();

  function handleTabClick(tab: TabId) {
    setActiveTab(tab);
    // Map tab → its list focus context
    const ctxMap: Record<TabId, Parameters<typeof setFocusContext>[0]> = {
      curated:       "CURATED_LIST",
      feed:          "FEED_LIST",
      subscriptions: "SUBSCRIPTIONS",
      collection:    "COLLECTION",
    };
    setFocusContext(ctxMap[tab]);
  }

  return (
    <div
      className="flex items-center gap-1 px-4 py-2 border-b"
      style={{ borderColor: "var(--color-border)" }}
    >
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => handleTabClick(tab.id)}
            className="px-3 py-1 text-xs tracking-widest font-mono border transition-colors"
            style={{
              borderColor: isActive ? "var(--color-primary)" : "var(--color-border)",
              backgroundColor: isActive ? "var(--color-bg-selected)" : "transparent",
              color: isActive ? "var(--color-primary)" : "var(--color-dim)",
              boxShadow: isActive ? "var(--glow-spread)" : "none",
              cursor: "pointer",
            }}
            aria-selected={isActive}
            role="tab"
          >
            {tab.num} {tab.label}
          </button>
        );
      })}
    </div>
  );
}
