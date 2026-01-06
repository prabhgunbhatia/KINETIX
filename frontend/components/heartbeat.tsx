"use client";

import { motion } from "framer-motion";

interface HeartbeatProps {
  onPulse?: () => void;
}

export function Heartbeat({ onPulse }: HeartbeatProps) {
  return (
    <div className="fixed bottom-8 left-0 right-0 z-[1] flex items-center justify-center pointer-events-none overflow-visible">
      <div className="w-full max-w-7xl px-4">
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 1000 100"
          preserveAspectRatio="none"
          className="opacity-60"
        >
          <defs>
            {/* Main Glow Filter */}
            <filter
              id="heart-glow"
              x="-20%"
              y="-20%"
              width="140%"
              height="140%"
            >
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            {/* Gradient for fading the line at the edges */}
            <linearGradient id="line-fade" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="white" stopOpacity="0" />
              <stop offset="10%" stopColor="white" stopOpacity="1" />
              <stop offset="90%" stopColor="white" stopOpacity="1" />
              <stop offset="100%" stopColor="white" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* 1. The Shadow/Ghost Line (Phosphor Trail) */}
          <motion.path
            d="M 0 50 L 480 50 L 490 55 L 500 5 L 515 95 L 530 50 L 560 35 L 590 50 L 1000 50"
            stroke="white"
            strokeWidth="1.5"
            fill="none"
            className="opacity-20 blur-[3px]"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "linear",
              repeatDelay: 0.5,
            }}
          />

          {/* 2. The Main EKG Line */}
          <motion.path
            d="M 0 50 L 480 50 L 490 55 L 500 5 L 515 95 L 530 50 L 560 35 L 590 50 L 1000 50"
            stroke="url(#line-fade)"
            strokeWidth="2.5"
            fill="none"
            filter="url(#heart-glow)"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "linear",
              repeatDelay: 0.5,
            }}
            onUpdate={(latest) => {
              // TypeScript Fix: Cast AnyResolvedKeyframe to number
              const progress = latest.pathLength as number;

              // Trigger pulse when the line hits the R-Spike (approx 0.40 progress)
              if (progress > 0.49 && progress < 0.51) {
                onPulse?.();
              }
            }}
          />
        </svg>
      </div>
    </div>
  );
}
