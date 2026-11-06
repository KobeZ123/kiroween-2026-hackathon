"use client";

interface PlaceholderTabProps {
  title: string;
  description: string;
}

export function PlaceholderTab({ title, description }: PlaceholderTabProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-2 opacity-40">
      <div
        className="text-lg font-bold tracking-widest"
        style={{ color: "var(--color-primary)" }}
      >
        [ {title} ]
      </div>
      <div
        className="text-xs tracking-wider"
        style={{ color: "var(--color-dim)" }}
      >
        {description}
      </div>
    </div>
  );
}
