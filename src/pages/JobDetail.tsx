import { useParams, Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Star, Clock, ArrowLeft, CheckCircle, Info, Loader2, IndianRupee, MessageSquare, AlertTriangle, XCircle, Send, FileUp, Lock, Download, Sparkles } from "lucide-react";
import { useApp } from "@/context/AppContext";
import Navbar from "@/components/Navbar";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { openRazorpayCheckout } from "@/integrations/payments/razorpay";
import { sendBidNotification, sendBidRejectedNotification, sendPaymentRequiredNotification } from "@/hooks/useNotificationPermission";
import { useJobs } from "@/hooks/useJobs";
import { useJobFiles } from "@/hooks/useJobFiles";
import { NoScreenshotWrapper } from "@/components/NoScreenshotWrapper";
import { getApiUrl } from "@/lib/api";
 
const JobDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useApp();
  const { releaseEscrow, declineWork, placeBid, acceptJob, cancelJobForNonPayment } = useJobs();

  // UPI Modal States
  const [showUpiModal, setShowUpiModal] = useState(false);
  const [tempUpi, setTempUpi] = useState("");
  const [savingUpi, setSavingUpi] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ type: 'bid' | 'accept' } | null>(null);

  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [bids, setBids] = useState<any[]>([]);
  const [bidderRatings, setBidderRatings] = useState<Record<string, string>>({});
  const [hasAccepted, setHasAccepted] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [paymentDue, setPaymentDue] = useState<string | null>(null);

  // Bid form
  const [bidAmount, setBidAmount] = useState("");
  const [bidMessage, setBidMessage] = useState("");
  const [deliveryDays, setDeliveryDays] = useState("3");
  const [submittingBid, setSubmittingBid] = useState(false);
  const [bidSubmitted, setBidSubmitted] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);

  const loadJob = useCallback(async () => {
    if (!id) return;
    const { data } = await (supabase as any)
      .from("jobs")
      .select("*, poster:profiles!jobs_poster_id_fkey(full_name, avatar_url), worker:profiles!jobs_worker_id_fkey(full_name, email, upi_id), files:job_files(*)")
      .eq("id", id)
      .limit(1)
      .maybeSingle();
    if (data) {
      setJob(data);
      if (data.payment_due_at) setPaymentDue(data.payment_due_at);
    }
    setLoading(false);
  }, [id]);

  const loadBids = useCallback(async () => {
    if (!id) return;
    try {
      const { data } = await (supabase as any)
        .from("bids")
        .select("*, bidder:profiles!bids_bidder_id_fkey(full_name, avatar_url)")
        .eq("job_id", id)
        .order("created_at", { ascending: false });
      
      const bidsList = data || [];
      setBids(bidsList);

      const bidderIds = Array.from(new Set(bidsList.map((b: any) => b.bidder_id)));
      if (bidderIds.length > 0) {
        const { data: ratedJobs } = await (supabase as any)
          .from("jobs")
          .select("worker_id, rating")
          .in("worker_id", bidderIds)
          .eq("status", "completed")
          .not("rating", "is", null);
        
        const ratingsMap: Record<string, string> = {};
        bidderIds.forEach((workerId: any) => {
          const workerJobs = (ratedJobs || []).filter((j: any) => j.worker_id === workerId);
          if (workerJobs.length > 0) {
            const sum = workerJobs.reduce((acc: number, curr: any) => acc + Number(curr.rating), 0);
            ratingsMap[workerId] = (sum / workerJobs.length).toFixed(1);
          } else {
            ratingsMap[workerId] = "No ratings yet";
          }
        });
        setBidderRatings(ratingsMap);
      }
    } catch (err) {
      console.error("Error loading bids or bidder ratings:", err);
    }
  }, [id]);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const paymentStatus = searchParams.get("payment");
    if (paymentStatus === "success") {
      toast.success("Payment confirmed! Job is now in progress. 🎉");
      // Clean query params so toast doesn't re-trigger on refresh
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (paymentStatus === "failed") {
      const errorMsg = searchParams.get("error") === "signature_failed"
        ? "Payment verification failed (Signature mismatch)."
        : "Payment failed or was cancelled. Please try again.";
      toast.error(errorMsg);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    loadJob();
    loadBids();
  }, [id, loadJob, loadBids]);

  // Realtime bid updates
  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`job-updates-${id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "jobs", filter: `id=eq.${id}` },
        () => { loadJob(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "bids", filter: `job_id=eq.${id}` },
        () => { loadBids(); loadJob(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id, loadBids, loadJob]);

  // 5-minute payment countdown & Auto-rejection
  useEffect(() => {
    if (!paymentDue || job?.status !== 'payment_pending') return;
    const interval = setInterval(async () => {
      const diff = new Date(paymentDue).getTime() - Date.now();
      if (diff <= 0) { 
        setTimeLeft("0:00"); 
        clearInterval(interval);
        // Auto-reject
        await cancelJobForNonPayment(job.id);
        loadJob();
        return; 
      }
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${mins}:${secs < 10 ? "0" : ""}${secs}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [paymentDue, job?.status, job?.id, cancelJobForNonPayment, loadJob]);

  const isMyJob = job?.poster_id === user?.id;
  const isMyWorkerJob = job?.worker_id === user?.id;
  const isAuthorized = isMyJob || isMyWorkerJob;
  const maxBidAmount = job?.budget || 1000000;
  const myBid = bids.find(b => b.bidder_id === user?.id);
  const acceptedBid = bids.find(b => b.status === "accepted");

  // Secure file hook — signed URLs, only for authorized participants
  const { files: secureFiles, loading: filesLoading, refresh: refreshFiles } = useJobFiles(
    job?.id ?? "",
    isAuthorized,
    job?.status
  );

  const handleAcceptToView = () => {
    if (typeof Notification !== "undefined" && Notification.permission !== "granted") {
      toast.error("🔔 Notification Permission Required", {
        description: "You must enable browser notifications to accept jobs. Please enable notifications and try again.",
      });
      Notification.requestPermission();
      return;
    }

    setHasAccepted(true);
    toast.success("You can now view full details and place a bid.");
  };

  const handleSaveUpi = async () => {
    if (!tempUpi.trim()) {
      toast.error("Please enter your UPI ID");
      return;
    }
    if (!tempUpi.includes("@")) {
      toast.error("Please enter a valid UPI ID (e.g. name@bank)");
      return;
    }

    setSavingUpi(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ upi_id: tempUpi.trim() })
        .eq("id", user!.id);

      if (error) throw error;

      toast.success("UPI ID saved successfully! ✅");
      setShowUpiModal(false);
      await refreshProfile(); 

      // Re-trigger the pending action
      if (pendingAction) {
        if (pendingAction.type === 'bid') {
          setTimeout(() => handlePlaceBid(), 200);
        } else if (pendingAction.type === 'accept') {
          setTimeout(() => handleDirectAccept(), 200);
        }
        setPendingAction(null);
      }
    } catch (err: any) {
      toast.error("Failed to save UPI ID: " + err.message);
    } finally {
      setSavingUpi(false);
    }
  };

  const handlePlaceBid = async () => {
    if (typeof Notification !== "undefined" && Notification.permission !== "granted") {
      toast.error("🔔 Notification Permission Required", {
        description: "You must enable browser notifications to place a bid. Please enable notifications and try again.",
      });
      Notification.requestPermission();
      return;
    }

    const amount = Number(bidAmount);
    if (!amount || amount <= 0) { toast.error("Enter a valid bid amount"); return; }
    if (!bidMessage.trim()) { toast.error("Add a message with your bid"); return; }
    
    if (!user?.id) { 
      toast.error("Please sign in or sign up first to place a bid."); 
      navigate("/auth");
      return; 
    }

    // Check UPI ID
    const upiId = (profile as any)?.upi_id;
    if (!upiId) {
      setPendingAction({ type: 'bid' });
      setShowUpiModal(true);
      return;
    }

    setSubmittingBid(true);
    try {
      const result = await placeBid({
        job_id: id!,
        bidder_id: user.id,
        amount,
        message: bidMessage.trim(),
        delivery_days: Number(deliveryDays) || 3,
        status: "pending",
      });

      if (result) {
        sendBidNotification(job?.title || "Job", amount, user?.email || "Worker");
        setBidAmount(""); setBidMessage(""); setDeliveryDays("3");
        setSubmittingBid(false);
        setBidSubmitted(true);
        toast.success("Bid placed! The poster has been notified.");
        loadBids();
        
        // Auto-hide success message after 5 seconds
        setTimeout(() => setBidSubmitted(false), 5000);
      } else {
        setSubmittingBid(false);
      }
    } catch (err) {
      console.error("handlePlaceBid Error:", err);
      setSubmittingBid(false);
    }
  };

  const handleAcceptBid = async (bid: any) => {
    if (typeof Notification !== "undefined" && Notification.permission !== "granted") {
      toast.error("🔔 Notification Permission Required", {
        description: "You must enable browser notifications to accept this bid. Please enable notifications and try again.",
      });
      Notification.requestPermission();
      return;
    }

    const paymentDueAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    // Update bid status
    await (supabase as any).from("bids").update({ status: "accepted" }).eq("id", bid.id);
    // Update job with worker, payment deadline and the summed budget
    const totalAmount = Number(job.budget) + Number(bid.amount);
    await (supabase as any).from("jobs").update({
      worker_id: bid.bidder_id,
      status: "payment_pending" as any, // Use payment_pending first
      payment_due_at: paymentDueAt,
      accepted_bid_id: bid.id,
      budget: totalAmount,
    }).eq("id", id!);

    setPaymentDue(paymentDueAt);
    sendPaymentRequiredNotification(job?.title || "Job", bid.amount);
    toast.success("Bid accepted! Pay within 5 minutes to confirm.");
    loadJob(); loadBids();
  };

  const handleRejectBid = async (bid: any) => {
    await (supabase as any).from("bids").update({ status: "rejected" }).eq("id", bid.id);
    sendBidRejectedNotification(job?.title || "Job", bid.amount);
    toast.success("Bid rejected. Worker has been notified.");
    loadBids();
  };

  const handlePaymentSuccess = () => {
    toast.success(`Payment confirmed! Job is now in progress.`);
    setPaymentDue(null);
    loadJob();
    loadBids();
  };

  const handlePayment = async (bid: any) => {
    if (processingPayment) return;
    setProcessingPayment(true);
    toast.loading("Opening secure checkout modal...", { duration: 2000 });
    openRazorpayCheckout(
      bid.amount,
      job?.title || "Job Deliverable",
      user?.email || null,
      async (paymentResponse: any) => {
        toast.dismiss();
        toast.loading("Verifying payment on backend... ⌛");
        try {
          const verificationResponse = await fetch(getApiUrl("/api/verify-payment"), {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              payment_id: paymentResponse.razorpay_payment_id,
              expected_amount: bid.amount,
              job_id: id!,
              bid_id: bid.id,
            }),
          });
          
          const result = await verificationResponse.json();
          if (result && result.success) {
            setProcessingPayment(false);
            toast.dismiss();
            handlePaymentSuccess();
          } else {
            setProcessingPayment(false);
            toast.dismiss();
            toast.error(result.error || "Payment verification failed. Please contact support.");
          }
        } catch (err: any) {
          setProcessingPayment(false);
          toast.dismiss();
          toast.error("Failed to verify payment with backend: " + err.message);
        }
      },
      () => {
        setProcessingPayment(false);
        toast.dismiss();
        toast.error("Payment transaction failed. Please try again.");
      },
      () => {
        setProcessingPayment(false);
        toast.dismiss();
        toast.info("Payment cancelled.");
      }
    );
  };

  const handleDirectAccept = async () => {
    if (typeof Notification !== "undefined" && Notification.permission !== "granted") {
      toast.error("🔔 Notification Permission Required", {
        description: "You must enable browser notifications to accept this job. Please enable notifications and try again.",
      });
      Notification.requestPermission();
      return;
    }

    if (!user?.id) { 
      toast.error("Please sign in or sign up first to accept jobs."); 
      navigate("/auth");
      return; 
    }

    // Check UPI ID
    const upiId = (profile as any)?.upi_id;
    if (!upiId) {
      setPendingAction({ type: 'accept' });
      setShowUpiModal(true);
      return;
    }
    
    setSubmittingBid(true);
    const result = await acceptJob(id!, user.id);
    if (result) {
      toast.success("Job accepted directly! The poster has been notified to deposit the funds within 5 minutes.");
      loadJob();
    }
    setSubmittingBid(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading job details...</p>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="font-display text-2xl font-bold">Job not found</h1>
          <Link to="/jobs"><Button variant="hero" className="mt-4">Browse Jobs</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <Link to="/jobs" className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to jobs
        </Link>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* ── Left ── */}
          <div className="lg:col-span-2 space-y-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>

              <div className="flex gap-2 mb-3 flex-wrap">
                <Badge variant="category">{job.category}</Badge>
                {job.status === "open" && <Badge variant="outline">Open for Bids</Badge>}
                {job.status === "payment_pending" && <Badge className="bg-amber-500">Awaiting Payment {timeLeft && `(${timeLeft})`}</Badge>}
                {job.status === "accepted" && <Badge className="bg-green-500">In Progress</Badge>}
                {job.status === "in_progress" && <Badge className="bg-green-500">In Progress</Badge>}
                {job.status === "submitted" && <Badge className="bg-blue-500">Work Submitted</Badge>}
                {job.status === "completed" && <Badge className="bg-primary">Completed</Badge>}
              </div>

              <h1 className="font-display text-2xl font-bold text-foreground md:text-3xl">{job.title}</h1>
              <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><Clock className="h-4 w-4" />
                  Due {job.deadline && !isNaN(Date.parse(job.deadline)) ? new Date(job.deadline).toLocaleDateString("en-IN", { month: "long", day: "numeric", year: "numeric" }) : "—"}
                </span>
                <span className="flex items-center gap-1"><IndianRupee className="h-4 w-4" />Budget: ₹{job.budget}</span>
              </div>

              <div className="mt-6">
                <h2 className="mb-2 font-display text-lg font-semibold">Description</h2>
                <p className="leading-relaxed text-muted-foreground whitespace-pre-wrap">{job.description}</p>
              </div>

              {job.skills?.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {job.skills.map((s: string) => <Badge key={s} variant="secondary">{s}</Badge>)}
                </div>
              )}

              {/* Accepted Worker Details (visible only to the poster after payment is completed) */}
              {isMyJob && ["accepted", "in_progress", "submitted", "completed"].includes(job.status) && job.worker && (
                <motion.div 
                  initial={{ opacity: 0, y: 15 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  className="mt-8 p-6 bg-green-50 border border-green-200 rounded-3xl space-y-4"
                >
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 bg-green-600 rounded-2xl flex items-center justify-center text-white shrink-0">
                      <CheckCircle className="h-6 w-6" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-display font-bold text-lg text-foreground">Hired Worker Contact Details</h3>
                      <p className="text-sm text-muted-foreground font-medium">Payment successfully verified! You can now get in touch with the hired expert to coordinate deliverables.</p>
                    </div>
                  </div>
                  <div className="border-t border-green-200/60 pt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="p-3 bg-white/60 rounded-xl border border-green-100">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Full Name</p>
                      <p className="font-semibold text-foreground mt-0.5">{job.worker.full_name || "N/A"}</p>
                    </div>
                    <div className="p-3 bg-white/60 rounded-xl border border-green-100">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Email Address</p>
                      <a href={`mailto:${job.worker.email}`} className="font-semibold text-primary hover:underline mt-0.5 block truncate">
                        {job.worker.email || "N/A"}
                      </a>
                    </div>
                    <div className="p-3 bg-white/60 rounded-xl border border-green-100">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">UPI ID (For Payout)</p>
                      <p className="font-semibold text-foreground font-mono mt-0.5">{job.worker.upi_id || "N/A"}</p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Accept to view (worker) */}
              {!isMyJob && !hasAccepted && job.status === "open" && !myBid && (
                <div className="mt-8 p-6 border-2 border-dashed border-primary/30 rounded-2xl text-center space-y-3 bg-primary/5">
                  <Info className="h-8 w-8 text-primary mx-auto" />
                  <h3 className="font-bold text-foreground">Accept to View Full Details & Bid</h3>
                  <p className="text-sm text-muted-foreground">Click below to unlock the full job instructions and place your bid.</p>
                  <Button variant="hero" onClick={handleAcceptToView}>Accept & View Job</Button>
                </div>
              )}

              {/* Poster Action Banner (Payment Pending) */}
              {isMyJob && job.status === "payment_pending" && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mt-8 p-6 bg-primary/10 border-2 border-primary/30 rounded-3xl space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 bg-primary rounded-2xl flex items-center justify-center text-white shrink-0">
                      <IndianRupee className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-lg text-foreground">Worker Accepted! Secure the Funds</h3>
                      <p className="text-sm text-muted-foreground">A worker has claimed this job. Please deposit the budget into escrow within {timeLeft || '5 minutes'} to start the project. Funds are only released when you approve the work.</p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button variant="hero" className="flex-1 h-12 text-lg shadow-lg shadow-primary/20" 
                      onClick={() => handlePayment({ amount: job.budget, bidder_id: job.worker_id, id: job.accepted_bid_id || 'direct' })}
                      disabled={processingPayment}
                    >
                      {processingPayment ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
                      Pay ₹{job.budget} & Start Project
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* Files & Brief Preview */}
              <NoScreenshotWrapper>
                <div className="mt-8">
                  <h2 className="mb-4 font-display text-lg font-bold flex items-center gap-2">
                    <FileUp className="h-5 w-5 text-primary" /> Project Files & Brief
                  </h2>
                  {filesLoading ? (
                    <div className="flex items-center gap-2 text-muted-foreground text-sm py-4">
                      <Loader2 className="h-4 w-4 animate-spin" /> Loading files...
                    </div>
                  ) : secureFiles.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">No files attached to this job.</p>
                  ) : (
                    <div className="grid gap-3">
                      {secureFiles.map((file) => (
                        <div key={file.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-xl border group">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                              <FileUp className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="text-sm font-bold truncate max-w-[200px] md:max-w-md">{file.file_name}</p>
                              <p className="text-[10px] text-muted-foreground uppercase">
                                {file.is_submission ? "Submission" : "Brief File"} · {file.file_type?.split('/')[1] || 'file'}
                              </p>
                            </div>
                          </div>
                          {/* Download only if signed URL exists (completed jobs for submission files) */}
                          {file.downloadUrl ? (
                            <a href={file.downloadUrl} download={file.file_name}>
                              <Button size="sm" variant="ghost" className="text-primary hover:bg-primary/10 gap-1">
                                <Download className="h-3.5 w-3.5" /> Download
                              </Button>
                            </a>
                          ) : file.is_submission ? (
                            <Badge variant="outline" className="text-[10px] opacity-60">
                              <Lock className="h-3 w-3 mr-1" /> Locked until accepted
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] text-green-600 border-green-200">
                              Brief File
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </NoScreenshotWrapper>

              {/* Instructions (after payment) */}
              {(isMyJob || (isMyWorkerJob && ["accepted", "in_progress", "submitted", "completed"].includes(job.status))) && job.instructions && (
                <div className="mt-6 p-4 bg-muted/30 rounded-xl border">
                  <h2 className="mb-2 font-display text-base font-semibold">Instructions</h2>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{job.instructions}</p>
                </div>
              )}

              {/* Bid Success Message */}
              <AnimatePresence>
                {bidSubmitted && (
                  <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="mt-8">
                    <Card className="border-green-300 bg-green-50 shadow-lg">
                      <CardContent className="p-6 text-center space-y-3">
                        <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                          <CheckCircle className="h-6 w-6 text-green-600" />
                        </div>
                        <h3 className="font-display font-bold text-green-800 text-lg">Bid Submitted Successfully!</h3>
                        <p className="text-sm text-green-700">The project poster has been notified. You'll receive a notification if your bid is accepted.</p>
                        <Button variant="outline" size="sm" onClick={() => setBidSubmitted(false)}>Dismiss</Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Actions: Direct Accept OR Bid */}
              {!isMyJob && job.status === "open" && !myBid && !bidSubmitted && user?.id && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-8 space-y-6">
                  {/* Direct Accept Option */}
                  <div className="p-6 bg-primary/5 border border-primary/20 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="text-center md:text-left">
                      <h3 className="font-bold text-foreground">Skip Bidding?</h3>
                      <p className="text-sm text-muted-foreground">Accept this job immediately for the full budget of ₹{job.budget}.</p>
                    </div>
                    <Button variant="hero" className="shrink-0" onClick={handleDirectAccept} disabled={submittingBid}>
                      Accept Directly for ₹{job.budget}
                    </Button>
                  </div>

                  <div className="relative py-4 flex items-center">
                    <div className="flex-grow border-t border-muted"></div>
                    <span className="flex-shrink mx-4 text-xs font-bold text-muted-foreground uppercase tracking-widest">Or Place a custom bid</span>
                    <div className="flex-grow border-t border-muted"></div>
                  </div>

                  {/* Bid form */}
                  <Card className="border-primary/20 shadow-card">
                    <CardContent className="p-6 space-y-4">
                      <h2 className="font-display text-lg font-bold flex items-center gap-2">
                        <Send className="h-5 w-5 text-primary" /> Place Your Bid
                      </h2>
                      <p className="text-xs text-muted-foreground">
                        Budget: <span className="font-bold text-foreground">₹{job.budget}</span>
                      </p>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-medium mb-1 block">Your Bid (₹) *</label>
                          <Input type="number" placeholder="Enter your bid amount" value={bidAmount} min={1}
                            onChange={(e) => setBidAmount(e.target.value)} />
                        </div>
                        <div>
                          <label className="text-xs font-medium mb-1 block">Delivery Days *</label>
                          <Input type="number" placeholder="e.g. 3" value={deliveryDays} min={1} onChange={(e) => setDeliveryDays(e.target.value)} />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-medium mb-1 block">Message to Poster *</label>
                        <textarea className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          placeholder="Describe your approach and experience..." value={bidMessage} onChange={(e) => setBidMessage(e.target.value)} />
                      </div>
                      <Button variant="hero" className="w-full gap-2" onClick={handlePlaceBid} disabled={submittingBid}>
                        {submittingBid ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        Submit Bid
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* My bid status */}
              {!isMyJob && myBid && (
                <div className={`mt-6 p-4 rounded-xl border ${myBid.status === "accepted" ? "bg-green-50 border-green-200" : myBid.status === "rejected" ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200"}`}>
                  <div className="flex items-center gap-2">
                    {myBid.status === "accepted" && <CheckCircle className="h-5 w-5 text-green-600" />}
                    {myBid.status === "rejected" && <XCircle className="h-5 w-5 text-red-600" />}
                    {myBid.status === "pending" && <Clock className="h-5 w-5 text-amber-600" />}
                    <div>
                      <p className="font-bold text-sm">
                        {myBid.status === "accepted" && "Your bid was accepted! Waiting for payment."}
                        {myBid.status === "rejected" && "Your bid was rejected."}
                        {myBid.status === "pending" && "Bid submitted — waiting for poster response"}
                      </p>
                      <p className="text-xs text-muted-foreground">Bid: ₹{myBid.amount} · {myBid.delivery_days} days</p>
                    </div>
                  </div>
                  {myBid.status === "rejected" && (
                    <p className="text-xs text-red-600 mt-2">The poster rejected your bid. Browse other jobs.</p>
                  )}
                </div>
              )}

              {/* Bids list (poster) */}
              {isMyJob && (
                <div className="mt-8 space-y-4">
                  <h2 className="font-display text-lg font-bold flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-primary" /> Bids Received ({bids.length})
                  </h2>
                  {bids.length === 0 ? (
                    <div className="p-6 border border-dashed rounded-xl text-center text-muted-foreground">
                      <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No bids yet.</p>
                    </div>
                  ) : (
                    <AnimatePresence>
                      {bids.map((bid, i) => (
                        <motion.div key={bid.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                          <Card className={`border ${bid.status === "accepted" ? "border-green-300 bg-green-50" : bid.status === "rejected" ? "border-red-200 bg-red-50/30 opacity-60" : "border-primary/20"}`}>
                            <CardContent className="p-4 space-y-3">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-sm">
                                    {bid.bidder?.full_name?.charAt(0)?.toUpperCase() || "W"}
                                  </div>
                                  <div>
                                    <p className="font-bold text-sm">{bid.bidder?.full_name || "Worker"}</p>
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <p className="text-[10px] text-muted-foreground">Delivery: {bid.delivery_days} days</p>
                                      <span className="text-[10px] text-muted-foreground">•</span>
                                      <div className="flex items-center gap-0.5 text-[10px] font-semibold text-slate-700">
                                        {bidderRatings[bid.bidder_id] && bidderRatings[bid.bidder_id] !== "No ratings yet" ? (
                                          <>
                                            <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
                                            <span>{bidderRatings[bid.bidder_id]}</span>
                                          </>
                                        ) : (
                                          <span>No ratings yet</span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="font-black text-lg">₹{bid.amount}</p>
                                  <Badge variant="outline" className={`text-[9px] ${bid.status === "accepted" ? "bg-green-100 text-green-700 border-green-300" : bid.status === "rejected" ? "bg-red-100 text-red-700 border-red-300" : "bg-amber-50 text-amber-700 border-amber-200"}`}>
                                    {bid.status.toUpperCase()}
                                  </Badge>
                                </div>
                              </div>
                              <p className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-3">{bid.message}</p>

                              {bid.status === "pending" && !acceptedBid && (
                                <div className="flex gap-2 pt-1">
                                  <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700 text-white gap-1" onClick={() => handleAcceptBid(bid)}>
                                    <CheckCircle className="h-3.5 w-3.5" /> Accept Bid
                                  </Button>
                                  <Button size="sm" variant="outline" className="flex-1 text-destructive border-destructive/30 gap-1" onClick={() => handleRejectBid(bid)}>
                                    <XCircle className="h-3.5 w-3.5" /> Reject
                                  </Button>
                                </div>
                              )}

                              {/* Payment handled via banner only */}
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  )}
                </div>
              )}

              {/* Approve/Decline work — direct to SubmittedWork page */}
              {isMyJob && job.status === "submitted" && (
                <div className="mt-8 p-6 bg-primary/5 border border-primary/20 rounded-2xl space-y-4">
                  <h3 className="font-display font-bold text-lg">Work Has Been Submitted!</h3>
                  <p className="text-sm text-muted-foreground">Review the submitted files and accept or reject the work from the dashboard.</p>
                  <Link to="/dashboard/submitted">
                    <Button variant="hero" className="gap-2">
                      <CheckCircle className="h-4 w-4" /> Review Submitted Work
                    </Button>
                  </Link>
                </div>
              )}
            </motion.div>
          </div>

          {/* ── Right Sidebar ── */}
          <div className="space-y-6">
            <Card className="shadow-card overflow-hidden border-primary/10">
              <CardContent className="p-0">
                <div className="p-8 text-center text-white bg-gradient-to-br from-primary to-primary/80">
                  <p className="text-xs uppercase font-black tracking-widest opacity-60 mb-1">Project Budget</p>
                  <div className="font-display text-4xl font-black">₹{job.budget}</div>
                </div>
                <div className="p-6 space-y-4">
                  {isMyJob && paymentDue && acceptedBid && (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-center">
                      <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">Pay Within</p>
                      <p className="text-3xl font-display font-black text-amber-800">{timeLeft}</p>
                    </div>
                  )}
                  <div className="border-t pt-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 font-bold text-primary text-sm shrink-0">
                        {(job.poster?.full_name || "U").substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase font-bold">Posted By</p>
                        <p className="font-bold text-sm">{job.poster?.full_name || "Anonymous"}</p>
                      </div>
                    </div>
                  </div>
                  {isMyJob && (
                    <div className="flex items-center justify-between text-sm border-t pt-3">
                      <span className="text-muted-foreground">Total Bids</span>
                      <span className="font-bold">{bids.length}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {!isMyJob && (
              <Card className="border-amber-200 bg-amber-50">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center gap-2 text-amber-700 font-bold text-sm">
                    <AlertTriangle className="h-4 w-4" /> Bidding Rules
                  </div>
                  <ul className="text-xs text-amber-700 space-y-1 list-disc list-inside">
                    <li>One bid per job</li>
                    <li>Poster must pay within 10 mins of accepting</li>
                    <li>You'll be notified if bid is rejected</li>
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* UPI ID Prompt Modal */}
      <Dialog open={showUpiModal} onOpenChange={setShowUpiModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              UPI ID Required
            </DialogTitle>
            <DialogDescription>
              Please provide your UPI ID to receive payouts and proceed with bidding or accepting this job.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 text-left">
            <div className="space-y-2">
              <Label htmlFor="temp-upi-detail">UPI ID *</Label>
              <Input
                id="temp-upi-detail"
                value={tempUpi}
                onChange={(e) => setTempUpi(e.target.value)}
                placeholder="e.g. 9876543210@paytm"
                className="font-medium"
              />
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Enter a valid UPI ID (e.g., number@bank or name@bank). This is required to process and release assignment payments.
              </p>
            </div>
          </div>
          <DialogFooter className="flex sm:justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setShowUpiModal(false)}>
              Cancel
            </Button>
            <Button type="button" variant="hero" onClick={handleSaveUpi} disabled={savingUpi}>
              {savingUpi ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save & Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default JobDetail;
