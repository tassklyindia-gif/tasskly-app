import { useApp } from "@/context/AppContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { TrendingUp, Star, CheckCircle2, ChevronRight, Lock } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

const TIERS = [
  {
    level: 1,
    name: "Starter",
    emoji: "🌱",
    payout: 70,
    fee: 30,
    gradient: "from-blue-500 to-indigo-500",
    lightBg: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-700",
    badgeBg: "bg-blue-600",
    required: 0,
    nextAt: 10,
    perks: [
      "Access to all job listings",
      "70% payout on every completed job",
      "Basic profile & portfolio",
      "Customer support access",
    ],
  },
  {
    level: 2,
    name: "Expert",
    emoji: "⭐️",
    payout: 80,
    fee: 20,
    gradient: "from-amber-500 to-yellow-400",
    lightBg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-700",
    badgeBg: "bg-amber-500",
    required: 10,
    nextAt: 25,
    perks: [
      "80% payout — only 20% platform fee",
      "Expert badge on profile",
      "Priority job matching",
      "Access to featured listings",
    ],
  },
  {
    level: 3,
    name: "Elite",
    emoji: "💎",
    payout: 90,
    fee: 10,
    gradient: "from-purple-600 to-pink-500",
    lightBg: "bg-purple-50",
    border: "border-purple-200",
    text: "text-purple-700",
    badgeBg: "bg-purple-600",
    required: 25,
    nextAt: null,
    perks: [
      "90% payout — only 10% platform fee",
      "💎 Elite badge — permanent status",
      "Highest visibility in all searches",
      "Exclusive Elite-only bonuses",
    ],
  },
];

const Levels = () => {
  const { profile, authLoading } = useApp();
  const [levelInfo, setLevelInfo] = useState<any>(null);
  const [levelLoading, setLevelLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<number | null>(null);

  useEffect(() => {
    if (!profile?.id) return;
    const fetchLevel = async () => {
      setLevelLoading(true);
      try {
        const { data } = await supabase
          .from("jobs")
          .select("created_at, rating")
          .eq("worker_id", profile.id)
          .eq("status", "completed");

        const jobsList = data || [];
        const totalCompleted = jobsList.length;

        const ratedJobs = jobsList.filter((j: any) => j.rating !== null && j.rating !== undefined);
        const averageRating =
          ratedJobs.length > 0
            ? (
                ratedJobs.reduce((acc: number, curr: any) => acc + Number(curr.rating), 0) /
                ratedJobs.length
              ).toFixed(1)
            : null;

        const now = new Date();
        const monthlyCompleted = jobsList.filter((j: any) => {
          if (!j.created_at) return false;
          const date = new Date(j.created_at);
          return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
        }).length;

        let level = 1;
        let payoutPercent = 70;
        let feePercent = 30;
        let nextThresholdText = "";
        let progressVal = 0;

        if (totalCompleted >= 25) {
          level = 3; payoutPercent = 90; feePercent = 10;
          nextThresholdText = "💎 Max Tier Reached! You keep 90% of every payment.";
          progressVal = 100;
        } else if (totalCompleted >= 10) {
          level = 2; payoutPercent = 80; feePercent = 20;
          const lp = totalCompleted - 10;
          nextThresholdText = `${15 - lp} more jobs to reach Level 3 — Elite (90% payout)`;
          progressVal = (lp / 15) * 100;
        } else {
          level = 1; payoutPercent = 70; feePercent = 30;
          nextThresholdText = `${10 - totalCompleted} more jobs to reach Level 2 — Expert (80% payout)`;
          progressVal = (totalCompleted / 10) * 100;
        }

        setLevelInfo({ level, payoutPercent, feePercent, totalCompleted, monthlyCompleted, nextThresholdText, progressVal, averageRating });
        setActiveTab(level);
      } catch (err) {
        console.error("Error loading level stats:", err);
      } finally {
        setLevelLoading(false);
      }
    };
    fetchLevel();
  }, [profile?.id]);

  if (authLoading || levelLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!profile || profile.role !== "worker") {
    return (
      <div className="p-12 text-center">
        <TrendingUp className="mx-auto h-12 w-12 text-muted-foreground opacity-20 mb-4" />
        <h3 className="text-lg font-semibold text-foreground">Levels are for Workers</h3>
        <p className="text-muted-foreground mt-1">Only worker accounts have tier progression.</p>
      </div>
    );
  }

  const currentTier = TIERS.find((t) => t.level === levelInfo?.level) || TIERS[0];

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-primary" />
          My Level & Progression
        </h1>
        <p className="text-muted-foreground mt-1">
          Complete more jobs to unlock higher tiers and earn a greater payout percentage.
        </p>
      </motion.div>

      {/* Current Status Card */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <div className={`rounded-2xl p-6 bg-gradient-to-br ${currentTier.gradient} text-white shadow-xl`}>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-white/70 text-xs font-bold uppercase tracking-widest mb-1">Your Current Tier</p>
              <h2 className="text-4xl font-black flex items-center gap-3">
                {currentTier.emoji} Level {currentTier.level}
                <span className="text-xl font-bold opacity-80">— {currentTier.name}</span>
              </h2>
              <p className="text-white/80 mt-2 text-sm font-medium">
                You keep <span className="font-black text-white text-xl">{currentTier.payout}%</span> of every job payment
                &nbsp;·&nbsp; Platform fee: <span className="font-bold">{currentTier.fee}%</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-white/60 text-xs font-semibold uppercase tracking-wider">Total Jobs Done</p>
              <p className="text-5xl font-black">{levelInfo?.totalCompleted}</p>
              <p className="text-white/60 text-xs mt-0.5">This month: {levelInfo?.monthlyCompleted} jobs</p>
            </div>
          </div>

          {/* Progress bar */}
          {levelInfo?.level < 3 && (
            <div className="mt-5">
              <div className="flex justify-between text-xs text-white/70 font-semibold mb-1.5">
                <span>{levelInfo?.nextThresholdText}</span>
                <span>{Math.round(levelInfo?.progressVal)}%</span>
              </div>
              <div className="h-2.5 w-full bg-white/20 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${levelInfo?.progressVal}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="h-full rounded-full bg-white/90"
                />
              </div>
            </div>
          )}

          {levelInfo?.level === 3 && (
            <div className="mt-4 flex items-center gap-2 bg-white/20 rounded-xl px-4 py-2">
              <CheckCircle2 className="h-5 w-5 text-white" />
              <span className="text-white font-bold text-sm">Maximum Tier Reached — Permanent 90% Payout Active! 🎉</span>
            </div>
          )}

          {levelInfo?.averageRating && (
            <div className="mt-3 flex items-center gap-1.5">
              <Star className="h-4 w-4 text-yellow-300 fill-yellow-300" />
              <span className="text-white font-bold text-sm">{levelInfo.averageRating} / 5.0 average rating</span>
            </div>
          )}
        </div>
      </motion.div>

      {/* All 3 Tiers */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <h2 className="font-display font-bold text-lg text-foreground mb-4">All Tier Levels</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {TIERS.map((tier) => {
            const isUnlocked = (levelInfo?.totalCompleted || 0) >= tier.required;
            const isCurrent = tier.level === levelInfo?.level;
            const isActive = activeTab === tier.level;

            return (
              <motion.div key={tier.level} whileHover={{ scale: 1.02 }} transition={{ duration: 0.15 }}>
                <Card
                  onClick={() => setActiveTab(isActive ? null : tier.level)}
                  className={`cursor-pointer transition-all border-2 h-full ${
                    isCurrent
                      ? `${tier.border} shadow-lg`
                      : isActive
                      ? `${tier.border}`
                      : "border-border hover:border-muted-foreground/30"
                  }`}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${
                          isUnlocked ? `bg-gradient-to-br ${tier.gradient}` : "bg-muted"
                        }`}
                      >
                        {isUnlocked ? tier.emoji : <Lock className="h-5 w-5 text-muted-foreground" />}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {isCurrent && (
                          <Badge className={`${tier.badgeBg} text-white text-[9px] px-1.5 py-0 font-black uppercase`}>
                            Current
                          </Badge>
                        )}
                        <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${isActive ? "rotate-90" : ""}`} />
                      </div>
                    </div>

                    <p className="font-black text-base text-foreground">Level {tier.level} — {tier.name}</p>
                    <p className={`text-sm font-bold mt-0.5 ${isUnlocked ? tier.text : "text-muted-foreground"}`}>
                      {tier.payout}% payout · {tier.fee}% fee
                    </p>

                    {!isUnlocked && (
                      <p className="text-[11px] text-muted-foreground mt-2 font-semibold">
                        🔒 Unlocks at {tier.required} total jobs
                      </p>
                    )}

                    {isActive && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="mt-4 border-t pt-3 space-y-1.5"
                      >
                        <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-2">Perks</p>
                        {tier.perks.map((perk, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <CheckCircle2 className={`h-3.5 w-3.5 shrink-0 mt-0.5 ${tier.text}`} />
                            <p className="text-xs text-foreground font-medium">{perk}</p>
                          </div>
                        ))}
                        {!isUnlocked && (
                          <div className={`mt-3 p-2.5 rounded-lg ${tier.lightBg} ${tier.border} border`}>
                            <p className={`text-xs font-bold ${tier.text}`}>
                              Complete {tier.required - (levelInfo?.totalCompleted || 0)} more jobs to unlock
                            </p>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Level Thresholds Summary */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <Card className="border-none shadow-sm bg-gradient-to-br from-slate-50 to-slate-100/50">
          <CardContent className="p-5">
            <p className="font-bold text-sm text-foreground mb-4">📊 Tier Thresholds</p>
            <div className="grid grid-cols-3 gap-3 text-center text-xs">
              <div className="p-3 rounded-xl bg-blue-50 border border-blue-100">
                <p className="text-2xl mb-1">🌱</p>
                <p className="font-black text-blue-700">Level 1 — Starter</p>
                <p className="text-blue-600 font-semibold mt-1">0 jobs · 70% payout</p>
              </div>
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-100">
                <p className="text-2xl mb-1">⭐️</p>
                <p className="font-black text-amber-700">Level 2 — Expert</p>
                <p className="text-amber-600 font-semibold mt-1">10+ jobs · 80% payout</p>
              </div>
              <div className="p-3 rounded-xl bg-purple-50 border border-purple-100">
                <p className="text-2xl mb-1">💎</p>
                <p className="font-black text-purple-700">Level 3 — Elite</p>
                <p className="text-purple-600 font-semibold mt-1">25+ jobs · 90% payout</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-4 text-center">
              Tiers upgrade automatically and are permanent — they never reset or go down.
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default Levels;
