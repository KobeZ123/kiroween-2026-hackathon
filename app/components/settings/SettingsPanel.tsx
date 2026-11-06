"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { UserProfileRepo, TelemetryRepo } from "@/lib/db";
import { UserInterestProfile } from "@/lib/recommendation/UserInterestProfile";
import { getStateExportService } from "@/lib/services/StateExportService";
import type { TopicSummary } from "@/lib/recommendation/UserInterestProfile";

interface SettingsPanelProps {
  onClose: () => void;
}

export function SettingsPanel({ onClose }: SettingsPanelProps) {
  const [topics, setTopics] = useState<TopicSummary[]>([]);
  const [diversityRatio, setDiversityRatio] = useState(0.2);
  const [telemetryEnabled, setTelemetryEnabled] = useState(true);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const profileRepo = new UserProfileRepo();
  const telemetryRepo = new TelemetryRepo();
  const interestProfile = new UserInterestProfile();
  const exportService = getStateExportService();

  async function load() {
    const profile = await profileRepo.getOrCreate();
    setDiversityRatio(profile.diversityRatio);
    setTelemetryEnabled(profile.telemetryEnabled);
    const t = await interestProfile.getTopics();
    setTopics(t);
  }

  useEffect(() => {
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function saveDiversity(value: number) {
    setDiversityRatio(value);
    await profileRepo.update({ diversityRatio: value });
  }

  async function toggleTelemetry() {
    const next = !telemetryEnabled;
    setTelemetryEnabled(next);
    await profileRepo.update({ telemetryEnabled: next });
  }

  async function resetPreferences() {
    if (!confirm("Reset all learned preferences? This cannot be undone.")) return;
    setIsResetting(true);
    await profileRepo.reset();
    await telemetryRepo.clear();
    setTopics([]);
    setIsResetting(false);
    setStatusMsg("PREFERENCES RESET");
    setTimeout(() => setStatusMsg(null), 2000);
  }

  async function deleteTopic(key: string) {
    await profileRepo.deleteTopic(key);
    await load();
  }

  async function handleExportOPML() {
    await exportService.exportOPML();
    setStatusMsg("OPML EXPORTED");
    setTimeout(() => setStatusMsg(null), 2000);
  }

  async function handleExportJSON() {
    await exportService.exportJSON();
    setStatusMsg("STATE EXPORTED");
    setTimeout(() => setStatusMsg(null), 2000);
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.name.endsWith(".opml") || file.name.endsWith(".xml")) {
      const result = await exportService.importOPML(file);
      setStatusMsg(`IMPORTED ${result.added} FEEDS (${result.skipped} skipped)`);
    } else if (file.name.endsWith(".json")) {
      const result = await exportService.importJSON(file);
      setStatusMsg(
        `IMPORTED ${result.feeds} FEEDS, ${result.collections} ITEMS${result.profileRestored ? ", PROFILE RESTORED" : ""}`
      );
    } else {
      setStatusMsg("UNSUPPORTED FILE TYPE");
    }

    setTimeout(() => setStatusMsg(null), 3000);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-8 px-4"
      style={{ backgroundColor: "rgba(13, 26, 13, 0.95)" }}
    >
      <div
        className="w-full max-w-lg border"
        style={{ borderColor: "var(--color-border)" }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b"
          style={{ borderColor: "var(--color-border)" }}
        >
          <span
            className="text-sm font-bold tracking-widest glow"
            style={{ color: "var(--color-primary)" }}
          >
            SETTINGS
          </span>
          <button
            onClick={onClose}
            className="text-xs tracking-wider"
            style={{ color: "var(--color-dim)" }}
          >
            ESC CLOSE
          </button>
        </div>

        <div className="p-4 flex flex-col gap-6">
          {/* Status message */}
          {statusMsg && (
            <div
              className="text-xs tracking-wider px-3 py-2 border"
              style={{
                borderColor: "var(--color-primary)",
                color: "var(--color-primary)",
              }}
            >
              {statusMsg}
            </div>
          )}

          {/* Diversity ratio */}
          <section>
            <h2
              className="text-xs tracking-widest mb-3"
              style={{ color: "var(--color-dim)" }}
            >
              CURATION MIX
            </h2>
            <div className="flex items-center gap-3">
              <span className="text-xs" style={{ color: "var(--color-dim)" }}>
                PERSONALIZED
              </span>
              <input
                type="range"
                min={0}
                max={0.5}
                step={0.05}
                value={diversityRatio}
                onChange={(e) => saveDiversity(Number(e.target.value))}
                className="flex-1"
                style={{ accentColor: "var(--color-primary)" }}
                aria-label="Exploration ratio"
              />
              <span className="text-xs" style={{ color: "var(--color-dim)" }}>
                EXPLORE
              </span>
            </div>
            <div
              className="text-xs mt-1 text-center"
              style={{ color: "var(--color-dim)" }}
            >
              {Math.round((1 - diversityRatio) * 100)}% personalized ·{" "}
              {Math.round(diversityRatio * 100)}% exploratory
            </div>
          </section>

          {/* Telemetry toggle */}
          <section>
            <h2
              className="text-xs tracking-widest mb-3"
              style={{ color: "var(--color-dim)" }}
            >
              BEHAVIORAL TELEMETRY
            </h2>
            <button
              onClick={toggleTelemetry}
              className="flex items-center gap-3 text-sm"
            >
              <span
                className="text-sm px-1 border"
                style={{
                  borderColor: telemetryEnabled
                    ? "var(--color-primary)"
                    : "var(--color-border)",
                  color: telemetryEnabled
                    ? "var(--color-primary)"
                    : "var(--color-dim)",
                }}
              >
                {telemetryEnabled ? "[ON]" : "[OFF]"}
              </span>
              <span style={{ color: "var(--color-dim)" }} className="text-xs">
                {telemetryEnabled
                  ? "Reading behavior is tracked to improve recommendations"
                  : "Reading behavior is NOT tracked"}
              </span>
            </button>
          </section>

          {/* Inferred interests */}
          <section>
            <h2
              className="text-xs tracking-widest mb-3"
              style={{ color: "var(--color-dim)" }}
            >
              INFERRED INTERESTS
            </h2>
            {topics.length === 0 ? (
              <span className="text-xs" style={{ color: "var(--color-border)" }}>
                No interests learned yet. Read some articles to calibrate.
              </span>
            ) : (
              <div className="flex flex-col gap-2">
                {topics.map((t) => (
                  <div key={t.key} className="flex items-center gap-3">
                    <div
                      className="h-1.5 rounded-none"
                      style={{
                        width: `${Math.min(100, (t.weight / 10) * 100)}%`,
                        maxWidth: "160px",
                        minWidth: "20px",
                        backgroundColor: "var(--color-primary)",
                      }}
                    />
                    <span
                      className="text-xs flex-1"
                      style={{ color: "var(--color-dim)" }}
                    >
                      {t.label.toUpperCase()}
                    </span>
                    <span
                      className="text-xs"
                      style={{ color: "var(--color-border)" }}
                    >
                      {t.weight.toFixed(1)}
                    </span>
                    <button
                      onClick={() => deleteTopic(t.key)}
                      className="text-xs"
                      style={{ color: "var(--color-dim)" }}
                      aria-label={`Remove ${t.label} interest`}
                    >
                      [×]
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={resetPreferences}
              disabled={isResetting}
              className="mt-4 text-xs tracking-wider border px-3 py-1"
              style={{
                borderColor: "#ff4444",
                color: "#ff4444",
                opacity: isResetting ? 0.5 : 1,
              }}
            >
              {isResetting ? "RESETTING..." : "RESET ALL PREFERENCES"}
            </button>
          </section>

          {/* Export / Import */}
          <section>
            <h2
              className="text-xs tracking-widest mb-3"
              style={{ color: "var(--color-dim)" }}
            >
              DATA PORTABILITY
            </h2>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleExportOPML}
                className="text-xs border px-3 py-1 tracking-wider"
                style={{
                  borderColor: "var(--color-border)",
                  color: "var(--color-dim)",
                }}
              >
                EXPORT OPML
              </button>
              <button
                onClick={handleExportJSON}
                className="text-xs border px-3 py-1 tracking-wider"
                style={{
                  borderColor: "var(--color-border)",
                  color: "var(--color-dim)",
                }}
              >
                EXPORT JSON
              </button>
              <label
                className="text-xs border px-3 py-1 tracking-wider cursor-pointer"
                style={{
                  borderColor: "var(--color-border)",
                  color: "var(--color-dim)",
                }}
              >
                IMPORT FILE
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".opml,.xml,.json"
                  onChange={handleImport}
                  className="hidden"
                />
              </label>
            </div>
            <p className="text-xs mt-2" style={{ color: "var(--color-border)" }}>
              OPML imports subscriptions. JSON imports full state (feeds,
              collections, profile). Newer data wins on conflict.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
