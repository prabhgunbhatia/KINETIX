"use client";

import React from "react";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReadinessGaugeProps {
  acwr: number; // ACWR value (e.g., 1.25)
  className?: string;
}

export function ReadinessGauge({ acwr = 0, className }: ReadinessGaugeProps) {
  // ACWR logic: 0.8 to 1.3 is the "Sweet Spot" (Optimal)
  // Higher than 1.5 is High Risk
  const getStatus = (val: number) => {
    if (val === 0) return { label: "No Data", color: "#64748b", text: "text-slate-500", icon: Info };
    if (val < 0.8) return { label: "Under-training", color: "#3b82f6", text: "text-blue-400", icon: Info };
    if (val <= 1.3) return { label: "Optimal", color: "#10b981", text: "text-emerald-400", icon: CheckCircle2 };
    if (val <= 1.5) return { label: "Caution", color: "#f59e0b", text: "text-amber-400", icon: AlertTriangle };
    return { label: "High Risk", color: "#ef4444", text: "text-rose-400", icon: AlertTriangle };
  };

  const status = getStatus(acwr);
  
  // Math for the needle rotation (Mapping ACWR 0.0 - 2.0 to -90deg to +90deg)
  const clampedScore = Math.min(Math.max(acwr, 0), 2);
  const rotation = (clampedScore / 2) * 180 - 90;

  return (
    <div className={cn("flex flex-row items-center justify-center gap-4 w-full h-full", className)}>
      {/* Gauge on the left */}
      <div className="relative flex-shrink-0" style={{ width: "120px", height: "60px" }}>
        <svg viewBox="0 0 100 50" className="w-full h-full">
          <path
            d="M 10 50 A 40 40 0 0 1 90 50"
            fill="none"
            stroke="#1e293b"
            strokeWidth="8"
            strokeLinecap="round"
          />
          {/* Colored Progress Overlay */}
          <path
            d="M 10 50 A 40 40 0 0 1 90 50"
            fill="none"
            stroke={status.color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray="125.6"
            strokeDashoffset={125.6 - (125.6 * (clampedScore / 2))}
            className="transition-all duration-1000 ease-out"
          />
        </svg>

        {/* The Needle */}
        <div 
          className="absolute bottom-0 left-1/2 w-1 h-12 bg-white origin-bottom rounded-full transition-transform duration-1000 ease-out shadow-[0_0_10px_rgba(255,255,255,0.5)]"
          style={{ transform: `translateX(-50%) rotate(${rotation}deg)` }}
        >
          <div className="w-2.5 h-2.5 bg-white rounded-full absolute -bottom-1 -left-0.5 shadow-lg" />
        </div>
      </div>

      {/* Number and Status on the right */}
      <div className="flex-1 flex flex-col justify-center">
        <div className="flex items-center gap-2 mb-1">
          <status.icon className={`h-4 w-4 ${status.text}`} />
          <span className="text-3xl font-black text-white tabular-nums">
            {acwr.toFixed(2)}
          </span>
        </div>
        <p className={`text-xs uppercase tracking-wide font-semibold ${status.text}`}>
          {status.label}
        </p>
        {/* Legend Dots - compact */}
        <div className="flex gap-3 mt-2">
          <div className="flex items-center gap-1">
            <div className="w-1 h-1 rounded-full bg-blue-500" />
            <span className="text-[8px] text-slate-500 font-bold uppercase">Base</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-1 h-1 rounded-full bg-emerald-500" />
            <span className="text-[8px] text-slate-500 font-bold uppercase">Peak</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-1 h-1 rounded-full bg-rose-500" />
            <span className="text-[8px] text-slate-500 font-bold uppercase">Risk</span>
          </div>
        </div>
      </div>
    </div>
  );
}
