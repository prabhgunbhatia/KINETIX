"use client";

import { useState, ReactNode } from "react";
import { HelpCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface TooltipProps {
  content: string;
  className?: string;
  children?: ReactNode;
}

export function Tooltip({ content, className = "", children }: TooltipProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="inline-flex items-center cursor-help"
      >
        <HelpCircle className="h-4 w-4 text-zinc-500 hover:text-zinc-400 transition-colors" />
      </div>
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            transition={{ duration: 0.2 }}
            className={`absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-72 p-3 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl text-sm text-zinc-200 ${className}`}
          >
            <p className="mb-2">{content}</p>
            {children && <div className="mt-3">{children}</div>}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
              <div className="w-2 h-2 bg-zinc-800 border-r border-b border-zinc-700 transform rotate-45"></div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

