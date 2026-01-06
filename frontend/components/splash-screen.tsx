"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

interface SplashScreenProps {
  onComplete: () => void;
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
      setTimeout(onComplete, 500); // Wait for fade out animation
    }, 2500); // Show splash for 2.5 seconds

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <AnimatePresence>
      {showSplash && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0a0a]"
        >
          <div className="text-center w-full">
            {/* Title - Centered */}
            <motion.h1
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="text-7xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white via-gray-400 to-gray-600 sm:text-8xl lg:text-9xl mx-auto"
            >
              KINETIX
            </motion.h1>

            {/* Progress Bar */}
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "100%" }}
              transition={{ delay: 0.5, duration: 0.8, ease: "easeOut" }}
              className="mt-6 h-1 bg-gradient-to-r from-gray-400 via-gray-500 to-gray-600 mx-auto max-w-xs"
            />

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.6 }}
              className="mt-6 text-zinc-400 text-sm sm:text-base"
            >
              Performance Architecture
            </motion.p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
