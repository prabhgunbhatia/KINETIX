"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

function GarminCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Connecting to Garmin...");

  useEffect(() => {
    const success = searchParams.get("success");
    const error = searchParams.get("error");

    if (success === "true") {
      setStatus("success");
      setMessage("Successfully connected to Garmin!");
      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        router.push("/dashboard");
      }, 2000);
    } else if (error) {
      setStatus("error");
      setMessage(`Connection failed: ${error}`);
      // Redirect to landing page after 3 seconds
      setTimeout(() => {
        router.push("/");
      }, 3000);
    }
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-zinc-900/80 backdrop-blur-xl border border-white/10 rounded-2xl p-8 max-w-md w-full mx-4"
      >
        <div className="flex flex-col items-center text-center space-y-4">
          {status === "loading" && (
            <>
              <Loader2 className="h-12 w-12 text-black animate-spin" />
              <h2 className="text-xl font-semibold text-white">Connecting...</h2>
              <p className="text-zinc-400">{message}</p>
            </>
          )}
          {status === "success" && (
            <>
              <CheckCircle2 className="h-12 w-12 text-emerald-500" />
              <h2 className="text-xl font-semibold text-white">Connected!</h2>
              <p className="text-zinc-400">{message}</p>
              <p className="text-sm text-zinc-500">Redirecting to dashboard...</p>
            </>
          )}
          {status === "error" && (
            <>
              <XCircle className="h-12 w-12 text-red-500" />
              <h2 className="text-xl font-semibold text-white">Connection Failed</h2>
              <p className="text-zinc-400">{message}</p>
              <p className="text-sm text-zinc-500">Redirecting to home...</p>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export default function GarminCallback() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 className="h-12 w-12 text-black animate-spin" />
      </div>
    }>
      <GarminCallbackContent />
    </Suspense>
  );
}



