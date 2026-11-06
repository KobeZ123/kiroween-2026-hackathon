"use client";

import { useEffect, useState } from "react";

interface BootLine {
  text: string;
  delay: number; // ms after previous line finishes
  suffix?: string; // e.g. "OK" in green
  isProgress?: boolean;
}

const BOOT_LINES: BootLine[] = [
  { text: "READER.EXE v1.0.0", delay: 0 },
  { text: "INITIALIZING SYSTEM...", delay: 300 },
  { text: "LOADING FEED DIRECTORY.............", delay: 500, suffix: "OK" },
  { text: "CHECKING LOCAL STORAGE.............", delay: 300, suffix: "OK" },
  { text: "CALIBRATING INTEREST ENGINE........", delay: 300, suffix: "OK" },
  { text: "LOADING LANGUAGE MODEL.............", delay: 400, isProgress: true },
  { text: "SYSTEM ONLINE", delay: 600 },
];

const CHARS_PER_MS = 15; // characters per interval tick

interface BootSequenceProps {
  modelProgress: number; // 0-100 from embedding status
  onComplete: () => void;
}

export function BootSequence({ modelProgress, onComplete }: BootSequenceProps) {
  const [currentLine, setCurrentLine] = useState(0);
  const [displayedText, setDisplayedText] = useState("");
  const [completedLines, setCompletedLines] = useState<string[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [opacity, setOpacity] = useState(1);

  useEffect(() => {
    if (currentLine >= BOOT_LINES.length) {
      // Fade out
      setTimeout(() => {
        setOpacity(0);
        setTimeout(() => {
          setIsComplete(true);
          onComplete();
        }, 600);
      }, 800);
      return;
    }

    const line = BOOT_LINES[currentLine];

    // Delay before starting this line
    const delayTimer = setTimeout(() => {
      // Skip progress line if model hasn't loaded — will be handled separately
      if (line.isProgress) {
        // The progress bar is shown live — just wait for model
        return;
      }

      // Typewriter effect
      let charIdx = 0;
      const interval = setInterval(() => {
        charIdx++;
        setDisplayedText(line.text.slice(0, charIdx));
        if (charIdx >= line.text.length) {
          clearInterval(interval);
          // Line complete — move to completed list
          const finalText =
            line.suffix ? `${line.text} ${line.suffix}` : line.text;
          setCompletedLines((prev) => [...prev, finalText]);
          setDisplayedText("");
          setCurrentLine((c) => c + 1);
        }
      }, CHARS_PER_MS);

      return () => clearInterval(interval);
    }, line.delay);

    return () => clearTimeout(delayTimer);
  }, [currentLine]); // eslint-disable-line react-hooks/exhaustive-deps

  // When model progress reaches 100, advance past the progress line
  useEffect(() => {
    if (
      modelProgress >= 100 &&
      BOOT_LINES[currentLine]?.isProgress
    ) {
      setTimeout(() => {
        const bar = "█".repeat(10);
        setCompletedLines((prev) => [
          ...prev,
          `LOADING LANGUAGE MODEL............. [${bar}] 100% OK`,
        ]);
        setDisplayedText("");
        setCurrentLine((c) => c + 1);
      }, 400);
    }
  }, [modelProgress, currentLine]);

  if (isComplete) return null;

  const progressLine = BOOT_LINES[currentLine];
  const showProgressBar =
    progressLine?.isProgress && modelProgress < 100;

  const barFilled = Math.floor(modelProgress / 10);
  const barEmpty = 10 - barFilled;
  const progressBarStr = `[${"█".repeat(barFilled)}${"░".repeat(barEmpty)}] ${modelProgress}%`;

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col justify-center px-8 py-12 transition-opacity duration-500"
      style={{
        backgroundColor: "var(--color-bg)",
        opacity,
        fontFamily: "var(--font-mono)",
      }}
      aria-live="polite"
      aria-label="System boot sequence"
    >
      <div className="max-w-lg">
        {/* Completed lines */}
        {completedLines.map((line, i) => (
          <div
            key={i}
            className="text-sm mb-1"
            style={{
              color: line.endsWith("OK")
                ? "var(--color-primary)"
                : line === "SYSTEM ONLINE"
                ? "var(--color-primary)"
                : "var(--color-dim)",
            }}
          >
            {line.endsWith("OK") ? (
              <>
                <span style={{ color: "var(--color-dim)" }}>
                  {line.slice(0, -2)}
                </span>
                <span
                  className="glow"
                  style={{ color: "var(--color-primary)" }}
                >
                  OK
                </span>
              </>
            ) : line === "SYSTEM ONLINE" ? (
              <span className="text-lg font-bold tracking-widest glow">
                {line}
                <span className="cursor-blink">_</span>
              </span>
            ) : (
              line
            )}
          </div>
        ))}

        {/* Currently typing line */}
        {displayedText && (
          <div
            className="text-sm mb-1"
            style={{ color: "var(--color-dim)" }}
          >
            {displayedText}
            <span
              className="cursor-blink"
              style={{ color: "var(--color-primary)" }}
            >
              _
            </span>
          </div>
        )}

        {/* Live progress bar */}
        {showProgressBar && (
          <div
            className="text-sm mb-1"
            style={{ color: "var(--color-dim)" }}
          >
            LOADING LANGUAGE MODEL............. {progressBarStr}
          </div>
        )}
      </div>
    </div>
  );
}
