"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface InjuryRiskBarProps {
  acwr: number; // ACWR ratio (0-2+)
  projectedAcwr?: number; // Optional projected ACWR for what-if scenarios
  className?: string;
}

export function InjuryRiskBar({ acwr, projectedAcwr, className }: InjuryRiskBarProps) {
  // Calculate needle position (0-100%)
  // Zones: Blue < 0.8 (0-40%), Green 0.8-1.3 (40-65%), Yellow 1.3-1.5 (65-80%), Red > 1.5 (80-100%)
  const getNeedlePosition = (value: number): number => {
    if (value <= 0) return 0;
    if (value < 0.8) {
      // Blue zone: 0-40%
      return (value / 0.8) * 40;
    } else if (value <= 1.3) {
      // Green zone: 40-65%
      return 40 + ((value - 0.8) / 0.5) * 25;
    } else if (value <= 1.5) {
      // Yellow zone: 65-80%
      return 65 + ((value - 1.3) / 0.2) * 15;
    } else {
      // Red zone: 80-100% (cap at 100%)
      return Math.min(100, 80 + ((value - 1.5) / 0.5) * 20);
    }
  };

  const currentPosition = getNeedlePosition(acwr);
  const projectedPosition = projectedAcwr !== undefined ? getNeedlePosition(projectedAcwr) : null;

  return (
    <div className={cn("w-full", className)}>
      {/* Multi-segmented progress bar */}
      <div className="relative h-6 rounded-lg overflow-hidden border border-white/10">
        {/* Background segments */}
        <div className="absolute inset-0 flex">
          {/* Blue zone: Under-training < 0.8 (0-40%) */}
          <div className="h-full bg-blue-500/30" style={{ width: "40%" }} />
          {/* Green zone: Optimal 0.8-1.3 (40-65%) */}
          <div className="h-full bg-emerald-500/30" style={{ width: "25%" }} />
          {/* Yellow zone: Caution 1.3-1.5 (65-80%) */}
          <div className="h-full bg-yellow-500/30" style={{ width: "15%" }} />
          {/* Red zone: High Risk > 1.5 (80-100%) */}
          <div className="h-full bg-rose-500/30" style={{ width: "20%" }} />
        </div>

        {/* Current needle indicator */}
        <motion.div
          initial={{ left: 0 }}
          animate={{ left: `${currentPosition}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg z-10"
          style={{ marginLeft: "-1px" }}
        >
          {/* Needle pointer */}
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-transparent border-t-white" />
        </motion.div>

        {/* Projected needle indicator (for what-if scenarios) */}
        {projectedPosition !== null && projectedPosition !== currentPosition && (
          <motion.div
            initial={{ left: `${currentPosition}%` }}
            animate={{ left: `${projectedPosition}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="absolute top-0 bottom-0 w-0.5 bg-yellow-400 shadow-lg z-20 opacity-70"
            style={{ marginLeft: "-1px" }}
          >
            {/* Projected needle pointer */}
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-transparent border-t-yellow-400" />
          </motion.div>
        )}
      </div>

      {/* Zone labels */}
      <div className="flex justify-between mt-2 text-xs text-zinc-400">
        <span className="text-blue-400">Under-training</span>
        <span className="text-emerald-400">Optimal</span>
        <span className="text-yellow-400">Caution</span>
        <span className="text-rose-400">High Risk</span>
      </div>

      {/* ACWR value display */}
      <div className="mt-2 text-center">
        <span className="text-sm font-semibold text-zinc-300">
          ACWR: {acwr.toFixed(2)}
        </span>
        {projectedAcwr !== undefined && projectedAcwr !== acwr && (
          <span className="text-sm text-yellow-400 ml-2">
            → {projectedAcwr.toFixed(2)}
          </span>
        )}
      </div>
    </div>
  );
}

