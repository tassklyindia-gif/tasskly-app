import { useCallback, useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { getApiUrl } from "@/lib/api";

export const useAdmin = () => {
  const [loading, setLoading] = useState(false);

  // ── Stats ─────────────────────────────────────────────────────────────────
  const fetchAdminStats = useCallback(async () => {
    const [{ count: total_users }, { count: total_jobs }, { count: active_jobs }, { count: completed_jobs }] =
      await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        (supabase as any).from("jobs").select("*", { count: "exact", head: true }),
        (supabase as any).from("jobs").select("*", { count: "exact", head: true }).in("status", ["accepted", "submitted", "payment_pending"]),
        (supabase as any).from("jobs").select("*", { count: "exact", head: true }).eq("status", "completed"),
      ]);

    const { data: ledgerData } = await (supabase as any)
      .from("admin_ledger")
      .select("amount")
      .eq("type", "fee_collected");

    const platform_balance = (ledgerData || []).reduce((sum: number, l: any) => sum + (Number(l.amount) || 0), 0);

    const { data: escrowData } = await (supabase as any)
      .from("escrow_transactions")
      .select("total_amount")
      .eq("status", "held");

    const total_escrow = (escrowData || []).reduce((sum: number, e: any) => sum + (e.total_amount || 0), 0);

    return {
      platform_balance,
      total_escrow,
      total_jobs: total_jobs || 0,
      active_jobs: active_jobs || 0,
      completed_jobs: completed_jobs || 0,
      total_users: total_users || 0,
    };
  }, []);

  // ── Ledger ────────────────────────────────────────────────────────────────
  const fetchLedger = useCallback(async (searchQuery?: string) => {
    let query = (supabase as any)
      .from("admin_ledger")
      .select("*, from_user:profiles!admin_ledger_from_user_id_fkey(full_name), to_user:profiles!admin_ledger_to_user_id_fkey(full_name), job:jobs!admin_ledger_job_id_fkey(title)")
      .order("created_at", { ascending: false })
      .limit(100);

    const { data, error } = await query;
    if (error) { console.error(error); return []; }
    const mapped = (data || []).map((e: any) => ({
      ...e,
      from_name: e.from_user?.full_name || "—",
      to_name: e.to_user?.full_name || "—",
      job_title: e.job?.title || "—",
    }));
    if (!searchQuery) return mapped;
    const q = searchQuery.toLowerCase();
    return mapped.filter((e: any) =>
      e.job_title?.toLowerCase().includes(q) ||
      e.from_name?.toLowerCase().includes(q) ||
      e.to_name?.toLowerCase().includes(q)
    );
  }, []);

  // ── Escrow ────────────────────────────────────────────────────────────────
  const fetchEscrowQueue = useCallback(async () => {
    const { data, error } = await (supabase as any)
      .from("escrow_transactions")
      .select("*, poster:profiles!escrow_transactions_poster_id_fkey(full_name, upi_id), worker:profiles!escrow_transactions_worker_id_fkey(full_name, upi_id), job:jobs!escrow_transactions_job_id_fkey(title, status, deadline)")
      .eq("status", "held")
      .order("created_at", { ascending: false });
    if (error) { console.error(error); return []; }

    const mapped = await Promise.all((data || []).map(async (e: any) => {
      let workerLevel = 1;
      let payoutPercent = 70;

      if (e.worker_id) {
        const { data: completedJobs } = await (supabase as any)
          .from("jobs")
          .select("created_at")
          .eq("worker_id", e.worker_id)
          .eq("status", "completed");
        
        const jobsList = completedJobs || [];
        const totalCompleted = jobsList.length;

        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();

        const monthlyCompleted = jobsList.filter((j: any) => {
          if (!j.created_at) return false;
          const date = new Date(j.created_at);
          return date.getFullYear() === currentYear && date.getMonth() === currentMonth;
        }).length;

        if (totalCompleted >= 25) {
          workerLevel = 3;
          payoutPercent = 90;
        } else if (monthlyCompleted >= 10) {
          workerLevel = 2;
          payoutPercent = 80;
        }
      }

      return {
        ...e,
        poster_name: e.poster?.full_name || "—",
        poster_upi: e.poster?.upi_id || null,
        worker_name: e.worker?.full_name || "—",
        worker_upi: e.worker?.upi_id || null,
        job_title: e.job?.title || "—",
        job_status: e.job?.status || "accepted",
        job_deadline: e.job?.deadline ? new Date(e.job.deadline).toLocaleDateString("en-IN", { month: "short", day: "numeric" }) : "—",
        worker_level: workerLevel,
        worker_payout_percent: payoutPercent
      };
    }));

    return mapped;
  }, []);

  // ── All Users (real Supabase data with last login info) ──────────────────
  const fetchAllUsers = useCallback(async () => {
    const { data, error } = await (supabase as any)
      .from("profiles")
      .select("*, jobs_posted:jobs!jobs_poster_id_fkey(id, title, status, budget, created_at), jobs_working:jobs!jobs_worker_id_fkey(id, title, status, budget, created_at)")
      .order("created_at", { ascending: false });

    if (error) { console.error(error); return []; }

    return (data || []).map((u: any) => {
      const activeJob = (u.jobs_posted || []).find((j: any) => ["accepted", "submitted", "payment_pending"].includes(j.status))
        || (u.jobs_working || []).find((j: any) => ["accepted", "submitted", "payment_pending"].includes(j.status));
      const acceptedBid = (u.jobs_working || []).find((j: any) => ["accepted", "submitted"].includes(j.status));

      // Calculate completed jobs for worker level
      const completedJobs = (u.jobs_working || []).filter((j: any) => j.status === 'completed');
      const totalCompleted = completedJobs.length;

      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();

      const monthlyCompleted = completedJobs.filter((j: any) => {
        if (!j.created_at) return false;
        const date = new Date(j.created_at);
        return date.getFullYear() === currentYear && date.getMonth() === currentMonth;
      }).length;

      let level = 1;
      let payoutPercent = 70;
      if (totalCompleted >= 25) {
        level = 3;
        payoutPercent = 90;
      } else if (monthlyCompleted >= 10) {
        level = 2;
        payoutPercent = 80;
      }

      return {
        ...u,
        active_project: activeJob?.title || null,
        bid_price: acceptedBid?.budget || null,
        total_jobs_posted: (u.jobs_posted || []).length,
        total_jobs_worked: (u.jobs_working || []).length,
        total_jobs_completed: totalCompleted,
        monthly_jobs_completed: monthlyCompleted,
        level,
        payout_percent: payoutPercent
      };
    });
  }, []);

  // ── Pending Verifications ─────────────────────────────────────────────────
  const fetchPendingVerifications = useCallback(async () => {
    const { data, error } = await (supabase as any)
      .from("verification_requests")
      .select("*, profile:profiles!verification_requests_user_id_fkey(full_name, email)")
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    if (error) { console.error(error); return []; }
    return (data || []).map((r: any) => ({
      ...r,
      full_name: r.profile?.full_name || "—",
      email: r.profile?.email || "—",
    }));
  }, []);

  // ── Signed URLs for verification docs ────────────────────────────────────
  const getSignedUrls = async (paths: (string | null | undefined)[]) => {
    return Promise.all(
      paths.map(async (path) => {
        if (!path) return null;
        const { data, error } = await supabase.storage
          .from("verification-docs")
          .createSignedUrl(path, 60 * 10); // 10 minute expiry
        return error ? null : data?.signedUrl ?? null;
      })
    );
  };

  // ── Approve / Reject verification ────────────────────────────────────────
  const approveVerification = async (userId: string, requestId?: string) => {
    const { error: profileErr } = await (supabase as any)
      .from("profiles")
      .update({ is_verified: true, verification_status: "verified" })
      .eq("id", userId);
    if (profileErr) { toast.error("Failed to approve: " + profileErr.message); return false; }
    if (requestId) {
      await (supabase as any).from("verification_requests").update({ status: "verified" }).eq("id", requestId);
    }
    toast.success("User verified successfully ✅");
    return true;
  };

  const rejectVerification = async (userId: string, requestId?: string, adminNote?: string) => {
    const { error: profileErr } = await (supabase as any)
      .from("profiles")
      .update({ verification_status: "rejected" })
      .eq("id", userId);
    if (profileErr) { toast.error("Failed to reject: " + profileErr.message); return false; }
    if (requestId) {
      await (supabase as any)
        .from("verification_requests")
        .update({ status: "rejected", admin_note: adminNote || "" })
        .eq("id", requestId);
    }
    toast.success("Verification rejected");
    return true;
  };

  // ── Escrow Release ────────────────────────────────────────────────────────
  const releaseEscrow = async (jobId: string) => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("Please sign in to proceed.");

      const response = await fetch(getApiUrl("/api/release-escrow"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ job_id: jobId })
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to release escrow on backend");
      }

      toast.success("Escrow released successfully ✅");
      return true;
    } catch (e: any) {
      toast.error(e.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const refundEscrow = async (jobId: string) => {
    setLoading(true);
    try {
      const { data: escrow } = await (supabase as any)
        .from("escrow_transactions")
        .select("*")
        .eq("job_id", jobId)
        .eq("status", "held")
        .maybeSingle();
      if (!escrow) { toast.error("Escrow record not found"); return false; }

      await (supabase as any).from("escrow_transactions").update({ status: "refunded" }).eq("id", escrow.id);
      await (supabase as any).from("jobs").update({ status: "disputed" }).eq("id", jobId);

      if (escrow.poster_id) {
        const { data: poster } = await (supabase as any).from("profiles").select("wallet_balance").eq("id", escrow.poster_id).maybeSingle();
        await (supabase as any).from("profiles").update({ wallet_balance: ((poster as any)?.wallet_balance || 0) + escrow.total_amount }).eq("id", escrow.poster_id);
      }
      toast.success("Refund issued to poster ✅");
      return true;
    } catch (e: any) {
      toast.error(e.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const processSplitRefund = async (jobId: string) => {
    setLoading(true);
    try {
      // 1. Fetch escrow record
      const { data: escrow } = await (supabase as any)
        .from("escrow_transactions")
        .select("*")
        .eq("job_id", jobId)
        .eq("status", "held")
        .maybeSingle();
      
      if (!escrow) {
        toast.error("Escrow transaction not found or already processed.");
        return false;
      }

      const budget = escrow.total_amount || 0;
      const posterRefund = Math.floor(budget * 0.70);
      const workerComp = Math.floor(budget * 0.25);
      const fee = budget - posterRefund - workerComp; // 5% platform fee

      // 2. Mark escrow as refunded/resolved with split metadata
      await (supabase as any)
        .from("escrow_transactions")
        .update({ 
          status: "refunded", 
          released_at: new Date().toISOString(),
          platform_fee: fee,
          worker_amount: workerComp
        })
        .eq("id", escrow.id);

      // 3. Mark job status as completed (resolved dispute)
      await (supabase as any)
        .from("jobs")
        .update({ status: "completed" })
        .eq("id", jobId);

      // 4. Update Poster wallet (70%)
      if (escrow.poster_id) {
        const { data: poster } = await (supabase as any)
          .from("profiles")
          .select("wallet_balance")
          .eq("id", escrow.poster_id)
          .maybeSingle();
        
        await (supabase as any)
          .from("profiles")
          .update({ wallet_balance: ((poster as any)?.wallet_balance || 0) + posterRefund })
          .eq("id", escrow.poster_id);
      }

      // 5. Update Worker wallet (25%)
      if (escrow.worker_id) {
        const { data: worker } = await (supabase as any)
          .from("profiles")
          .select("wallet_balance")
          .eq("id", escrow.worker_id)
          .maybeSingle();

        await (supabase as any)
          .from("profiles")
          .update({ wallet_balance: ((worker as any)?.wallet_balance || 0) + workerComp })
          .eq("id", escrow.worker_id);
      }

      // 6. Insert admin ledger entries for split tracking
      await (supabase as any).from("admin_ledger").insert([
        {
          job_id: jobId,
          type: "escrow_refunded",
          amount: posterRefund,
          from_user_id: escrow.poster_id,
          note: `Split Refund (70% Poster Refund): ₹${posterRefund}`
        },
        {
          job_id: jobId,
          type: "worker_paid",
          amount: workerComp,
          from_user_id: escrow.worker_id,
          note: `Split Refund (25% Worker Compensation): ₹${workerComp}`
        }
      ]);

      toast.success("Auto-split refund processed successfully! (70% Poster / 25% Worker) ✅");
      return true;
    } catch (e: any) {
      toast.error("Refund split execution failed: " + e.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    fetchAdminStats,
    fetchLedger,
    fetchEscrowQueue,
    fetchAllUsers,
    fetchPendingVerifications,
    getSignedUrls,
    approveVerification,
    rejectVerification,
    releaseEscrow,
    refundEscrow,
    processSplitRefund,
  };
};

export const mockNotifications: any[] = [];
