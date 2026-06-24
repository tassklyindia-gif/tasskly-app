import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import type { User, Session } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { Job, Bid, mockJobs as initialJobs, mockBids as initialBids } from "@/data/mockData";
import { toast } from "sonner";
import { sendBidNotification, sendJobAcceptedAlarm } from "@/hooks/useNotificationPermission";
import { useJobs } from "@/hooks/useJobs";

export interface UserBid extends Bid {
  status: "pending" | "accepted" | "rejected";
  jobTitle: string;
}

export interface Payment {
  id: string;
  jobId: string;
  jobTitle: string;
  amount: number;
  type: "earned" | "spent";
  date: string;
  status: "completed" | "pending" | "escrow";
  // Who ultimately receives/holds this money from the platform perspective
  recipient: "platform" | "freelancer" | "poster";
}

// === Supabase profile type ===
export type Profile = Database['public']['Tables']['profiles']['Row'];

interface AppState {
  // --- Supabase auth state ---
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  authLoading: boolean;
  // --- Existing mock state (preserved) ---
  jobs: Job[];
  myPostedJobs: Job[];
  myWorkingJobs: Job[];
  myBids: UserBid[];
  payments: Payment[];
  currentUser: { 
    name: string; 
    avatar: string; 
    rating: number; 
    completedJobs: number; 
    balance: number;
    campus: string;
    skillScores: Record<string, number>;
    email: string;
    contact: string;
  };
  isAdmin: boolean;
  platformBalance: number;
  refreshProfile: () => Promise<void>;
  refreshJobs: () => Promise<void>;
  updateMyJobs: () => Promise<void>;
  addJob: (job: Omit<Job, "id" | "postedBy" | "bidsCount" | "status" | "createdAt">) => Promise<any>;
  deleteJob: (id: string) => void;
  updateJobStatus: (id: string, status: Job["status"]) => void;
  placeBid: (jobId: string, amount: number, message: string, deliveryDays: number) => void;
  withdrawBid: (bidId: string) => void;
  acceptBid: (bidId: string) => void;
  rejectBid: (bidId: string) => void;
  getBidsForJob: (jobId: string) => UserBid[];
  releaseEscrow: (paymentId: string) => void;
  recordPostingFee: (jobTitle: string, amount: number) => void;
  toggleRescueMode: (id: string) => void;
}

const AppContext = createContext<AppState | null>(null);

const currentUser = {
  name: "You",
  avatar: "YO",
  rating: 4.9,
  completedJobs: 12,
  balance: 0,
  campus: "Stanford University",
  skillScores: { Coding: 4.8, Design: 4.5, Writing: 5.0 },
  email: "you@stanford.edu",
  contact: "+1 (555) 000-0000",
};

const initialMyJobs: Job[] = [];

const initialMyBids: UserBid[] = [];

const initialPayments: Payment[] = [];

export function AppProvider({ children }: { children: ReactNode }) {
  // === Supabase auth state ===
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Track the logged-in user ID to prevent background token refreshes from wiping out dashboard states
  const lastUserIdRef = React.useRef<string | null>(null);

  // Fetch profile row from Supabase when user changes
  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await (supabase
      .from('profiles') as any)
      .select('*')
      .eq('id', userId)
      .limit(1)
      .maybeSingle();
    if (error) {
      console.error('Error fetching profile:', error);
      setProfile(null);
    } else if (!data) {
      // Safety net: Create profile if missing
      console.log('Profile missing, creating default...');
      const { data: user } = await supabase.auth.getUser();
      if (user?.user) {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        let randId = "TSY-";
        for (let i = 0; i < 6; i++) {
          randId += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        const { data: newProfile, error: createError } = await (supabase
          .from('profiles') as any)
          .upsert({
            id: userId,
            email: user.user.email || '',
            full_name: user.user.user_metadata?.full_name || 'User',
            role: (['karthikmethuku180@gmail.com', 'shrikarakarapu@gmail.com', 'tasskly@admin.com'].includes(user.user.email || '') ? 'admin' : 'worker') as const,
            wallet_balance: 0,
            is_verified: false,
            verification_status: 'unverified' as const,
            tasskly_id: randId
          })
          .select()
          .limit(1)
          .maybeSingle();
        
        if (!createError) setProfile(newProfile as Profile);
      }
    } else {
      // Auto-generate tasskly_id if not present or in old format TSK-
      if (!data.tasskly_id || data.tasskly_id.startsWith("TSK-")) {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        let randId = "TSY-";
        for (let i = 0; i < 6; i++) {
          randId += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        const { data: updatedProfile, error: updateError } = await (supabase
          .from('profiles') as any)
          .update({ tasskly_id: randId })
          .eq('id', userId)
          .select()
          .limit(1)
          .maybeSingle();
        
        if (!updateError && updatedProfile) {
          setProfile(updatedProfile as Profile);
          return;
        }
      }

      // Auto-upgrade admins who signed up before database trigger inclusion
      const adminEmails = ['karthikmethuku180@gmail.com', 'shrikarakarapu@gmail.com', 'tasskly@admin.com'];
      if (data.email && adminEmails.includes(data.email) && data.role !== 'admin') {
        const { data: updatedProfile, error: updateError } = await (supabase
          .from('profiles') as any)
          .update({ role: 'admin' })
          .eq('id', userId)
          .select()
          .limit(1)
          .maybeSingle();
        
        if (!updateError && updatedProfile) {
          setProfile(updatedProfile as Profile);
          return;
        }
      }
      setProfile(data);
    }
  }, []);

  // On mount: restore session and listen for auth changes
  useEffect(() => {
    // 1. Get existing session
    supabase.auth.getSession().then(async ({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      if (currentSession?.user) {
        lastUserIdRef.current = currentSession.user.id;
        await fetchProfile(currentSession.user.id);
      }
      setAuthLoading(false);
    });

    // 2. Listen for auth state changes (login / logout / token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        const newUserId = newSession?.user?.id || null;
        const oldUserId = lastUserIdRef.current;

        setSession(newSession);
        setUser(newSession?.user ?? null);
        
        // ONLY clear and refresh states if the user ID actually changed (e.g. login, logout, switch)
        if (newUserId !== oldUserId) {
          lastUserIdRef.current = newUserId;
          setMyPostedJobs([]);
          setMyWorkingJobs([]);
          setMyBids([]);
          setPayments([]);
          
          if (newSession?.user) {
            fetchProfile(newSession.user.id);
          } else {
            setProfile(null);
          }
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  // === Real Supabase hooks ===
  const { postJob: supabasePostJob, acceptJob: supabaseAcceptJob, releaseEscrow: supabaseReleaseEscrow, submitWork: supabaseSubmitWork, fetchJobs: supabaseFetchJobs, fetchMyJobs: supabaseFetchMyJobs } = useJobs();

  // === Existing mock state (preserved exactly as-is) ===
  const [jobs, setJobs] = useState<Job[]>([]);
  const [myPostedJobs, setMyPostedJobs] = useState<Job[]>(initialMyJobs);
  const [myWorkingJobs, setMyWorkingJobs] = useState<Job[]>([]);
  const [myBids, setMyBids] = useState<UserBid[]>(initialMyBids);
  const [payments, setPayments] = useState<Payment[]>(initialPayments);
  
  // isAdmin derived from profile or email
  const isAdmin = profile?.role === 'admin' || 
    user?.email === 'tasskly@admin.com' || 
    user?.email === 'karthikmethuku180@gmail.com' ||
    user?.email === 'shrikarakarapu@gmail.com';
  const [platformBalance, setPlatformBalance] = useState(0);

  const refreshJobs = useCallback(async () => {
    const realJobs = await supabaseFetchJobs();
    if (realJobs && realJobs.length > 0) {
      // Map Supabase jobs to the mock Job shape for UI compatibility
      const mapped: Job[] = realJobs.map((rj: any) => ({
        id: rj.id,
        title: rj.title,
        description: rj.description,
        category: rj.category,
        budget: rj.budget,
        deadline: rj.deadline || '',
        postedBy: {
          name: rj.poster?.full_name || 'Unknown',
          avatar: (rj.poster?.full_name || 'U').substring(0, 2).toUpperCase(),
          rating: 4.5,
          campus: '',
        },
        bidsCount: 0,
        status: rj.status as Job['status'],
        createdAt: rj.created_at?.split('T')[0] || '',
        skills: rj.skills || [],
        instructions: rj.instructions || undefined,
        poster_id: rj.poster_id,
        worker_id: rj.worker_id,
        payment_due_at: rj.payment_due_at,
        accepted_bid_id: rj.accepted_bid_id,
        isUrgent: rj.is_urgent,
        isQuickTask: rj.is_quick_task,
        campusOnly: rj.campus_only,
        isMentoring: rj.is_mentoring,
        isTeamTask: rj.is_team_task,
        is_urgent: rj.is_urgent,
        is_quick_task: rj.is_quick_task,
        campus_only: rj.campus_only,
        is_mentoring: rj.is_mentoring,
        is_team_task: rj.is_team_task,
      }));
      setJobs(mapped);
    } else {
      setJobs([]);
    }
  }, [supabaseFetchJobs]);

  const updateMyJobs = useCallback(async () => {
    if (user?.id) {
      const result = await supabaseFetchMyJobs(user.id);
      const mappedPosted: Job[] = (result.posted || []).map((rj: any) => ({
        id: rj.id,
        title: rj.title,
        description: rj.description,
        category: rj.category,
        budget: rj.budget,
        deadline: rj.deadline || '',
        postedBy: {
          name: profile?.full_name || 'You',
          avatar: (profile?.full_name || 'YO').substring(0, 2).toUpperCase(),
          rating: 4.9,
          campus: '',
        },
        bidsCount: 0,
        status: rj.status as Job['status'],
        createdAt: rj.created_at?.split('T')[0] || '',
        skills: rj.skills || [],
        instructions: rj.instructions || undefined,
        poster_id: rj.poster_id,
        worker_id: rj.worker_id,
        payment_due_at: rj.payment_due_at,
        accepted_bid_id: rj.accepted_bid_id,
        isUrgent: rj.is_urgent,
        isQuickTask: rj.is_quick_task,
        campusOnly: rj.campus_only,
        isMentoring: rj.is_mentoring,
        isTeamTask: rj.is_team_task,
        is_urgent: rj.is_urgent,
        is_quick_task: rj.is_quick_task,
        campus_only: rj.campus_only,
        is_mentoring: rj.is_mentoring,
        is_team_task: rj.is_team_task,
      }));
      setMyPostedJobs(mappedPosted);

      const mappedWorking: Job[] = (result.working || []).map((rj: any) => ({
        id: rj.id,
        title: rj.title,
        description: rj.description,
        category: rj.category,
        budget: rj.budget,
        deadline: rj.deadline || '',
        postedBy: {
          name: 'Client',
          avatar: 'CL',
          rating: 4.9,
          campus: '',
        },
        bidsCount: 0,
        status: rj.status as Job['status'],
        createdAt: rj.created_at?.split('T')[0] || '',
        skills: rj.skills || [],
        instructions: rj.instructions || undefined,
        poster_id: rj.poster_id,
        worker_id: rj.worker_id,
        payment_due_at: rj.payment_due_at,
        accepted_bid_id: rj.accepted_bid_id,
        isUrgent: rj.is_urgent,
        isQuickTask: rj.is_quick_task,
        campusOnly: rj.campus_only,
        isMentoring: rj.is_mentoring,
        isTeamTask: rj.is_team_task,
        is_urgent: rj.is_urgent,
        is_quick_task: rj.is_quick_task,
        campus_only: rj.campus_only,
        is_mentoring: rj.is_mentoring,
        is_team_task: rj.is_team_task,
      }));
      setMyWorkingJobs(mappedWorking);
    } else {
      setMyPostedJobs([]);
      setMyWorkingJobs([]);
    }
  }, [user?.id, profile?.full_name, supabaseFetchMyJobs]);

  // Keep latest function references in refs to prevent Realtime channel resubscription churn
  const latestRefreshJobs = React.useRef(refreshJobs);
  const latestUpdateMyJobs = React.useRef(updateMyJobs);

  useEffect(() => {
    latestRefreshJobs.current = refreshJobs;
  }, [refreshJobs]);

  useEffect(() => {
    latestUpdateMyJobs.current = updateMyJobs;
  }, [updateMyJobs]);

  // On auth ready, fetch real jobs from Supabase and subscribe to Realtime updates
  useEffect(() => {
    if (!authLoading) {
      latestRefreshJobs.current();
      latestUpdateMyJobs.current();

      // Real-time subscription to keep dashboard updated across accounts
      const channel = supabase.channel('realtime-jobs-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, () => {
          latestRefreshJobs.current();
          latestUpdateMyJobs.current();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [authLoading]);

  const addJob = useCallback(async (jobData: Omit<Job, "id" | "postedBy" | "bidsCount" | "status" | "createdAt">) => {
    // Ensure user is authenticated
    if (!user?.id) {
      toast.error("You must be logged in to post a job.");
      return;
    }

    const supabaseJobData = {
      title: jobData.title,
      description: jobData.description,
      budget: jobData.budget,
      category: jobData.category,
      deadline: jobData.deadline || null,
      instructions: jobData.instructions || null,
      skills: (jobData as any).skills || [],
      is_quick_task: (jobData as any).isQuickTask || false,
      campus_only: (jobData as any).campusOnly || false,
      campus_name: (jobData as any).campusName || null,
      is_urgent: (jobData as any).isUrgent || false,
      urgent_time: (jobData as any).urgentTime || null,
      is_team_task: (jobData as any).isTeamTask || false,
      team_roles: (jobData as any).teamRoles || [],
      is_mentoring: (jobData as any).isMentoring || false,
    };
    const result = await supabasePostJob(supabaseJobData, user.id);
    if (result) {
      // Map to mock Job shape and add to local state
      const newJob: Job = {
        ...jobData,
        id: result.id,
        postedBy: {
          name: profile?.full_name || currentUser.name,
          avatar: (profile?.full_name || currentUser.name).substring(0, 2).toUpperCase(),
          rating: currentUser.rating,
          campus: currentUser.campus,
        },
        bidsCount: 0,
        status: "open",
        createdAt: new Date().toISOString().split("T")[0],
        poster_id: user.id,
        ...((jobData as any).isUrgent ? { isUrgent: true, is_urgent: true } : {}),
        ...((jobData as any).isQuickTask ? { isQuickTask: true, is_quick_task: true } : {}),
        ...((jobData as any).campusOnly ? { campusOnly: true, campus_only: true } : {}),
        ...((jobData as any).isMentoring ? { isMentoring: true, is_mentoring: true } : {}),
        ...((jobData as any).isTeamTask ? { isTeamTask: true, is_team_task: true } : {}),
      };
      setMyPostedJobs((prev) => [newJob, ...prev]);
      setJobs((prev) => [newJob, ...prev]);
      return result;
    }
    return null;
  }, [user?.id, profile?.full_name, supabasePostJob]);

  const deleteJob = useCallback(async (id: string) => {
    try {
      const { error } = await supabase.from('jobs').delete().eq('id', id);
      if (error) throw error;
      setMyPostedJobs((prev) => prev.filter((j) => j.id !== id));
      setJobs((prev) => prev.filter((j) => j.id !== id));
      toast.success("Job deleted");
      refreshJobs();
      updateMyJobs();
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete job");
    }
  }, [refreshJobs, updateMyJobs]);

  const updateJobStatus = useCallback((id: string, status: Job["status"]) => {
    const update = (prev: Job[]) => prev.map((j) => (j.id === id ? { ...j, status } : j));
    setMyPostedJobs(update);
    setJobs(update);
    toast.success(`Job marked as ${status.replace("_", " ")}`);
  }, []);

  const toggleRescueMode = useCallback((id: string) => {
    const update = (prev: Job[]) => prev.map((j) => (j.id === id ? { ...j, rescueMode: true, budget: j.budget * 1.5 } : j));
    setMyPostedJobs(update);
    setJobs(update);
    toast.success(`Rescue Mode activated! Budget increased by 50% and visibility boosted.`);
  }, []);

  const placeBid = useCallback((jobId: string, amount: number, message: string, deliveryDays: number) => {
    const job = [...jobs, ...myPostedJobs].find((j) => j.id === jobId);
    const newBid: UserBid = {
      id: `bid-${Date.now()}`,
      jobId,
      jobTitle: job?.title || "Unknown Job",
      bidder: { 
        name: currentUser.name, 
        avatar: currentUser.avatar, 
        rating: currentUser.rating, 
        completedJobs: currentUser.completedJobs,
        campus: currentUser.campus,
        skillScores: currentUser.skillScores
      },
      amount,
      message,
      deliveryDays,
      createdAt: new Date().toISOString().split("T")[0],
      status: "pending",
    };
    setMyBids((prev) => [newBid, ...prev]);
    const incBids = (prev: Job[]) => prev.map((j) => (j.id === jobId ? { ...j, bidsCount: j.bidsCount + 1 } : j));
    setJobs(incBids);
    setMyPostedJobs(incBids);
    // Send browser notification alarm to job poster
    sendBidNotification(job?.title || "Unknown Job", amount, currentUser.name);
    toast.success("Bid placed successfully!");
  }, [jobs, myPostedJobs]);

  const withdrawBid = useCallback((bidId: string) => {
    setMyBids((prev) => prev.filter((b) => b.id !== bidId));
    toast.success("Bid withdrawn");
  }, []);

  const acceptBid = useCallback(async (bidId: string) => {
    const bid = myBids.find((b) => b.id === bidId);

    // Ensure user is authenticated
    if (!user?.id || !bid?.jobId) {
      toast.error("Authentication required to accept bids.");
      return;
    }

    const result = await supabaseAcceptJob(bid.jobId, user.id);
    if (result) {
      // Update local state to reflect acceptance
      setMyBids((prev) => prev.map((b) => (b.id === bidId ? { ...b, status: "accepted" as const } : b)));
      const updateStatus = (jobs: Job[]) => jobs.map((j) => j.id === bid.jobId ? { ...j, status: "payment_pending" as const } : j);
      setMyPostedJobs(updateStatus);
      setJobs(updateStatus);
      if (bid) sendJobAcceptedAlarm(bid.jobTitle, bid.amount);
      toast.success("Bid accepted! Payment has been processed via Supabase.");
    }
  }, [user?.id, myBids, supabaseAcceptJob]);

  const releaseEscrow = useCallback(async (paymentId: string) => {
    // Ensure user is authenticated
    const payment = payments.find((p) => p.id === paymentId && p.status === "escrow");
    if (!user?.id || !payment?.jobId || payment.jobId === 'posting-fee') {
      toast.error("Cannot release escrow: Invalid payment or not authenticated.");
      return;
    }

    const result = await supabaseReleaseEscrow(payment.jobId, user.id);
    if (result) {
      // Update local state
      setPayments((prev) => prev.map((p) => p.id === paymentId ? { ...p, status: "completed" as const } : p));
      setPlatformBalance((b) => b - payment.amount);
      toast.success("Escrow released via Supabase.");
    }
  }, [user?.id, payments, supabaseReleaseEscrow]);

  const recordPostingFee = useCallback((jobTitle: string, amount: number) => {
    if (!amount || amount <= 0) return;
    const feePayment: Payment = {
      id: `pay-${Date.now()}-post-fee`,
      jobId: "posting-fee",
      jobTitle,
      amount,
      type: "spent",
      date: new Date().toISOString().split("T")[0],
      status: "completed",
      recipient: "platform",
    };
    setPayments((prev) => [feePayment, ...prev]);
    setPlatformBalance((b) => b + amount);
  }, []);

  const rejectBid = useCallback((bidId: string) => {
    setMyBids((prev) => prev.map((b) => (b.id === bidId ? { ...b, status: "rejected" as const } : b)));
    toast.success("Bid rejected");
  }, []);

  const getBidsForJob = useCallback((jobId: string) => {
    return myBids.filter((b) => b.jobId === jobId);
  }, [myBids]);

  return (
    <AppContext.Provider
      value={{
        // Supabase auth
        user,
        session,
        profile,
        authLoading,
        // Existing mock state
        jobs,
        myPostedJobs,
        myWorkingJobs,
        myBids,
        payments,
        currentUser,
        isAdmin,
        platformBalance,
        refreshProfile: async () => {
          if (user?.id) await fetchProfile(user.id);
        },
        refreshJobs,
        updateMyJobs,
        addJob,
        deleteJob,
        updateJobStatus,
        placeBid,
        withdrawBid,
        acceptBid,
        rejectBid,
        getBidsForJob,
        releaseEscrow,
        recordPostingFee,
        toggleRescueMode,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
