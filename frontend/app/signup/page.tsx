"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getAuthToken } from "@/lib/auth";

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

export default function SignupPage() {
  const router = useRouter();
  const { register, isAuthenticated } = useAuth();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Redirect if already authenticated
  if (isAuthenticated && typeof window !== "undefined") {
    router.push("/dashboard");
    return null;
  }

  const handleStravaAuth = async () => {
    const token = getAuthToken();
    if (!token) {
      setError("Please create an account first to connect Strava");
      return;
    }
    setLoading("strava");
    await new Promise((resolve) => setTimeout(resolve, 500));
    window.location.href = "http://localhost:8000/auth/strava";
  };

  const handleGarminAuth = async () => {
    const token = getAuthToken();
    if (!token) {
      setError("Please create an account first to connect Garmin");
      return;
    }
    setLoading("garmin");
    await new Promise((resolve) => setTimeout(resolve, 500));
    window.location.href = "http://localhost:8000/auth/garmin";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    // Validate password length
    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    setLoading("signup");
    setError(null);
    
    try {
      console.log("Starting registration for:", formData.email);
      
      // Add timeout to prevent infinite loading
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Request timeout: Server took too long to respond")), 10000);
      });
      
      await Promise.race([
        register(formData.email, formData.password),
        timeoutPromise
      ]);
      
      console.log("Registration completed, redirecting...");
      // Navigation handled by AuthContext
      // Clear loading after a short delay to allow navigation
      setTimeout(() => setLoading(null), 100);
    } catch (err) {
      console.error("Registration error in signup page:", err);
      setError(err instanceof Error ? err.message : "Registration failed");
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 sm:p-10"
      >
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center">
              <span className="text-white font-bold text-lg">K</span>
            </div>
            <h1 className="text-3xl font-bold text-black">KINETIX</h1>
          </div>
          <h2 className="text-2xl font-bold text-black mb-2">
            Create an account
          </h2>
          <p className="text-gray-600 text-sm">
            Please enter your details to sign up
          </p>
        </div>

        {/* Social Login Buttons */}
        <div className="flex items-center justify-center gap-4 mb-6">
          {/* Strava Button */}
          <motion.button
            onClick={handleStravaAuth}
            disabled={loading !== null}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className="w-12 h-12 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center hover:shadow-md transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading === "strava" ? (
              <Loader2 className="h-5 w-5 animate-spin text-[#FC6100]" />
            ) : (
              <StravaLogo className="h-6 w-6 text-[#FC6100]" />
            )}
          </motion.button>

          {/* Garmin Button */}
          <motion.button
            onClick={handleGarminAuth}
            disabled={loading !== null}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className="w-12 h-12 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center hover:shadow-md transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading === "garmin" ? (
              <Loader2 className="h-5 w-5 animate-spin text-black" />
            ) : (
              <GarminLogo className="h-6 w-6 text-black" />
            )}
          </motion.button>
        </div>

        {/* OR Separator */}
        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-white text-gray-500">OR</span>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Signup Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email Field */}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Your Email Address
            </label>
            <input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              placeholder="Your Email Address"
              className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-zinc-800 focus:border-transparent transition-all"
              required
            />
          </div>

          {/* Password Field */}
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                placeholder="Password"
                className="w-full px-4 py-3 pr-12 rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-zinc-800 focus:border-transparent transition-all"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          {/* Confirm Password Field */}
          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Confirm Password
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={formData.confirmPassword}
                onChange={(e) =>
                  setFormData({ ...formData, confirmPassword: e.target.value })
                }
                placeholder="Confirm Password"
                className="w-full px-4 py-3 pr-12 rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-zinc-800 focus:border-transparent transition-all"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          {/* Sign Up Button */}
          <motion.button
            type="submit"
            disabled={loading === "signup"}
            whileHover={loading !== "signup" ? { scale: 1.02 } : {}}
            whileTap={loading !== "signup" ? { scale: 0.98 } : {}}
            className="w-full py-3.5 rounded-lg bg-gradient-to-r from-zinc-800 to-zinc-900 text-white font-semibold text-base shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading === "signup" ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Creating account...
              </>
            ) : (
              "Sign up"
            )}
          </motion.button>
        </form>

        {/* Login Link */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
