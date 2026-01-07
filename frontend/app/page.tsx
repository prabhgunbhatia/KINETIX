"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useAnimation } from "framer-motion";
import { useRouter } from "next/navigation";
import { SplashScreen } from "@/components/splash-screen";
import { Heartbeat } from "@/components/heartbeat";
import { Loader2, ArrowRight } from "lucide-react";

// Strava Logo SVG Component
const StravaLogo = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.599h4.172L10.463 4l-7.02 13.828h4.169" />
  </svg>
);

// Garmin Logo SVG Component
const GarminLogo = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M12 2L2 7v10l10 5 10-5V7L12 2zm0 2.18l8 4v8.64l-8 4-8-4V8.18l8-4z" />
    <path d="M12 6.09L6.09 9v6L12 17.91 17.91 15V9L12 6.09zm0 2.18l4.73 2.36v4.74L12 15.64 7.27 13.37V8.63L12 6.27z" />
  </svg>
);

export default function LandingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [showContent, setShowContent] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 50, y: 50 });
  const [heartbeatPulse, setHeartbeatPulse] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const cardControls = useAnimation();
  const backgroundControls = useAnimation();

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        setMousePosition({ x, y });
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener("mousemove", handleMouseMove);
      return () => container.removeEventListener("mousemove", handleMouseMove);
    }
  }, [showContent]);

  const handleHeartbeatPulse = () => {
    // Trigger card scale animation on heartbeat spike
    cardControls.start({
      scale: [1, 1.01, 1],
      transition: { duration: 0.3, ease: "easeOut" },
    });

    // Trigger background flicker
    backgroundControls.start({
      opacity: [1, 0.98, 1],
      transition: { duration: 0.2, ease: "easeInOut" },
    });

    setHeartbeatPulse((prev) => prev + 1);
  };

  // Sync heartbeat pulse with card animation (trigger at spike moment ~1.75s)
  useEffect(() => {
    if (!showContent) return;

    const interval = setInterval(() => {
      // Trigger pulse at the spike moment (around 1.75s into the 3.5s cycle)
      setTimeout(() => {
        handleHeartbeatPulse();
      }, 1750);
    }, 3500); // Match heartbeat animation duration

    return () => clearInterval(interval);
  }, [showContent]);

  const handleStravaAuth = async () => {
    // Redirect to login first - OAuth requires authentication
    router.push("/login");
  };

  const handleGarminAuth = async () => {
    // Redirect to login first - OAuth requires authentication
    router.push("/login");
  };

  const handleGuestMode = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      router.push("/dashboard");
    }, 800);
  };

  const handleSignUp = () => {
    router.push("/signup");
  };

  const handleLogin = () => {
    router.push("/login");
  };

  if (!showContent) {
    return <SplashScreen onComplete={() => setShowContent(true)} />;
  }

  return (
    <AnimatePresence mode="wait">
      {!isTransitioning ? (
        <motion.div
          key="landing"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.1 }}
          transition={{ duration: 0.6 }}
          ref={containerRef}
          className="relative min-h-screen w-full overflow-hidden bg-[#0a0a0a]"
        >
          {/* Heartbeat Animation */}
          <Heartbeat onPulse={handleHeartbeatPulse} />

          {/* Background with Gradient Overlay */}
          <motion.div
            animate={backgroundControls}
            className="absolute inset-0 z-0"
          >
            <div
              className="absolute inset-0 bg-cover bg-center bg-no-repeat"
              style={{
                backgroundImage:
                  "url('https://images.unsplash.com/photo-1571008887538-b36bb32f4571?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80')",
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-b from-black/90 via-black/85 to-black/90" />
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900/30 via-transparent to-transparent" />

              {/* Mouse-following radial gradient */}
              <div
                className="absolute inset-0 transition-opacity duration-300"
                style={{
                  background: `radial-gradient(circle 600px at ${mousePosition.x}% ${mousePosition.y}%, rgba(255, 255, 255, 0.03) 0%, transparent 70%)`,
                }}
              />
            </div>
          </motion.div>

          {/* Minimalist Navigation Bar - Decoupled from animation */}
          <motion.nav
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="fixed top-0 left-0 right-0 z-50 w-full border-b border-white/5 bg-transparent/50 backdrop-blur-xl"
          >
            <div className="w-full px-6 sm:px-8 lg:px-12">
              <div className="flex h-16 items-center justify-between w-full">
                {/* Left: Brand */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                  className="text-lg font-black tracking-widest text-white"
                >
                  KINETIX
                </motion.div>

                {/* Center: Navigation Links */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.6, delay: 0.5 }}
                  className="hidden md:flex items-center gap-8 absolute left-1/2 transform -translate-x-1/2"
                >
                  <a
                    href="#"
                    className="text-base tracking-widest text-zinc-500 hover:text-white transition-colors"
                  >
                    SCIENCE
                  </a>
                  <a
                    href="#"
                    className="text-base tracking-widest text-zinc-500 hover:text-white transition-colors"
                  >
                    ELITE
                  </a>
                  <a
                    href="#"
                    className="text-base tracking-widest text-zinc-500 hover:text-white transition-colors"
                  >
                    FAQ
                  </a>
                </motion.div>

                {/* Right: System Status */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.6 }}
                  className="flex items-center gap-2"
                >
                  <motion.div
                    animate={{ opacity: [1, 0.5, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="h-2 w-2 rounded-full bg-emerald-500"
                  />
                  <span className="text-sm tracking-widest text-zinc-400">
                    System Status
                  </span>
                </motion.div>
              </div>
            </div>
          </motion.nav>

          {/* Hero Section - Centered over heartbeat */}
          <section className="relative z-10 flex min-h-screen items-center justify-center px-4 sm:px-6 lg:px-8 pt-16 pb-32">
            <div className="mx-auto max-w-5xl w-full">
              {/* Massive Title with Text Stroke Effect - Centered */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
                className="text-center mb-12"
              >
                <h1
                  className="text-9xl font-black tracking-tighter mb-6"
                  style={{
                    WebkitTextStroke: "1px rgba(255, 255, 255, 0.3)",
                    color: "transparent",
                    background:
                      "linear-gradient(to bottom, rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.4))",
                    WebkitBackgroundClip: "text",
                    backgroundClip: "text",
                  }}
                >
                  KINETIX
                </h1>
                <p className="text-xl sm:text-2xl text-zinc-400 font-light">
                  Performance Architecture. Master your workload, prevent
                  injury, and optimize every stride.
                </p>
              </motion.div>

              {/* Bento-style Sign-In Card - Centered over heartbeat with heavy blur */}
              <motion.div
                animate={cardControls}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{
                  opacity: [0, 1, 0.8, 1],
                  scale: [0.95, 1.02, 1, 1],
                }}
                viewport={{ once: true }}
                transition={{
                  duration: 1.2,
                  delay: 0.2,
                  times: [0, 0.3, 0.6, 1],
                  ease: "easeInOut",
                }}
                className="relative mx-auto max-w-md"
              >
                <div className="relative overflow-hidden rounded-xl border border-white/10 bg-black/60 backdrop-blur-3xl shadow-2xl">
                  {/* Flicker effect overlay */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 0.1, 0, 0.05, 0] }}
                    transition={{
                      duration: 1.2,
                      delay: 0.2,
                      times: [0, 0.2, 0.4, 0.6, 1],
                    }}
                    className="absolute inset-0 bg-white pointer-events-none"
                  />

                  {/* Inner glow */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent" />

                  <div className="relative p-10">
                    {/* Device Connection Options */}
                    <div className="space-y-3 mb-8">
                      {/* Strava Button */}
                      <motion.button
                        onClick={handleStravaAuth}
                        disabled={loading !== null}
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        className="group relative w-full flex items-center justify-center gap-3 px-8 py-4 rounded-xl bg-gradient-to-br from-[#FC6100] to-[#E85500] text-white font-semibold text-base shadow-lg shadow-[#FC6100]/30 transition-all duration-300 hover:shadow-[0_0_30px_rgba(252,97,0,0.5)] hover:from-[#FF6B1A] hover:to-[#FC6100] disabled:opacity-70 disabled:cursor-not-allowed"
                      >
                        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-white/0 via-white/20 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity" />
                        {loading === "strava" ? (
                          <>
                            <Loader2 className="h-5 w-5 animate-spin relative z-10" />
                            <span className="relative z-10">Connecting...</span>
                          </>
                        ) : (
                          <>
                            <StravaLogo className="h-6 w-6 relative z-10" />
                            <span className="relative z-10">
                              Connect with Strava
                            </span>
                            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1 relative z-10" />
                          </>
                        )}
                      </motion.button>

                      {/* Garmin Button */}
                      <motion.button
                        onClick={handleGarminAuth}
                        disabled={loading !== null}
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        className="group relative w-full flex items-center justify-center gap-3 px-8 py-4 rounded-xl border border-white/20 bg-gradient-to-br from-black/60 to-black/40 text-white font-semibold text-base shadow-lg backdrop-blur-xl transition-all duration-300 hover:from-black/80 hover:to-black/60 hover:border-white/30 hover:shadow-[0_0_25px_rgba(255,255,255,0.15)] disabled:opacity-70 disabled:cursor-not-allowed"
                      >
                        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-white/0 via-white/10 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity" />
                        {loading === "garmin" ? (
                          <>
                            <Loader2 className="h-5 w-5 animate-spin relative z-10" />
                            <span className="relative z-10">Connecting...</span>
                          </>
                        ) : (
                          <>
                            <GarminLogo className="h-6 w-6 relative z-10" />
                            <span className="relative z-10">
                              Connect with Garmin
                            </span>
                            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1 relative z-10" />
                          </>
                        )}
                      </motion.button>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-white/10 mb-8"></div>

                    {/* Sign Up and Login - Side by Side */}
                    <div className="flex gap-3 mb-4">
                      {/* Sign Up Button */}
                      <motion.button
                        onClick={handleSignUp}
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        className="group relative flex-1 flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl border border-white/20 bg-gradient-to-br from-white/10 to-white/5 text-white font-semibold text-sm shadow-lg backdrop-blur-xl transition-all duration-300 hover:from-white/20 hover:to-white/10 hover:border-white/30 hover:shadow-[0_0_20px_rgba(255,255,255,0.15)]"
                      >
                        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-white/0 via-white/10 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <span className="relative z-10">Sign Up</span>
                        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1 relative z-10" />
                      </motion.button>

                      {/* Login Button */}
                      <motion.button
                        onClick={handleLogin}
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        className="group relative flex-1 flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl border border-white/20 bg-gradient-to-br from-white/10 to-white/5 text-white font-semibold text-sm shadow-lg backdrop-blur-xl transition-all duration-300 hover:from-white/20 hover:to-white/10 hover:border-white/30 hover:shadow-[0_0_20px_rgba(255,255,255,0.15)]"
                      >
                        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-white/0 via-white/10 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <span className="relative z-10">Login</span>
                        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1 relative z-10" />
                      </motion.button>
                    </div>

                    {/* Continue as Guest */}
                    <motion.button
                      onClick={handleGuestMode}
                      whileHover={{ opacity: 0.8 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full text-sm text-zinc-400 font-medium hover:text-white transition-colors py-2.5"
                    >
                      Continue as Guest
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            </div>
          </section>
        </motion.div>
      ) : (
        <motion.div
          key="transition"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.1 }}
          transition={{ duration: 0.6 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0a0a]"
        >
          <motion.h1
            initial={{ scale: 1, opacity: 1 }}
            animate={{ scale: 1.5, opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="text-9xl font-black tracking-tighter bg-gradient-to-b from-white to-gray-500 bg-clip-text text-transparent"
          >
            KINETIX
          </motion.h1>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
