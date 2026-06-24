import { supabase } from "@/lib/supabase";

export interface LevelInfo {
  level: number;
  payoutPercent: number;
  feePercent: number;
  totalCompleted: number;
  monthlyCompleted: number;
}

/**
 * Dynamically queries the worker's completed jobs and returns their current Level.
 * Level 1: 70% payout, 30% platform fee.
 * Level 2 (completed >= 15 jobs in the current month): 80% payout, 20% platform fee.
 * Level 3 (completed >= 25 jobs historically): 90% payout, 10% platform fee (permanent, no drop).
 */
export const getWorkerLevelInfo = async (workerId: string): Promise<LevelInfo> => {
  if (!workerId) {
    return { level: 1, payoutPercent: 70, feePercent: 30, totalCompleted: 0, monthlyCompleted: 0 };
  }

  try {
    const { data: completedJobs, error } = await (supabase as any)
      .from("jobs")
      .select("created_at")
      .eq("worker_id", workerId)
      .eq("status", "completed");

    if (error) throw error;

    const jobsList = completedJobs || [];
    const totalCompleted = jobsList.length;

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-indexed

    const monthlyCompleted = jobsList.filter((j: any) => {
      if (!j.created_at) return false;
      const date = new Date(j.created_at);
      return date.getFullYear() === currentYear && date.getMonth() === currentMonth;
    }).length;

    // Level 3: Elite tier with >= 25 jobs historically
    if (totalCompleted >= 25) {
      return { level: 3, payoutPercent: 90, feePercent: 10, totalCompleted, monthlyCompleted };
    }
    // Level 2: Expert tier with >= 10 jobs historically
    if (totalCompleted >= 10) {
      return { level: 2, payoutPercent: 80, feePercent: 20, totalCompleted, monthlyCompleted };
    }
    // Level 1: Default starting tier (70% payout)
    return { level: 1, payoutPercent: 70, feePercent: 30, totalCompleted, monthlyCompleted };
  } catch (err) {
    console.error("Error calculating worker level info:", err);
    return { level: 1, payoutPercent: 70, feePercent: 30, totalCompleted: 0, monthlyCompleted: 0 };
  }
};
