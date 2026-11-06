"use client";

interface ReadingProgressBarProps {
  progress: number; // 0–100
}

export function ReadingProgressBar({ progress }: ReadingProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, progress));

  return (
    <div className="flex items-center gap-3 px-4 py-2">
      {/* Progress track */}
      <div
        className="flex-1 h-0.5 relative"
        style={{ backgroundColor: "var(--color-border)" }}
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Reading progress"
      >
        <div
          className="absolute inset-y-0 left-0 transition-all duration-300"
          style={{
            width: `${clamped}%`,
            backgroundColor: "var(--color-primary)",
            boxShadow: "0 0 4px rgba(57, 255, 20, 0.6)",
          }}
        />
      </div>

      {/* Percentage label */}
      <span
        className="text-xs font-mono shrink-0"
        style={{ color: "var(--color-dim)" }}
      >
        {clamped}% READ
      </span>
    </div>
  );
}
