"use client";

import { cn } from "@/lib/utils";

interface DataScaleProps {
  value: number;
  ranges: Array<{ min: number; max: number | null; label: string; color: string }>;
  className?: string;
}

export function DataScale({ value, ranges, className }: DataScaleProps) {
  // Find which range the value falls into
  const currentRange = ranges.find(
    (range) => value >= range.min && (range.max === null || value < range.max)
  ) || ranges[ranges.length - 1];

  return (
    <div className={cn("w-full", className)}>
      {/* Horizontal selector bar with rounded corners */}
      <div className="relative flex items-center gap-0.5 p-0.5 bg-zinc-800/70 rounded-lg">
        {ranges.map((range, idx) => {
          const isActive = range === currentRange;

          return (
            <div
              key={idx}
              className={cn(
                "flex-1 flex items-center justify-center py-1.5 px-1 rounded-md transition-all duration-300 cursor-default shrink-0",
                isActive
                  ? "bg-teal-500 text-white font-medium"
                  : "text-zinc-400 hover:text-zinc-300"
              )}
            >
              <span className="text-xs font-medium whitespace-nowrap">{range.label}</span>
            </div>
          );
        })}
      </div>
      {/* Your level text */}
      <div className="mt-2 text-xs text-zinc-400 text-center">
        Your level: <span className="font-semibold text-white">{currentRange.label}</span>
      </div>
    </div>
  );
}

