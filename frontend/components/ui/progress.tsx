"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ProgressProps {
  value: number; // ACWR ratio (0-2+)
  className?: string;
}

export function Progress({ value, className }: ProgressProps) {
  // Normalize value to 0-100 for display
  // ACWR typically ranges from 0-2, but we'll cap at 2 for display
  const normalizedValue = Math.min((value / 2) * 100, 100);

  // Determine color based on ACWR value
  const getColor = () => {
    if (value === 0) return "bg-zinc-500";
    if (value < 0.8) return "bg-yellow-500";
    if (value <= 1.3) return "bg-emerald-500";
    if (value <= 1.5) return "bg-orange-500";
    return "bg-rose-500";
  };

  const getBgColor = () => {
    if (value === 0) return "bg-zinc-500/20";
    if (value < 0.8) return "bg-yellow-500/20";
    if (value <= 1.3) return "bg-emerald-500/20";
    if (value <= 1.5) return "bg-orange-500/20";
    return "bg-rose-500/20";
  };

  return (
    <div className={cn("w-full", className)}>
      <div className={cn("h-3 rounded-full overflow-hidden", getBgColor())}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${normalizedValue}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className={cn("h-full rounded-full", getColor())}
        />
      </div>
      <div className="flex justify-between mt-2 text-xs text-zinc-400">
        <span>Low Risk</span>
        <span className="text-emerald-400">Optimal</span>
        <span className="text-orange-400">Caution</span>
        <span className="text-rose-400">High Risk</span>
      </div>
    </div>
  );
}
