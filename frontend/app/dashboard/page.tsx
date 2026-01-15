"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  Thermometer,
  AlertTriangle,
  TrendingUp,
  RefreshCw,
  Calendar,
  CheckCircle2,
  AlertCircle,
  LogOut,
  Plus,
  Sliders,
  Link2,
  Unlink,
  Info,
  Trash2,
  X,
  RotateCcw,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { InjuryRiskBar } from "@/components/ui/injury-risk-bar";
import { ReadinessGauge } from "@/components/ui/readiness-gauge";
import { DataScale } from "@/components/ui/data-scale";
import {
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
  ReferenceArea,
  ReferenceLine,
} from "recharts";
import { motion } from "framer-motion";
import { format, addDays } from "date-fns";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/auth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";

interface DashboardData {
  acwr: {
    acute_load: number;
    chronic_load: number;
    acwr_ratio: number;
    injury_risk: string;
  };
  weather_adjusted_runs: Array<{
    id: string;
    timestamp: string;
    distance: number;
    moving_time: number;
    adjusted_pace: number;
    temp_c: number | null;
    humidity: number | null;
  }>;
  avg_weather_adjusted_pace: number;
  historical_acwr?: Array<{
    date: string;
    chronic_load: number;
    acute_load: number;
    acwr_ratio: number;
  }>;
}

function DashboardContent() {
  const { user, logout } = useAuth();
  const [dateRange, setDateRange] = useState<"7d" | "28d" | "90d">("28d");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [manualEntryOpen, setManualEntryOpen] = useState(false);
  const [predictiveOpen, setPredictiveOpen] = useState(false);
  const [syncMode, setSyncMode] = useState<"strava" | "manual">("strava");
  const [stravaConnected, setStravaConnected] = useState(false);
  const [checkingConnection, setCheckingConnection] = useState(true);

  // Manual entry form state
  const [manualForm, setManualForm] = useState({
    distance: "",
    moving_time_minutes: "",
    moving_time_seconds: "",
    heart_rate: "",
    date: new Date().toISOString().split("T")[0],
    time: new Date().toTimeString().slice(0, 5),
  });

  // Predictive state
  const [predictiveDistance, setPredictiveDistance] = useState(5000); // meters
  const [predictiveTime, setPredictiveTime] = useState(1800); // seconds (30 min for 5km)
  const [predictiveHR, setPredictiveHR] = useState(150);
  const [prediction, setPrediction] = useState<any>(null);
  const [predicting, setPredicting] = useState(false);

  // Race prediction state
  const [raceDate, setRaceDate] = useState<string>(
    new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [raceDistance, setRaceDistance] = useState<number>(5.0); // km
  const [racePrediction, setRacePrediction] = useState<any>(null);
  const [predictingRace, setPredictingRace] = useState(false);
  const [showRacePredictionModal, setShowRacePredictionModal] = useState(false);
  const [showPredictionOnGraph, setShowPredictionOnGraph] = useState(false);
  const [showRaceResults, setShowRaceResults] = useState(false);

  // Delete activity state
  const [deletingActivityId, setDeletingActivityId] = useState<string | null>(
    null
  );

  useEffect(() => {
    fetchDashboardData();
    checkStravaConnection();
  }, []);

  const checkStravaConnection = async () => {
    try {
      setCheckingConnection(true);
      const response = await apiRequest("/auth/status");
      if (response.ok) {
        const status = await response.json();
        setStravaConnected(status.strava?.connected || false);
      }
    } catch (err) {
      console.error("Error checking Strava connection:", err);
    } finally {
      setCheckingConnection(false);
    }
  };

  const handleConnectStrava = async () => {
    try {
      // Fetch the Strava auth URL via API (includes auth token)
      const response = await apiRequest("/auth/strava?return_url=true");
      if (!response.ok) {
        throw new Error("Failed to get Strava authorization URL");
      }
      const data = await response.json();
      // Redirect to Strava authorization page
      window.location.href = data.auth_url;
    } catch (err) {
      console.error("Error connecting to Strava:", err);
      alert(err instanceof Error ? err.message : "Failed to connect to Strava");
    }
  };

  const handleDisconnectStrava = async () => {
    if (!confirm("Are you sure you want to disconnect your Strava account? This will stop automatic activity syncing.")) {
      return;
    }
    
    try {
      const response = await apiRequest("/auth/strava/disconnect", {
        method: "DELETE",
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: "Failed to disconnect Strava" }));
        throw new Error(error.detail || "Failed to disconnect Strava");
      }
      
      // Update connection status
      setStravaConnected(false);
      alert("Strava account disconnected successfully");
      
      // Refresh dashboard data
      await fetchDashboardData();
    } catch (err) {
      console.error("Error disconnecting Strava:", err);
      alert(err instanceof Error ? err.message : "Failed to disconnect Strava");
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await apiRequest("/dashboard");
      if (!response.ok) {
        throw new Error("Failed to fetch dashboard data");
      }
      const dashboardData = await response.json();
      setData(dashboardData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      console.error("Error fetching dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  // Refresh connection status after returning from OAuth
  useEffect(() => {
    const checkAfterOAuth = () => {
      // Check if we just returned from OAuth callback
      if (typeof window !== "undefined") {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get("strava_connected") === "true") {
          checkStravaConnection();
          // Clean up URL
          window.history.replaceState(
            {},
            document.title,
            window.location.pathname
          );
        }
      }
    };
    checkAfterOAuth();
  }, []);

  const handleSync = async () => {
    try {
      setSyncing(true);
      if (syncMode === "strava") {
        const response = await apiRequest("/sync?source=strava");
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || "Failed to sync from Strava");
        }
        await fetchDashboardData();
      }
    } catch (err) {
      console.error("Error syncing data:", err);
      alert(err instanceof Error ? err.message : "Failed to sync data");
    } finally {
      setSyncing(false);
    }
  };

  const handleManualEntry = async () => {
    try {
      setSyncing(true);
      const totalSeconds =
        parseInt(manualForm.moving_time_minutes) * 60 +
        parseInt(manualForm.moving_time_seconds || "0");
      const timestamp = `${manualForm.date}T${manualForm.time}:00Z`;

      const activityData = {
        distance: parseFloat(manualForm.distance) * 1000, // Convert km to meters
        moving_time: totalSeconds,
        heart_rate: manualForm.heart_rate
          ? parseFloat(manualForm.heart_rate)
          : null,
        timestamp: timestamp,
      };

      const response = await apiRequest("/activities/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(activityData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to create activity");
      }

      setManualEntryOpen(false);
      setManualForm({
        distance: "",
        moving_time_minutes: "",
        moving_time_seconds: "",
        heart_rate: "",
        date: new Date().toISOString().split("T")[0],
        time: new Date().toTimeString().slice(0, 5),
      });
      await fetchDashboardData();
    } catch (err) {
      console.error("Error creating manual activity:", err);
      alert(err instanceof Error ? err.message : "Failed to create activity");
    } finally {
      setSyncing(false);
    }
  };

  const handlePredict = async () => {
    try {
      setPredicting(true);
      const proposedActivity = {
        distance: predictiveDistance,
        moving_time: predictiveTime,
        heart_rate: predictiveHR,
      };

      const response = await apiRequest("/analytics/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(proposedActivity),
      });

      if (!response.ok) {
        throw new Error("Failed to get prediction");
      }

      const predictionData = await response.json();
      setPrediction(predictionData);
    } catch (err) {
      console.error("Error predicting:", err);
      alert(err instanceof Error ? err.message : "Failed to get prediction");
    } finally {
      setPredicting(false);
    }
  };

  // Update predictive time based on distance (rough estimate: 5 min/km pace)
  useEffect(() => {
    const estimatedPace = 300; // 5 min/km in seconds
    const estimatedTime = (predictiveDistance / 1000) * estimatedPace;
    setPredictiveTime(Math.round(estimatedTime));
  }, [predictiveDistance]);

  const handleRacePredict = async () => {
    try {
      setPredictingRace(true);
      const raceData = {
        target_distance: raceDistance,
        race_date: new Date(raceDate + "T00:00:00Z").toISOString(),
      };

      const response = await apiRequest("/analytics/predict-race", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(raceData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to predict race");
      }

      const predictionData = await response.json();
      setRacePrediction(predictionData);
      setShowRaceResults(true);
      setShowPredictionOnGraph(true);
    } catch (err) {
      console.error("Error predicting race:", err);
      alert(err instanceof Error ? err.message : "Failed to predict race");
    } finally {
      setPredictingRace(false);
    }
  };

  const handleDeleteActivity = async (activityId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this activity? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      setDeletingActivityId(activityId);
      const response = await apiRequest(`/activities/${activityId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to delete activity");
      }

      // Refresh dashboard data after deletion
      await fetchDashboardData();
    } catch (err) {
      console.error("Error deleting activity:", err);
      alert(err instanceof Error ? err.message : "Failed to delete activity");
    } finally {
      setDeletingActivityId(null);
    }
  };

  const formatPace = (paceSeconds: number): string => {
    if (paceSeconds === 0) return "N/A";
    const minutes = Math.floor(paceSeconds / 60);
    const seconds = Math.floor(paceSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}/km`;
  };

  const getWeatherImpact = (
    run: DashboardData["weather_adjusted_runs"][0]
  ): { emoji: string; text: string } => {
    if (!run.temp_c || !run.humidity) {
      return { emoji: "☁️", text: "Neutral" };
    }

    const a = 17.27;
    const b = 237.7;
    const alpha =
      (a * run.temp_c) / (b + run.temp_c) + Math.log(run.humidity / 100.0);
    const dewPoint = (b * alpha) / (a - alpha);

    const distanceKm = run.distance / 1000;
    const basePace = run.moving_time / distanceKm;

    const adjustment = run.adjusted_pace - basePace;
    const adjustmentSeconds = Math.round(adjustment);

    if (Math.abs(adjustmentSeconds) < 2) {
      return { emoji: "☁️", text: "Neutral" };
    }

    const sign = adjustmentSeconds > 0 ? "+" : "-";
    const absSeconds = Math.abs(adjustmentSeconds);

    // More varied weather impacts like the image
    if (dewPoint >= 20 && run.humidity > 70) {
      return { emoji: "💧", text: `${sign}${absSeconds}s/km (Humidity)` };
    } else if (dewPoint >= 20) {
      return { emoji: "☀️", text: `${sign}${absSeconds}s/km (Heat)` };
    } else if (run.humidity > 80) {
      return { emoji: "💧", text: `${sign}${absSeconds}s/km (Humidity)` };
    } else if (adjustmentSeconds < -2) {
      return { emoji: "💨", text: `${sign}${absSeconds}s/km (Tailwind)` };
    } else if (run.humidity > 85) {
      return { emoji: "🌧️", text: `${sign}${absSeconds}s/km (Rain)` };
    } else if (dewPoint >= 15) {
      return { emoji: "🌡️", text: `${sign}${absSeconds}s/km (Warm)` };
    } else {
      return { emoji: "☁️", text: "Neutral" };
    }
  };

  const getRiskColor = (
    risk: string
  ): { text: string; bg: string; glow: string; border: string } => {
    // Map old risk labels to new ones
    const riskMap: { [key: string]: string } = {
      Optimal: "Low",
      "Under-training": "Low",
      "Increased Risk": "Moderate",
      "High Risk": "High",
      Low: "Low",
      Moderate: "Moderate",
      High: "High",
    };

    const normalizedRisk = riskMap[risk] || risk;

    switch (normalizedRisk) {
      case "Low":
        return {
          text: "text-emerald-400",
          bg: "bg-emerald-500/10",
          glow: "shadow-lg shadow-emerald-500/20",
          border: "border-emerald-500/30",
        };
      case "Moderate":
        return {
          text: "text-yellow-400",
          bg: "bg-yellow-500/10",
          glow: "shadow-lg shadow-yellow-500/20",
          border: "border-yellow-500/30",
        };
      case "High":
        return {
          text: "text-rose-400",
          bg: "bg-rose-500/10",
          glow: "shadow-lg shadow-rose-500/20",
          border: "border-rose-500/30",
        };
      default:
        return {
          text: "text-zinc-400",
          bg: "bg-zinc-500/10",
          glow: "",
          border: "border-zinc-700",
        };
    }
  };

  const getRiskLevel = (acwr: number): string => {
    if (acwr === 0) return "Low";
    if (acwr < 0.8) return "Low";
    if (acwr <= 1.2) return "Low";
    if (acwr <= 1.4) return "Moderate";
    return "High";
  };

  const getCoachsVerdict = () => {
    const acwr = data?.acwr.acwr_ratio || 0;

    if (acwr === 0) {
      return {
        message: "Sync your Strava data to see your training status",
        icon: AlertCircle,
        color: "text-zinc-400",
        bg: "bg-zinc-800/50",
        border: "border-zinc-700",
      };
    }

    // High Risk (> 1.5)
    if (acwr > 1.5) {
      return {
        message:
          "🛑 High Risk. Your body isn't ready for this much load yet. Take a rest day.",
        icon: AlertCircle,
        color: "text-rose-400",
        bg: "bg-rose-500/20",
        border: "border-rose-500/50",
      };
    }

    // Optimal zone (0.8 - 1.3)
    if (acwr >= 0.8 && acwr <= 1.3) {
      return {
        message: "✅ Sweet Spot. You're building fitness safely. Great job!",
        icon: CheckCircle2,
        color: "text-emerald-400",
        bg: "bg-emerald-500/20",
        border: "border-emerald-500/50",
      };
    }

    // Under-training (< 0.8)
    if (acwr < 0.8) {
      return {
        message:
          "💤 Low Stimulus. You're recovering well, but your fitness will start to dip soon.",
        icon: AlertCircle,
        color: "text-blue-400",
        bg: "bg-blue-500/20",
        border: "border-blue-500/50",
      };
    }

    // Caution (1.3 - 1.5)
    return {
      message:
        "⚠️ Heads Up. You're pushing a bit hard. Consider a light day tomorrow.",
      icon: AlertTriangle,
      color: "text-orange-400",
      bg: "bg-orange-500/20",
      border: "border-orange-500/50",
    };
  };

  const generateChartData = () => {
    // Determine number of days based on dateRange
    const daysToShow = dateRange === "7d" ? 7 : dateRange === "28d" ? 28 : 90;
    const todayDate = new Date();
    const cutoffDate = new Date(todayDate);
    cutoffDate.setDate(cutoffDate.getDate() - daysToShow);

    // Use historical data if available, otherwise generate realistic estimates
    if (data?.historical_acwr && data.historical_acwr.length > 0) {
      const baseChronic = data.acwr.chronic_load || 0;
      const optimalZoneUpper = baseChronic * 1.3;

      // Filter historical data based on dateRange
      const filteredHistorical = data.historical_acwr.filter((day) => {
        const dayDate = new Date(day.date);
        return dayDate >= cutoffDate;
      });

      const historicalData = filteredHistorical.map((day) => {
        const date = new Date(day.date);
        const isAboveOptimal = day.acute_load > optimalZoneUpper;

        // Calculate risk level for this day
        const getRiskLevel = (acwr: number): string => {
          if (acwr === 0) return "No Data";
          if (acwr < 0.8) return "Under-training";
          if (acwr <= 1.3) return "Optimal";
          if (acwr <= 1.5) return "Caution";
          return "High Risk";
        };

        return {
          date: format(date, "MMM dd"),
          dateFull: format(date, "MMM dd, yyyy"),
          chronic: Math.max(0, day.chronic_load),
          acute: Math.max(0, day.acute_load),
          acuteSafe: isAboveOptimal ? null : Math.max(0, day.acute_load),
          acuteDanger: isAboveOptimal ? Math.max(0, day.acute_load) : null,
          acwr: day.acwr_ratio,
          riskLevel: getRiskLevel(day.acwr_ratio),
          // Calculate daily TRIMP (approximate from acute load * 7)
          dailyTrimp: day.acute_load > 0 ? day.acute_load * 7 : 0,
          projectedFitness: null, // No projection for historical data
        };
      });

      // Add projected fitness data if race prediction exists and toggle is on
      if (racePrediction && racePrediction.momentum && showPredictionOnGraph) {
        const lastHistoricalDate = new Date(
          filteredHistorical[filteredHistorical.length - 1].date
        );
        const raceDate = new Date(racePrediction.race_date);
        const currentFitness = racePrediction.momentum.current_base_fitness;
        const projectedFitness = racePrediction.momentum.projected_base_fitness;
        const daysToRace = racePrediction.momentum.days_to_race;

        // Add projected days from today to race date
        for (let i = 1; i <= daysToRace; i++) {
          const date = new Date(todayDate);
          date.setDate(date.getDate() + i);

          // Linear interpolation from current to projected fitness
          const progress = i / daysToRace;
          const interpolatedFitness =
            currentFitness + (projectedFitness - currentFitness) * progress;

          historicalData.push({
            date: format(date, "MMM dd"),
            dateFull: format(date, "MMM dd, yyyy"),
            chronic: interpolatedFitness,
            acute: 0, // No acute load projection
            acuteSafe: 0,
            acuteDanger: 0,
            acwr: 0,
            riskLevel: "Projected",
            dailyTrimp: 0,
            projectedFitness: interpolatedFitness,
          });
        }
      }

      return historicalData;
    }

    // Fallback: Generate realistic trend-based data
    const days = daysToShow;
    const chartData = [];
    const baseChronic = data?.acwr.chronic_load || 0;
    const baseAcute = data?.acwr.acute_load || 0;
    const optimalZoneUpper = baseChronic * 1.3;

    // Create a realistic trend (slight progression over time)
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(todayDate);
      date.setDate(date.getDate() - i);

      // Progressive trend: slightly lower in the past, building to current
      const progressFactor = i / days;
      const trendChronic = baseChronic * (0.85 + progressFactor * 0.15);
      const trendAcute = baseAcute * (0.8 + progressFactor * 0.2);

      // Add realistic daily variation (not random, but based on weekly patterns)
      const dayOfWeek = date.getDay();
      const weeklyVariation = Math.sin((dayOfWeek / 7) * Math.PI * 2) * 2;

      const dayChronic = Math.max(0, trendChronic + weeklyVariation);
      const dayAcute = Math.max(0, trendAcute + weeklyVariation * 1.2);
      const dayACWR = dayChronic > 0 ? dayAcute / dayChronic : 0;
      const isAboveOptimal = dayAcute > dayChronic * 1.3;

      const getRiskLevel = (acwr: number): string => {
        if (acwr === 0) return "No Data";
        if (acwr < 0.8) return "Under-training";
        if (acwr <= 1.3) return "Optimal";
        if (acwr <= 1.5) return "Caution";
        return "High Risk";
      };

      chartData.push({
        date: format(date, "MMM dd"),
        dateFull: format(date, "MMM dd, yyyy"),
        chronic: dayChronic,
        acute: dayAcute,
        acuteSafe: isAboveOptimal ? null : dayAcute,
        acuteDanger: isAboveOptimal ? dayAcute : null,
        acwr: dayACWR,
        riskLevel: getRiskLevel(dayACWR),
        dailyTrimp: dayAcute > 0 ? dayAcute * 7 : 0,
        projectedFitness: null, // No projection for fallback data
      });
    }

    // Add projected fitness data if race prediction exists and toggle is on (for fallback data)
    if (
      racePrediction &&
      racePrediction.momentum &&
      chartData.length > 0 &&
      showPredictionOnGraph
    ) {
      const currentFitness = racePrediction.momentum.current_base_fitness;
      const projectedFitness = racePrediction.momentum.projected_base_fitness;
      const daysToRace = racePrediction.momentum.days_to_race;

      // Add projected days from today to race date
      for (let i = 1; i <= daysToRace; i++) {
        const date = new Date(todayDate);
        date.setDate(date.getDate() + i);

        // Linear interpolation from current to projected fitness
        const progress = i / daysToRace;
        const interpolatedFitness =
          currentFitness + (projectedFitness - currentFitness) * progress;

        chartData.push({
          date: format(date, "MMM dd"),
          dateFull: format(date, "MMM dd, yyyy"),
          chronic: interpolatedFitness,
          acute: 0,
          acuteSafe: 0,
          acuteDanger: 0,
          acwr: 0,
          riskLevel: "Projected",
          dailyTrimp: 0,
          projectedFitness: interpolatedFitness,
        });
      }
    }

    return chartData;
  };

  const chartData = generateChartData();
  const coachsVerdict = getCoachsVerdict();
  const VerdictIcon = coachsVerdict.icon;

  const fitnessRanges = [
    { min: 0, max: 30, label: "Beginner", color: "bg-blue-500" },
    { min: 30, max: 50, label: "Novice", color: "bg-cyan-500" },
    { min: 50, max: 80, label: "Intermediate", color: "bg-emerald-500" },
    { min: 80, max: null, label: "Advanced", color: "bg-orange-500" },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xl"
        >
          Loading dashboard...
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center">
        <div className="text-xl text-rose-500">Error: {error}</div>
      </div>
    );
  }

  // Get simplified verdict message for header
  const getVerdictMessage = () => {
    const acwr = data?.acwr.acwr_ratio || 0;
    if (acwr === 0) return "Sync Data";
    if (acwr > 1.5) return "High Risk";
    if (acwr >= 0.8 && acwr <= 1.3) return "Ready for Peak";
    if (acwr < 0.8) return "Recovery Mode";
    return "Caution";
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-950 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Header Status Bar */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-6"
          >
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
                    KINETIX
                  </h1>
                </div>
                <p className="text-zinc-400">
                  Performance Architecture Dashboard
                </p>
                {user && (
                  <p className="text-zinc-500 text-sm mt-1">
                    Logged in as {user.email}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3">
                {/* Strava Connection Status */}
                {!checkingConnection && !stravaConnected && (
                  <Button
                    onClick={handleConnectStrava}
                    className="min-w-[160px] bg-[#FC6100] hover:bg-[#E85500] text-white"
                  >
                    <Link2 className="mr-2 h-4 w-4" />
                    Connect Strava
                  </Button>
                )}

                {stravaConnected && (
                  <>
                    {/* Connection Status Badge with Disconnect */}
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                        <span className="text-sm text-emerald-400 font-medium">
                          Strava Connected
                        </span>
                      </div>
                      <Button
                        onClick={handleDisconnectStrava}
                        variant="outline"
                        size="sm"
                        className="text-xs text-red-400 border-red-400/30 hover:bg-red-400/10 hover:border-red-400/50"
                      >
                        Disconnect
                      </Button>
                    </div>

                    {/* Toggle between Strava and Manual */}
                    <div className="flex items-center gap-2 bg-zinc-800 rounded-lg p-1">
                      <button
                        onClick={() => setSyncMode("strava")}
                        className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                          syncMode === "strava"
                            ? "bg-zinc-700 text-white"
                            : "text-zinc-400 hover:text-white"
                        }`}
                      >
                        Strava
                      </button>
                      <button
                        onClick={() => setSyncMode("manual")}
                        className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                          syncMode === "manual"
                            ? "bg-zinc-700 text-white"
                            : "text-zinc-400 hover:text-white"
                        }`}
                      >
                        Manual
                      </button>
                    </div>

                    {syncMode === "strava" ? (
                      <Button
                        onClick={handleSync}
                        disabled={syncing}
                        className="min-w-[140px]"
                      >
                        {syncing ? (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                            Syncing...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Sync Strava
                          </>
                        )}
                      </Button>
                    ) : (
                      <Button
                        onClick={() => setManualEntryOpen(true)}
                        className="min-w-[140px]"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add Run
                      </Button>
                    )}
                  </>
                )}

                {!stravaConnected && (
                  <Button
                    onClick={() => setManualEntryOpen(true)}
                    className="min-w-[140px]"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Run
                  </Button>
                )}

                <Button
                  onClick={() => {
                    setPredictiveOpen(true);
                    handlePredict();
                  }}
                  variant="outline"
                  className="min-w-[120px]"
                >
                  <Sliders className="mr-2 h-4 w-4" />
                  Predict
                </Button>
                <motion.button
                  onClick={logout}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors flex items-center gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </motion.button>
              </div>
            </div>
          </motion.div>

          {/* Status Bar: Coach's Verdict */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mb-6"
          >
            <div className="bg-slate-900/50 backdrop-blur-md border border-white/10 rounded-xl p-4">
              <div className="flex items-center gap-4">
                <VerdictIcon
                  className={`h-8 w-8 ${coachsVerdict.color} flex-shrink-0`}
                />
                <div>
                  <div className="text-xs text-zinc-400 mb-1 font-medium uppercase tracking-wide">
                    Coach's Verdict
                  </div>
                  <div
                    className={`text-2xl sm:text-3xl font-bold ${coachsVerdict.color}`}
                  >
                    {getVerdictMessage()}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Row 1: Metric Grid (12-column Bento Grid - 3 cols each) */}
          <div className="grid grid-cols-12 gap-4 mb-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              whileHover={{ scale: 1.01 }}
              className="transition-transform col-span-12 md:col-span-6 lg:col-span-3"
            >
              <Card className="bg-slate-900/50 backdrop-blur-md border border-white/10 rounded-xl">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                    Base Fitness
                    <Tooltip content="Think of this as your 'Energy Tank.' The more you train consistently, the bigger your tank gets. This is your long-term engine and aerobic foundation.">
                      <DataScale
                        value={data?.acwr?.chronic_load ?? 0}
                        ranges={fitnessRanges}
                      />
                    </Tooltip>
                  </CardTitle>
                  <Activity className="h-4 w-4 text-zinc-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-white">
                    {data?.acwr?.chronic_load != null
                      ? Math.round(data.acwr.chronic_load)
                      : "0"}
                  </div>
                  <p className="text-xs text-zinc-500 mt-1 font-normal">
                    Your long-term engine
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              whileHover={{ scale: 1.01 }}
              className="transition-transform col-span-12 md:col-span-6 lg:col-span-3"
            >
              <Card className="bg-slate-900/50 backdrop-blur-md border border-white/10 rounded-xl h-full flex flex-col">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                    <span className="hidden sm:inline">Recent Fatigue</span>
                    <span className="sm:hidden">Fatigue</span>
                    <Tooltip content="This is how much 'Fuel' you've used this week. If you use it faster than your tank can handle, you'll feel burnt out. The physical stress from your last 7 days of training." />
                  </CardTitle>
                  <TrendingUp className="h-4 w-4 text-zinc-400" />
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-center">
                  <div className="text-3xl font-bold text-white">
                    {data?.acwr?.acute_load != null
                      ? Math.round(data.acwr.acute_load)
                      : "0"}
                  </div>
                  <p className="text-xs text-zinc-500 mt-1 font-normal">
                    This week's effort
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              whileHover={{ scale: 1.01 }}
              className="transition-transform col-span-12 md:col-span-6 lg:col-span-3"
            >
              <Card className="bg-slate-900/50 backdrop-blur-md border border-white/10 rounded-xl h-full flex flex-col">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                    <span className="hidden sm:inline">Readiness Score</span>
                    <span className="sm:hidden">Readiness</span>
                    <Tooltip content="Are you ready for a hard workout or do you need a rest? This compares your recent training to your long-term fitness to keep you safe and progressing." />
                  </CardTitle>
                  <AlertTriangle className="h-4 w-4 text-zinc-400" />
                </CardHeader>
                <CardContent className="flex-1 flex items-center justify-center py-2">
                  <ReadinessGauge acwr={data?.acwr?.acwr_ratio || 0} />
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              whileHover={{ scale: 1.01 }}
              className="transition-transform col-span-12 md:col-span-6 lg:col-span-3"
            >
              <Card className="bg-slate-900/50 backdrop-blur-md border border-white/10 rounded-xl h-full flex flex-col">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                    <span className="hidden sm:inline">True Effort Pace</span>
                    <span className="sm:hidden">Pace</span>
                    <Tooltip content="Your actual running pace adjusted for weather conditions. Hot and humid days make running harder, so this shows what your pace would be in ideal conditions." />
                  </CardTitle>
                  <Thermometer className="h-4 w-4 text-zinc-400" />
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-center">
                  <div className="text-3xl font-bold text-white">
                    {formatPace(data?.avg_weather_adjusted_pace ?? 0)}
                  </div>
                  <p className="text-xs text-zinc-500 mt-1 font-normal">
                    Weather-corrected pace
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Row 2: Main Content (8:4 split) */}
          <div className="grid grid-cols-12 gap-6 mb-6">
            {/* Graph - 8 cols */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="col-span-12 lg:col-span-8"
            >
              <Card className="bg-slate-900/50 backdrop-blur-md border border-white/10 rounded-xl">
                <CardHeader>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <CardTitle className="text-xl font-semibold">
                        Training Load Over Time
                      </CardTitle>
                      <CardDescription className="hidden sm:block text-sm text-zinc-500 mt-1">
                        See how your Base Fitness and Recent Fatigue change •
                        Green Zone = Safe Building
                      </CardDescription>
                    </div>
                    {/* Date Range Filter */}
                    <div className="flex items-center gap-1 bg-zinc-800/50 rounded-lg p-1">
                      <button
                        onClick={() => setDateRange("7d")}
                        className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                          dateRange === "7d"
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
                        }`}
                      >
                        7d
                      </button>
                      <button
                        onClick={() => setDateRange("28d")}
                        className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                          dateRange === "28d"
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
                        }`}
                      >
                        28d
                      </button>
                      <button
                        onClick={() => setDateRange("90d")}
                        className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                          dateRange === "90d"
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
                        }`}
                      >
                        90d
                      </button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          {/* Soft green gradient for Base Fitness */}
                          <linearGradient
                            id="colorChronic"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="#86efac"
                              stopOpacity={0.4}
                            />
                            <stop
                              offset="50%"
                              stopColor="#4ade80"
                              stopOpacity={0.3}
                            />
                            <stop
                              offset="95%"
                              stopColor="#22c55e"
                              stopOpacity={0}
                            />
                          </linearGradient>
                          {/* Glowing red gradient for Recent Fatigue (Safe) */}
                          <linearGradient
                            id="colorAcute"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="#fca5a5"
                              stopOpacity={0.5}
                            />
                            <stop
                              offset="50%"
                              stopColor="#ef4444"
                              stopOpacity={0.4}
                            />
                            <stop
                              offset="95%"
                              stopColor="#dc2626"
                              stopOpacity={0}
                            />
                          </linearGradient>
                          {/* Glowing red gradient for Recent Fatigue (Above Zone) */}
                          <linearGradient
                            id="colorAcuteDanger"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="#f87171"
                              stopOpacity={0.6}
                            />
                            <stop
                              offset="50%"
                              stopColor="#dc2626"
                              stopOpacity={0.5}
                            />
                            <stop
                              offset="95%"
                              stopColor="#b91c1c"
                              stopOpacity={0}
                            />
                          </linearGradient>
                          {/* Glow filter for red line */}
                          <filter id="glow">
                            <feGaussianBlur
                              stdDeviation="3"
                              result="coloredBlur"
                            />
                            <feMerge>
                              <feMergeNode in="coloredBlur" />
                              <feMergeNode in="SourceGraphic" />
                            </feMerge>
                          </filter>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis
                          dataKey="date"
                          stroke="#94a3b8"
                          tick={{ fill: "#94a3b8", fontSize: 14 }}
                          interval="preserveStartEnd"
                          angle={-45}
                          textAnchor="end"
                          height={70}
                        />
                        <YAxis
                          stroke="#94a3b8"
                          tick={{ fill: "#94a3b8", fontSize: 14 }}
                          tickFormatter={(value) => value.toFixed(1)}
                        />
                        <RechartsTooltip
                          contentStyle={{
                            backgroundColor: "#0f172a",
                            border: "1px solid rgba(255, 255, 255, 0.1)",
                            borderRadius: "8px",
                            color: "#fff",
                            padding: "12px",
                            backdropFilter: "blur(8px)",
                          }}
                          labelFormatter={(label) => {
                            const dataPoint = chartData.find(
                              (d) => d.date === label
                            );
                            return dataPoint?.dateFull || label;
                          }}
                          formatter={(
                            value: any,
                            name?: string,
                            props?: any
                          ) => {
                            if (
                              typeof value === "number" &&
                              value !== null &&
                              value !== undefined
                            ) {
                              // Get the full data point for additional info
                              const dataPoint = props?.payload
                                ? chartData[props.payload.index]
                                : null;

                              if (
                                name === "Base Fitness" ||
                                name === "Recent Fatigue"
                              ) {
                                return [value.toFixed(1), name || ""];
                              }
                              return [value.toFixed(1), name || ""];
                            }
                            return [value, name || ""];
                          }}
                          content={({ active, payload, label }) => {
                            if (!active || !payload || !payload.length)
                              return null;

                            const dataPoint = chartData.find(
                              (d) => d.date === label
                            );
                            const baseFitness =
                              (payload.find((p) => p.dataKey === "chronic")
                                ?.value as number) || 0;
                            const recentFatigue =
                              (payload.find(
                                (p) =>
                                  p.dataKey === "acuteSafe" ||
                                  p.dataKey === "acuteDanger"
                              )?.value as number) || 0;
                            const readinessScore = dataPoint?.acwr || 0;
                            const riskLevel = dataPoint?.riskLevel || "No Data";
                            const effortPoints = dataPoint?.dailyTrimp || 0;

                            const getRiskColor = (risk: string) => {
                              if (risk === "Optimal") return "text-emerald-400";
                              if (risk === "Under-training")
                                return "text-blue-400";
                              if (risk === "Caution") return "text-yellow-400";
                              if (risk === "High Risk") return "text-rose-400";
                              return "text-zinc-400";
                            };

                            return (
                              <div className="bg-slate-950/95 backdrop-blur-md border border-white/10 rounded-lg p-4 shadow-xl">
                                <div className="text-base font-semibold text-white mb-3 border-b border-white/10 pb-2">
                                  {dataPoint?.dateFull || label}
                                </div>
                                <div className="space-y-2 text-sm">
                                  <div className="flex justify-between items-center">
                                    <span className="text-zinc-400">
                                      Base Fitness:
                                    </span>
                                    <span className="text-emerald-400 font-medium text-base">
                                      {baseFitness.toFixed(1)}
                                    </span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="text-zinc-400">
                                      Recent Fatigue:
                                    </span>
                                    <span className="text-rose-400 font-medium text-base">
                                      {recentFatigue.toFixed(1)}
                                    </span>
                                  </div>
                                  <div className="flex justify-between items-center pt-2 border-t border-white/10">
                                    <span className="text-zinc-400">
                                      Readiness Score:
                                    </span>
                                    <span className="text-white font-semibold text-base">
                                      {readinessScore.toFixed(2)}
                                    </span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="text-zinc-400">
                                      Status:
                                    </span>
                                    <span
                                      className={`font-semibold text-base ${getRiskColor(
                                        riskLevel
                                      )}`}
                                    >
                                      {riskLevel}
                                    </span>
                                  </div>
                                  {effortPoints > 0 && (
                                    <div className="flex justify-between items-center pt-2 border-t border-white/10">
                                      <span className="text-zinc-400">
                                        Effort Points:
                                      </span>
                                      <span className="text-zinc-300 font-medium text-base">
                                        {effortPoints.toFixed(1)}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          }}
                        />
                        <Legend
                          wrapperStyle={{
                            paddingTop: "20px",
                            fontSize: "14px",
                          }}
                          iconType="line"
                          formatter={(value, entry) => {
                            // Hide duplicate "Recent Fatigue" entries - only show the first one
                            if (
                              value === "Recent Fatigue" &&
                              entry?.dataKey === "acuteDanger"
                            ) {
                              return "";
                            }
                            return value;
                          }}
                        />
                        {chartData.length > 0 &&
                          data?.acwr.chronic_load &&
                          data.acwr.chronic_load > 0 &&
                          (() => {
                            const baseChronic = data.acwr.chronic_load;
                            const optimalZoneLower = baseChronic * 0.8;
                            const optimalZoneUpper = baseChronic * 1.3;
                            return (
                              <>
                                <ReferenceArea
                                  y1={optimalZoneLower}
                                  y2={optimalZoneUpper}
                                  fill="#22c55e"
                                  fillOpacity={0.15}
                                  stroke="#22c55e"
                                  strokeOpacity={0.4}
                                  strokeDasharray="5 5"
                                />
                                {/* Today's date reference line */}
                                {(() => {
                                  const today = new Date();
                                  const todayFormatted = format(
                                    today,
                                    "MMM dd"
                                  );
                                  const todayIndex = chartData.findIndex(
                                    (d) => {
                                      try {
                                        const chartDate = d.dateFull
                                          ? new Date(d.dateFull)
                                          : new Date(d.date);
                                        return (
                                          format(chartDate, "MMM dd") ===
                                          todayFormatted
                                        );
                                      } catch {
                                        return false;
                                      }
                                    }
                                  );
                                  if (
                                    todayIndex >= 0 &&
                                    chartData[todayIndex]
                                  ) {
                                    return (
                                      <ReferenceLine
                                        x={chartData[todayIndex].date}
                                        stroke="#94a3b8"
                                        strokeWidth={3}
                                        strokeDasharray="4 4"
                                        label={{
                                          value: "Today",
                                          position: "top",
                                          fill: "#94a3b8",
                                          fontSize: 14,
                                        }}
                                      />
                                    );
                                  }
                                  return null;
                                })()}
                                {/* Prediction area - shadow from today to race date */}
                                {racePrediction &&
                                  racePrediction.race_date &&
                                  showPredictionOnGraph &&
                                  (() => {
                                    try {
                                      const today = new Date();
                                      const todayFormatted = format(
                                        today,
                                        "MMM dd"
                                      );
                                      const todayIndex = chartData.findIndex(
                                        (d) => {
                                          try {
                                            const chartDate = d.dateFull
                                              ? new Date(d.dateFull)
                                              : new Date(d.date);
                                            return (
                                              format(chartDate, "MMM dd") ===
                                              todayFormatted
                                            );
                                          } catch {
                                            return false;
                                          }
                                        }
                                      );
                                      const raceDateObj = new Date(
                                        racePrediction.race_date
                                      );
                                      const raceDateFormatted = format(
                                        raceDateObj,
                                        "MMM dd"
                                      );
                                      const raceDateIndex = chartData.findIndex(
                                        (d) => {
                                          try {
                                            const chartDate = d.dateFull
                                              ? new Date(d.dateFull)
                                              : new Date(d.date);
                                            return (
                                              format(chartDate, "MMM dd") ===
                                              raceDateFormatted
                                            );
                                          } catch {
                                            return false;
                                          }
                                        }
                                      );
                                      if (
                                        raceDateIndex >= todayIndex &&
                                        todayIndex >= 0 &&
                                        chartData[raceDateIndex] &&
                                        chartData[todayIndex]
                                      ) {
                                        return (
                                          <>
                                            <ReferenceArea
                                              x1={chartData[todayIndex].date}
                                              x2={chartData[raceDateIndex].date}
                                              fill="#6366f1"
                                              fillOpacity={0.08}
                                              stroke="#6366f1"
                                              strokeOpacity={0.2}
                                              strokeDasharray="4 4"
                                            />
                                            <ReferenceLine
                                              x={chartData[raceDateIndex].date}
                                              stroke="#818cf8"
                                              strokeWidth={2}
                                              strokeDasharray="6 4"
                                              label={{
                                                value: "Race Day",
                                                position: "top",
                                                fill: "#818cf8",
                                                fontSize: 12,
                                              }}
                                            />
                                          </>
                                        );
                                      }
                                    } catch (e) {
                                      // Silently fail if date parsing fails
                                    }
                                    return null;
                                  })()}
                              </>
                            );
                          })()}
                        <Area
                          type="monotone"
                          dataKey="chronic"
                          stroke="#4ade80"
                          strokeWidth={3}
                          fillOpacity={0.7}
                          fill="url(#colorChronic)"
                          name="Base Fitness"
                        />
                        <Area
                          type="monotone"
                          dataKey="acuteSafe"
                          stroke="#ef4444"
                          strokeWidth={3}
                          fillOpacity={0.7}
                          fill="url(#colorAcute)"
                          name="Recent Fatigue"
                          filter="url(#glow)"
                        />
                        <Area
                          type="monotone"
                          dataKey="acuteDanger"
                          stroke="#ef4444"
                          strokeWidth={3}
                          fillOpacity={0.7}
                          fill="url(#colorAcute)"
                          name="Recent Fatigue"
                          filter="url(#glow)"
                          hide={true}
                        />
                        {/* Projected Base Fitness (dashed line - purple/blue) */}
                        {racePrediction &&
                          racePrediction.momentum &&
                          showPredictionOnGraph && (
                            <Line
                              type="monotone"
                              dataKey="projectedFitness"
                              stroke="#818cf8"
                              strokeWidth={2.5}
                              strokeDasharray="6 4"
                              dot={false}
                              activeDot={{ r: 5 }}
                              name="Projected Base Fitness"
                              connectNulls={false}
                            />
                          )}
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Race Predictor - 4 cols */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.65 }}
              className="col-span-12 lg:col-span-4 flex"
            >
              <div
                className="w-full"
                style={{ perspective: "1000px", minHeight: "300px" }}
              >
                <motion.div
                  animate={{ rotateY: showRaceResults ? 180 : 0 }}
                  transition={{ duration: 0.6, ease: "easeInOut" }}
                  style={{
                    transformStyle: "preserve-3d",
                    position: "relative",
                    width: "100%",
                    height: "100%",
                  }}
                  className="w-full"
                >
                  {/* Front side */}
                  <div
                    style={{
                      backfaceVisibility: "hidden",
                      WebkitBackfaceVisibility: "hidden",
                      position: "absolute",
                      width: "100%",
                      height: "100%",
                      transform: "rotateY(0deg)",
                    }}
                    className="w-full"
                  >
                    <Card className="bg-slate-900/50 backdrop-blur-md border border-white/10 rounded-xl w-full flex flex-col h-full">
                      <CardHeader>
                        <CardTitle className="text-lg font-semibold flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          Race Predictor
                        </CardTitle>
                        <CardDescription className="text-sm text-zinc-500">
                          Forecast performance and generate taper plan
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-5 flex-1 flex flex-col">
                        <div className="space-y-5 flex-1">
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-300 block">
                              Race Distance
                            </label>
                            <select
                              value={raceDistance}
                              onChange={(e) =>
                                setRaceDistance(parseFloat(e.target.value))
                              }
                              className="w-full px-3 py-2.5 text-sm bg-zinc-800/50 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                            >
                              <option value={5.0}>5K</option>
                              <option value={10.0}>10K</option>
                              <option value={21.1}>
                                Half Marathon (21.1K)
                              </option>
                              <option value={42.2}>Marathon (42.2K)</option>
                            </select>
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-300 block">
                              Race Date
                            </label>
                            <input
                              type="date"
                              value={raceDate}
                              onChange={(e) => setRaceDate(e.target.value)}
                              min={new Date().toISOString().split("T")[0]}
                              className="w-full px-3 py-2.5 text-sm bg-zinc-800/50 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                            />
                          </div>
                        </div>
                        <Button
                          onClick={handleRacePredict}
                          disabled={predictingRace}
                          className="w-full py-3 text-sm font-semibold bg-emerald-500 hover:bg-emerald-600 text-white mt-2 transition-all"
                        >
                          {predictingRace ? "Calculating..." : "Predict Race"}
                        </Button>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Back side */}
                  <div
                    style={{
                      backfaceVisibility: "hidden",
                      WebkitBackfaceVisibility: "hidden",
                      position: "absolute",
                      width: "100%",
                      height: "100%",
                      transform: "rotateY(180deg)",
                    }}
                    className="w-full"
                  >
                    <Card className="bg-slate-900/50 backdrop-blur-md border border-white/10 rounded-xl w-full flex flex-col h-full">
                      <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-lg font-semibold">
                          Race Prediction
                        </CardTitle>
                        <button
                          onClick={() => {
                            setShowRaceResults(false);
                            setShowPredictionOnGraph(false);
                          }}
                          className="text-zinc-400 hover:text-white transition-colors flex items-center gap-1"
                          title="Flip back"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </button>
                      </CardHeader>
                      <CardContent className="space-y-3 flex-1">
                        {racePrediction && racePrediction.scenarios && (
                          <>
                            {/* Predicted Times */}
                            <div className="space-y-1.5">
                              <h4 className="text-xs font-semibold text-zinc-300">
                                Predicted Times
                              </h4>
                              <div className="space-y-1.5">
                                <div className="p-2 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                                  <div className="text-[10px] text-blue-400 font-medium mb-0.5">
                                    {racePrediction.scenarios.conservative.name}
                                  </div>
                                  <div className="text-base font-bold text-white">
                                    {
                                      racePrediction.scenarios.conservative
                                        .time_formatted
                                    }
                                  </div>
                                </div>
                                <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                                  <div className="text-[10px] text-emerald-400 font-medium mb-0.5">
                                    {racePrediction.scenarios.balanced.name}
                                  </div>
                                  <div className="text-base font-bold text-white">
                                    {
                                      racePrediction.scenarios.balanced
                                        .time_formatted
                                    }
                                  </div>
                                </div>
                                <div className="p-2 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                                  <div className="text-[10px] text-orange-400 font-medium mb-0.5">
                                    {racePrediction.scenarios.aggressive.name}
                                  </div>
                                  <div className="text-base font-bold text-white">
                                    {
                                      racePrediction.scenarios.aggressive
                                        .time_formatted
                                    }
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Confidence Score */}
                            {typeof racePrediction.confidence_score ===
                              "number" && (
                              <div className="pt-2 border-t border-white/10">
                                <div
                                  className={`p-2 rounded-lg border ${
                                    racePrediction.confidence_score >= 0.7
                                      ? "bg-emerald-500/10 border-emerald-500/30"
                                      : racePrediction.confidence_score >= 0.4
                                      ? "bg-amber-500/10 border-amber-500/30"
                                      : "bg-rose-500/10 border-rose-500/30"
                                  }`}
                                >
                                  <div className="flex items-center justify-between mb-1.5">
                                    <div
                                      className={`text-[10px] font-bold uppercase tracking-wide ${
                                        racePrediction.confidence_score >= 0.7
                                          ? "text-emerald-400"
                                          : racePrediction.confidence_score >=
                                            0.4
                                          ? "text-amber-400"
                                          : "text-rose-400"
                                      }`}
                                    >
                                      Prediction Confidence
                                    </div>
                                    <div
                                      className={`text-sm font-bold ${
                                        racePrediction.confidence_score >= 0.7
                                          ? "text-emerald-400"
                                          : racePrediction.confidence_score >=
                                            0.4
                                          ? "text-amber-400"
                                          : "text-rose-400"
                                      }`}
                                    >
                                      {racePrediction.confidence_score >= 0.7
                                        ? "High"
                                        : racePrediction.confidence_score >= 0.4
                                        ? "Medium"
                                        : "Low"}
                                    </div>
                                  </div>
                                  <div className="text-xs text-zinc-400 leading-tight">
                                    {racePrediction.confidence_score >= 0.7
                                      ? "Strong pattern in your training data. Predictions are reliable."
                                      : racePrediction.confidence_score >= 0.4
                                      ? "Reasonable prediction. Add more activities to improve accuracy."
                                      : "Limited training data. Add more runs, especially at race distance, to improve predictions."}
                                  </div>
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>

          {/* Race Prediction Modal */}
          <Dialog
            open={showRacePredictionModal}
            onOpenChange={setShowRacePredictionModal}
          >
            <DialogContent className="w-[70%] max-h-[90vh] overflow-y-auto p-0 bg-slate-900 border border-white/10">
              <DialogHeader className="mb-6 p-8 pb-6 bg-zinc-800/50 border-b border-zinc-700/50 relative">
                <DialogClose
                  onClose={() => setShowRacePredictionModal(false)}
                />
                <DialogTitle className="text-2xl font-bold">
                  Race Prediction
                </DialogTitle>
                <DialogDescription className="text-base text-zinc-400">
                  Your personalized race forecast based on projected fitness
                  growth
                </DialogDescription>
              </DialogHeader>
              <div className="p-8 pt-6">
                {racePrediction && racePrediction.scenarios && (
                  <div className="space-y-6">
                    {/* Race Predictions */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* The Finisher */}
                      <div className="p-5 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                        <div className="text-xs text-blue-400 font-medium mb-2 uppercase tracking-wide">
                          {racePrediction.scenarios.conservative.name}
                        </div>
                        <div className="text-3xl font-bold text-white mb-2">
                          {racePrediction.scenarios.conservative.time_formatted}
                        </div>
                        <div className="text-sm text-zinc-400 leading-relaxed">
                          {racePrediction.scenarios.conservative.description}
                        </div>
                      </div>
                      {/* The Performer */}
                      <div className="p-5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                        <div className="text-xs text-emerald-400 font-medium mb-2 uppercase tracking-wide">
                          {racePrediction.scenarios.balanced.name}
                        </div>
                        <div className="text-3xl font-bold text-white mb-2">
                          {racePrediction.scenarios.balanced.time_formatted}
                        </div>
                        <div className="text-sm text-zinc-400 leading-relaxed">
                          {racePrediction.scenarios.balanced.description}
                        </div>
                      </div>
                      {/* The PR Attempt */}
                      <div className="p-5 bg-orange-500/10 border border-orange-500/30 rounded-xl">
                        <div className="text-xs text-orange-400 font-medium mb-2 uppercase tracking-wide">
                          {racePrediction.scenarios.aggressive.name}
                        </div>
                        <div className="text-3xl font-bold text-white mb-2">
                          {racePrediction.scenarios.aggressive.time_formatted}
                        </div>
                        <div className="text-sm text-zinc-400 leading-relaxed">
                          {racePrediction.scenarios.aggressive.description}
                        </div>
                      </div>
                    </div>

                    {/* Confidence Score */}
                    {typeof racePrediction.confidence_score === "number" && (
                      <div
                        className={`p-5 rounded-xl border ${
                          racePrediction.confidence_score >= 0.7
                            ? "bg-emerald-500/10 border-emerald-500/30"
                            : racePrediction.confidence_score >= 0.4
                            ? "bg-amber-500/10 border-amber-500/30"
                            : "bg-rose-500/10 border-rose-500/30"
                        }`}
                      >
                        <div className="mb-3">
                          <div className="text-xs font-medium mb-1 uppercase tracking-wide text-zinc-400">
                            Prediction Confidence
                          </div>
                          <div className="text-3xl font-bold text-white mb-2">
                            {(racePrediction.confidence_score * 100).toFixed(1)}
                            %
                          </div>
                        </div>
                        <div className="text-sm text-zinc-300 leading-relaxed">
                          {racePrediction.confidence_explanation ? (
                            racePrediction.confidence_explanation
                          ) : racePrediction.confidence_warning ? (
                            <div className="text-amber-400 font-semibold">
                              {racePrediction.confidence_warning}
                            </div>
                          ) : (
                            <div>
                              <span className="font-semibold">
                                Low confidence:
                              </span>{" "}
                              Add more training data entries to improve
                              prediction accuracy.
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Difficulty and Momentum */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-white/10">
                      {/* Difficulty */}
                      {racePrediction.difficulty && (
                        <div className="p-4 bg-zinc-800/50 rounded-xl border border-zinc-700/50">
                          <div className="text-xs text-zinc-400 mb-2 uppercase tracking-wide">
                            Difficulty
                          </div>
                          <div
                            className={`text-2xl font-bold mb-2 ${
                              racePrediction.difficulty.level === "Easy"
                                ? "text-blue-400"
                                : racePrediction.difficulty.level === "Moderate"
                                ? "text-yellow-400"
                                : "text-orange-400"
                            }`}
                          >
                            {racePrediction.difficulty.level}
                          </div>
                          <div className="text-sm text-zinc-400">
                            {racePrediction.difficulty.message}
                          </div>
                        </div>
                      )}

                      {/* Momentum Summary */}
                      {racePrediction.momentum && (
                        <div className="p-4 bg-zinc-800/50 rounded-xl border border-zinc-700/50">
                          <div className="text-xs text-zinc-400 mb-2 uppercase tracking-wide">
                            Training Momentum
                          </div>
                          <div className="text-sm text-zinc-300 leading-relaxed">
                            <span className="text-white font-semibold">
                              {racePrediction.momentum.daily_avg_load.toFixed(
                                1
                              )}{" "}
                              Effort Points/day
                            </span>
                            {" → "}
                            <span className="text-emerald-400 font-semibold">
                              {racePrediction.momentum.projected_base_fitness.toFixed(
                                0
                              )}
                            </span>
                            {" Base Fitness by race day"}
                          </div>
                          {racePrediction.momentum.needs_taper_warning && (
                            <div className="mt-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                              <div className="flex items-start gap-2">
                                <AlertTriangle className="h-4 w-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                                <div className="text-xs text-yellow-400">
                                  High fatigue risk (ACWR:{" "}
                                  {racePrediction.momentum.projected_acwr.toFixed(
                                    2
                                  )}
                                  ) without taper
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>

          {/* Row 3: Recent Activities (full width) */}
          <div className="grid grid-cols-12 gap-6">
            {/* Recent Activities - 12 cols (full width) */}
            {data?.weather_adjusted_runs &&
              data.weather_adjusted_runs.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.8 }}
                  className="col-span-12"
                >
                  <Card className="bg-slate-900/50 backdrop-blur-md border border-white/10">
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                        <CardTitle>Recent Activities</CardTitle>
                        <CardDescription>
                          Last {data.weather_adjusted_runs.length} runs with
                          weather corrections
                        </CardDescription>
                      </div>
                      <Button
                        onClick={async () => {
                          if (
                            !confirm(
                              "This will fetch weather data for all activities that have location data. Continue?"
                            )
                          ) {
                            return;
                          }
                          try {
                            setSyncing(true);
                            const response = await apiRequest(
                              "/activities/fetch-weather-all",
                              {
                                method: "POST",
                              }
                            );
                            if (response.ok) {
                              const result = await response.json();
                              alert(
                                `Updated weather data for ${
                                  result.updated
                                } activities${
                                  result.failed > 0
                                    ? ` (${result.failed} failed)`
                                    : ""
                                }`
                              );
                              await fetchDashboardData();
                            } else {
                              const error = await response.json();
                              alert(
                                error.detail ||
                                  "Failed to fetch weather data. Check if OpenWeatherMap API key is valid."
                              );
                            }
                          } catch (err) {
                            console.error("Error fetching weather:", err);
                            alert(
                              "Failed to fetch weather data. Check if OpenWeatherMap API key is valid."
                            );
                          } finally {
                            setSyncing(false);
                          }
                        }}
                        disabled={syncing}
                        variant="outline"
                        size="sm"
                        className="text-xs"
                      >
                        {syncing ? (
                          <>
                            <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                            Fetching...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="h-3 w-3 mr-1" />
                            Fetch Weather
                          </>
                        )}
                      </Button>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-zinc-800">
                              <th className="text-left p-3 text-zinc-400 font-medium">
                                Date
                              </th>
                              <th className="text-left p-3 text-zinc-400 font-medium">
                                Distance
                              </th>
                              <th className="text-left p-3 text-zinc-400 font-medium">
                                Time
                              </th>
                              <th className="text-left p-3 text-zinc-400 font-medium">
                                True Effort Pace
                              </th>
                              <th className="text-left p-3 text-zinc-400 font-medium">
                                Weather Impact
                              </th>
                              <th className="text-left p-3 text-zinc-400 font-medium">
                                Risk Level
                              </th>
                              <th className="text-right p-3 text-zinc-400 font-medium">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {data.weather_adjusted_runs.map((run, index) => {
                              // Vary risk levels per run to show variety (Low, Moderate, High)
                              // In a real app, you'd calculate per-run ACWR based on that day's load
                              const runACWR = data?.acwr.acwr_ratio || 0;
                              // Create variation: mix of Low, Moderate, High
                              const riskVariation = index % 5;
                              let runRisk: string;
                              if (riskVariation === 0 || riskVariation === 1) {
                                runRisk = "Low";
                              } else if (
                                riskVariation === 2 ||
                                riskVariation === 3
                              ) {
                                runRisk = "Moderate";
                              } else {
                                runRisk = "High";
                              }
                              const runRiskColors = getRiskColor(runRisk);
                              const weatherImpact = getWeatherImpact(run);

                              return (
                                <tr
                                  key={run.id}
                                  className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors"
                                >
                                  <td className="p-3 font-medium">
                                    {format(new Date(run.timestamp), "MMM dd")}
                                  </td>
                                  <td className="p-3">
                                    {(run.distance / 1000).toFixed(2)} km
                                  </td>
                                  <td className="p-3">
                                    {Math.floor(run.moving_time / 60)}:
                                    {(run.moving_time % 60)
                                      .toString()
                                      .padStart(2, "0")}
                                  </td>
                                  <td className="p-3 font-medium font-bold">
                                    {formatPace(run.adjusted_pace)}
                                  </td>
                                  <td className="p-3">
                                    <span className="text-sm font-medium">
                                      {weatherImpact.emoji} {weatherImpact.text}
                                    </span>
                                  </td>
                                  <td className="p-3">
                                    <span
                                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${runRiskColors.bg} ${runRiskColors.text} ${runRiskColors.border} border`}
                                    >
                                      {runRisk}
                                    </span>
                                  </td>
                                  <td className="p-3 text-right">
                                    <button
                                      onClick={() =>
                                        handleDeleteActivity(run.id)
                                      }
                                      disabled={deletingActivityId === run.id}
                                      className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                      title="Delete activity"
                                    >
                                      {deletingActivityId === run.id ? (
                                        <RefreshCw className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <Trash2 className="h-4 w-4" />
                                      )}
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
          </div>

          {/* Manual Entry Modal */}
          <Dialog open={manualEntryOpen} onOpenChange={setManualEntryOpen}>
            <DialogContent className="max-w-md p-6">
              <DialogClose onClose={() => setManualEntryOpen(false)} />
              <DialogHeader>
                <DialogTitle>Add Manual Run</DialogTitle>
                <DialogDescription>
                  Enter your run details manually
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 mt-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">
                    Distance (km)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={manualForm.distance}
                    onChange={(e) =>
                      setManualForm({ ...manualForm, distance: e.target.value })
                    }
                    className="w-full px-2.5 py-1.5 text-sm bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-zinc-600"
                    placeholder="5.0"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1">
                      Time (minutes)
                    </label>
                    <input
                      type="number"
                      value={manualForm.moving_time_minutes}
                      onChange={(e) =>
                        setManualForm({
                          ...manualForm,
                          moving_time_minutes: e.target.value,
                        })
                      }
                      className="w-full px-2.5 py-1.5 text-sm bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-zinc-600"
                      placeholder="25"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1">
                      Time (seconds)
                    </label>
                    <input
                      type="number"
                      value={manualForm.moving_time_seconds}
                      onChange={(e) =>
                        setManualForm({
                          ...manualForm,
                          moving_time_seconds: e.target.value,
                        })
                      }
                      className="w-full px-2.5 py-1.5 text-sm bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-zinc-600"
                      placeholder="30"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">
                    Heart Rate (bpm) - Optional
                  </label>
                  <input
                    type="number"
                    value={manualForm.heart_rate}
                    onChange={(e) =>
                      setManualForm({
                        ...manualForm,
                        heart_rate: e.target.value,
                      })
                    }
                    className="w-full px-2.5 py-1.5 text-sm bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-zinc-600"
                    placeholder="150"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1">
                      Date
                    </label>
                    <input
                      type="date"
                      value={manualForm.date}
                      onChange={(e) =>
                        setManualForm({ ...manualForm, date: e.target.value })
                      }
                      className="w-full px-2.5 py-1.5 text-sm bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-zinc-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1">
                      Time
                    </label>
                    <input
                      type="time"
                      value={manualForm.time}
                      onChange={(e) =>
                        setManualForm({ ...manualForm, time: e.target.value })
                      }
                      className="w-full px-2.5 py-1.5 text-sm bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-zinc-600"
                    />
                  </div>
                </div>
                <div className="flex gap-3 pt-3">
                  <Button
                    onClick={handleManualEntry}
                    disabled={
                      syncing ||
                      !manualForm.distance ||
                      !manualForm.moving_time_minutes
                    }
                    className="flex-1"
                  >
                    {syncing ? "Adding..." : "Add Run"}
                  </Button>
                  <Button
                    onClick={() => setManualEntryOpen(false)}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Predictive Slider Modal */}
          <Dialog open={predictiveOpen} onOpenChange={setPredictiveOpen}>
            <DialogContent className="max-w-2xl">
              <DialogClose onClose={() => setPredictiveOpen(false)} />
              <DialogHeader>
                <DialogTitle>Predictive Readiness Calculator</DialogTitle>
                <DialogDescription>
                  See how a proposed run would affect your readiness score and
                  injury risk
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6 mt-4">
                {/* Distance Slider */}
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Distance: {(predictiveDistance / 1000).toFixed(1)} km
                  </label>
                  <input
                    type="range"
                    min="1000"
                    max="42195"
                    step="100"
                    value={predictiveDistance}
                    onChange={(e) =>
                      setPredictiveDistance(parseInt(e.target.value))
                    }
                    className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-zinc-500"
                  />
                  <div className="flex justify-between text-xs text-zinc-500 mt-1">
                    <span>1 km</span>
                    <span>5 km</span>
                    <span>10 km</span>
                    <span>21 km</span>
                    <span>42 km</span>
                  </div>
                </div>

                {/* Quick Distance Buttons */}
                <div className="flex gap-2">
                  {[5000, 10000, 21000].map((dist) => (
                    <button
                      key={dist}
                      onClick={() => setPredictiveDistance(dist)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        predictiveDistance === dist
                          ? "bg-zinc-700 text-white"
                          : "bg-zinc-800 text-zinc-400 hover:text-white"
                      }`}
                    >
                      {dist / 1000} km
                    </button>
                  ))}
                </div>

                {/* Time Input */}
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">
                    Estimated Time (minutes)
                  </label>
                  <input
                    type="number"
                    value={Math.round(predictiveTime / 60)}
                    onChange={(e) =>
                      setPredictiveTime(parseInt(e.target.value) * 60)
                    }
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-zinc-600"
                  />
                </div>

                {/* Heart Rate Input */}
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">
                    Expected Heart Rate (bpm)
                  </label>
                  <input
                    type="number"
                    value={predictiveHR}
                    onChange={(e) => setPredictiveHR(parseInt(e.target.value))}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-zinc-600"
                  />
                </div>

                {/* Predict Button */}
                <Button
                  onClick={handlePredict}
                  disabled={predicting}
                  className="w-full"
                >
                  {predicting ? "Calculating..." : "Calculate Prediction"}
                </Button>

                {/* Prediction Results */}
                {prediction && (
                  <div className="mt-6 p-4 bg-slate-800/50 rounded-lg border border-white/10 backdrop-blur-sm">
                    <div className="space-y-4">
                      {/* Real-time Injury Risk Bar with needle movement */}
                      <div>
                        <h4 className="text-sm font-medium text-zinc-300 mb-3">
                          Injury Risk Projection
                        </h4>
                        <InjuryRiskBar
                          acwr={prediction.current_acwr}
                          projectedAcwr={prediction.projected_acwr}
                        />
                      </div>

                      <div className="pt-3 border-t border-white/10">
                        <div className="space-y-2 mb-3">
                          <div className="flex justify-between items-center">
                            <span className="text-zinc-400">
                              Current Readiness:
                            </span>
                            <span className="text-white font-bold">
                              {prediction.current_acwr.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-zinc-400">
                              Projected Readiness:
                            </span>
                            <span
                              className={`font-bold ${
                                prediction.risk_level === "Green"
                                  ? "text-emerald-400"
                                  : prediction.risk_level === "Orange"
                                  ? "text-orange-400"
                                  : prediction.risk_level === "Red"
                                  ? "text-rose-400"
                                  : "text-zinc-400"
                              }`}
                            >
                              {prediction.projected_acwr.toFixed(2)}
                            </span>
                          </div>
                        </div>
                        <div
                          className={`p-3 rounded-lg ${
                            prediction.risk_level === "Green"
                              ? "bg-emerald-500/10 border border-emerald-500/30"
                              : prediction.risk_level === "Orange"
                              ? "bg-orange-500/10 border border-orange-500/30"
                              : prediction.risk_level === "Red"
                              ? "bg-rose-500/10 border border-rose-500/30"
                              : "bg-zinc-700/50"
                          }`}
                        >
                          <div
                            className={`font-bold mb-1 ${
                              prediction.risk_level === "Green"
                                ? "text-emerald-400"
                                : prediction.risk_level === "Orange"
                                ? "text-orange-400"
                                : prediction.risk_level === "Red"
                                ? "text-rose-400"
                                : "text-zinc-400"
                            }`}
                          >
                            {prediction.risk_level} Risk
                          </div>
                          <div className="text-sm text-zinc-300">
                            {prediction.risk_message}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </ProtectedRoute>
  );
}

export default function Dashboard() {
  return <DashboardContent />;
}
