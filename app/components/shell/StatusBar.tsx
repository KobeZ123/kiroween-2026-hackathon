"use client";

import { useEffect, useState } from "react";

interface StatusBarProps {
  systemMessage?: string;
}

export function StatusBar({ systemMessage }: StatusBarProps) {
  const [time, setTime] = useState("");

  useEffect(() => {
    function updateClock() {
      const now = new Date();
      const h = now.getHours().toString().padStart(2, "0");
      const m = now.getMinutes().toString().padStart(2, "0");
      const s = now.getSeconds().toString().padStart(2, "0");
      setTime(`${h}:${m}:${s}`);
    }
    updateClock();
    const id = setInterval(updateClock, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className="flex items-center justify-between px-4 py-2 border-b"
      style={{ borderColor: "var(--color-border)" }}
    >
      {/* Left: app name */}
      <span
        className="glow font-bold tracking-widest text-sm"
        style={{ color: "var(--color-primary)" }}
      >
        READER.EXE
      </span>

      {/* Center: system message */}
      {systemMessage && (
        <span
          className="text-xs tracking-wider hidden sm:block"
          style={{ color: "var(--color-dim)" }}
        >
          {systemMessage}
        </span>
      )}

      {/* Right: status + clock */}
      <div className="flex items-center gap-4">
        <span
          className="text-xs tracking-wider"
          style={{ color: "var(--color-dim)" }}
        >
          SYSTEM ONLINE
          <span className="cursor-blink" style={{ color: "var(--color-primary)" }}>
            _
          </span>
        </span>
        <span
          className="text-xs font-mono"
          style={{ color: "var(--color-dim)" }}
        >
          {time}
        </span>
      </div>
    </div>
  );
}
