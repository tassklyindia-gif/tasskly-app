import { useEffect, useState, useCallback } from "react";
import { useApp } from "@/context/AppContext";
import { supabase } from "@/lib/supabase";
import { useJobs } from "@/hooks/useJobs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle,
  XCircle,
  Loader2,
  FileUp,
  Lock,
  AlertCircle,
  Download,
  Upload,
  X,
  Star,
} from "lucide-react";
import { toast } from "sonner";
import { NoScreenshotWrapper } from "@/components/NoScreenshotWrapper";
import { getSignedUrl } from "@/utils/storage";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { FilePreviewModal } from "@/components/FilePreviewModal";
import { Link } from "react-router-dom";

interface SubmittedFile {
  id: string;
  job_id: string;
  file_url: string;
  file_name: string;
  file_type: string;
  is_submission: boolean;
  downloadUrl?: string;
}

interface SubmittedJob {
  id: string;
  title: string;
  description: string;
  category: string;
  deadline: string;
  skills?: string[];
  status: string;
  budget: number;
  poster_id: string;
  worker_id: string;
  rejection_reason?: string;
  poster: { full_name: string };
  worker?: { full_name: string };
  files: SubmittedFile[];
}

const SubmittedWork = () => {
  const { user, profile } = useApp();
  const { submitWork } = useJobs();
  const [jobs, setJobs] = useState<SubmittedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectDialogJob, setRejectDialogJob] = useState<SubmittedJob | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [uploadDialogJob, setUploadDialogJob] = useState<SubmittedJob | null>(null);
  const [isGeneralUploadOpen, setIsGeneralUploadOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [previewFile, setPreviewFile] = useState<{ url: string; name: string; type: string; jobTitle: string; budget: number } | null>(null);
  const [acceptDialogJob, setAcceptDialogJob] = useState<SubmittedJob | null>(null);
  const [ratingValue, setRatingValue] = useState<number>(5);

  const fetchJobs = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      // Fetch jobs where user is poster or worker
      const { data, error } = await (supabase as any)
        .from("jobs")
        .select(
          "*, poster:profiles!jobs_poster_id_fkey(full_name), worker:profiles!jobs_worker_id_fkey(full_name), files:job_files(*)"
        )
        .or(`poster_id.eq.${user.id},worker_id.eq.${user.id}`)
        .in("status", ["accepted", "submitted", "completed", "disputed"])
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (!data) {
        setJobs([]);
        return;
      }

      // Attach signed URLs to submission files for completed jobs
      const enriched = await Promise.all(
        (data as SubmittedJob[]).map(async (job) => {
          const filesArray = job.files || [];
          const enrichedFiles = await Promise.all(
            filesArray.map(async (f) => {
              // Download link available for completed or submitted jobs
              if (job.status === "completed" || job.status === "submitted") {
                try {
                  const downloadUrl = await getSignedUrl("job-files", f.file_url);
                  return { ...f, downloadUrl };
                } catch {
                  return f;
                }
              }
              return f;
            })
          );
          return { ...job, files: enrichedFiles };
        })
      );

      setJobs(enriched);
    } catch (err: any) {
      console.error("SubmittedWork fetch error:", err);
      toast.error(err.message || "Failed to fetch submitted work");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const handleUploadDeliverable = async () => {
    if (!uploadDialogJob || !selectedFile || !user?.id) return;
    setUploading(true);
    try {
      const file = selectedFile;
      const timestamp = Date.now();
      const fileExt = file.name.split('.').pop();
      const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const filePath = `${uploadDialogJob.id}/submission_${timestamp}_${cleanFileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from("job-files")
        .upload(filePath, file);
        
      if (uploadError) throw uploadError;
      
      const success = await submitWork(
        uploadDialogJob.id,
        user.id,
        filePath,
        file.name,
        file.type
      );
      
      if (success) {
        setUploadDialogJob(null);
        setSelectedFile(null);
        toast.success("Deliverables submitted successfully!");
        fetchJobs();
      }
    } catch (err: any) {
      console.error("Upload error:", err);
      toast.error(err.message || "Failed to upload files");
    } finally {
      setUploading(false);
    }
  };

  const handleAccept = async (job: SubmittedJob, ratingVal: number) => {
    setActionLoading(true);
    try {
      // Get escrow transaction
      const { data: escrow } = await (supabase as any)
        .from("escrow_transactions")
        .select("id, worker_amount")
        .eq("job_id", job.id)
        .eq("status", "held")
        .single();

      if (escrow) {
        // Release escrow → update status to 'released'
        await (supabase as any)
          .from("escrow_transactions")
          .update({ status: "released", released_at: new Date().toISOString() })
          .eq("id", escrow.id);

        // Credit worker wallet
        await (supabase as any).rpc("increment_wallet", {
          user_id: job.worker_id,
          amount: escrow.worker_amount,
        }).catch(() => {
          // rpc may not exist yet – just log
          console.warn("increment_wallet RPC not found; wallet not updated");
        });

        // Log to admin ledger
        await (supabase as any).from("admin_ledger").insert({
          job_id: job.id,
          type: "escrow_released",
          amount: escrow.worker_amount,
          from_user_id: job.poster_id,
          to_user_id: job.worker_id,
          note: `Work accepted for: ${job.title}`,
        });
      }

      // Update job status to completed AND set the rating
      await (supabase as any)
        .from("jobs")
        .update({ status: "completed", rating: ratingVal })
        .eq("id", job.id);

      toast.success(`Work accepted with a ${ratingVal}-star rating! Payment released.`);
      setAcceptDialogJob(null);
      fetchJobs();
    } catch (err: any) {
      toast.error(err.message || "Failed to accept work.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectDialogJob) return;
    if (!rejectReason.trim()) {
      toast.error("Please provide a rejection reason.");
      return;
    }
    setActionLoading(true);
    try {
      const budget = rejectDialogJob.budget;
      const posterRefund = Math.floor(budget * 0.70);
      const workerComp = Math.floor(budget * 0.25);
      const platformFee = budget - posterRefund - workerComp;

      // Update escrow to refunded
      await (supabase as any)
        .from("escrow_transactions")
        .update({ status: "refunded" })
        .eq("job_id", rejectDialogJob.id)
        .eq("status", "held");

      // Update job status to disputed + store reason
      await (supabase as any)
        .from("jobs")
        .update({ status: "disputed", rejection_reason: rejectReason.trim() })
        .eq("id", rejectDialogJob.id);

      // Refund Poster (70%)
      await (supabase as any).rpc("increment_wallet", {
        user_id: rejectDialogJob.poster_id,
        amount: posterRefund,
      }).catch(() => console.warn("increment_wallet RPC not found"));

      // Compensate Worker (25%)
      await (supabase as any).rpc("increment_wallet", {
        user_id: rejectDialogJob.worker_id,
        amount: workerComp,
      }).catch(() => console.warn("increment_wallet RPC not found"));

      // Log Poster Refund to admin ledger
      await (supabase as any).from("admin_ledger").insert({
        job_id: rejectDialogJob.id,
        type: "refund",
        amount: posterRefund,
        from_user_id: rejectDialogJob.poster_id,
        to_user_id: rejectDialogJob.poster_id,
        note: `70% Refund for rejected work: ${rejectReason.trim()}`,
      });

      // Log Worker Compensation to admin ledger
      await (supabase as any).from("admin_ledger").insert({
        job_id: rejectDialogJob.id,
        type: "escrow_released",
        amount: workerComp,
        from_user_id: rejectDialogJob.poster_id,
        to_user_id: rejectDialogJob.worker_id,
        note: `25% Compensation for rejected work.`,
      });

      // Log Platform Fee to admin ledger
      await (supabase as any).from("admin_ledger").insert({
        job_id: rejectDialogJob.id,
        type: "fee_collected",
        amount: platformFee,
        from_user_id: rejectDialogJob.poster_id,
        note: `5% Platform fee on rejected work.`,
      });

      toast.success("Work rejected. Escrow marked for refund.");
      setRejectDialogJob(null);
      setRejectReason("");
      fetchJobs();
    } catch (err: any) {
      toast.error(err.message || "Failed to reject work.");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-muted pb-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Submitted Work</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Review submitted deliverables and accept or reject work.
          </p>
        </div>
        <Button
          variant="hero"
          className="gap-2 shrink-0 sm:w-auto w-full"
          onClick={() => {
            const activeJobs = jobs.filter(
              (j) => j.worker_id === user?.id && ["accepted", "disputed"].includes(j.status)
            );
            if (activeJobs.length > 0) {
              setUploadDialogJob(activeJobs[0]);
            } else {
              setUploadDialogJob(null);
            }
            setIsGeneralUploadOpen(true);
          }}
        >
          <Upload className="h-4 w-4" />
          Submit Work
        </Button>
      </div>

      {jobs.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground bg-muted/10 rounded-2xl border border-dashed border-muted/50 p-6 space-y-4">
          <Upload className="h-12 w-12 mx-auto mb-1 opacity-20 text-primary" />
          <div>
            <p className="font-semibold text-foreground text-base">No work files uploaded yet</p>
            <p className="text-sm mt-1 max-w-sm mx-auto">Upload and submit your deliverables for the jobs you have taken to request payouts.</p>
          </div>
          <Button
            variant="hero"
            className="gap-2 mx-auto"
            onClick={() => {
              const activeJobs = jobs.filter(
                (j) => j.worker_id === user?.id && ["accepted", "disputed"].includes(j.status)
              );
              if (activeJobs.length > 0) {
                setUploadDialogJob(activeJobs[0]);
              } else {
                setUploadDialogJob(null);
              }
              setIsGeneralUploadOpen(true);
            }}
          >
            <Upload className="h-4 w-4" />
            Upload Deliverables / Submit Work
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence>
            {jobs.map((job, i) => {
              const isPoster = job.poster_id === user?.id;
              const isWorker = job.worker_id === user?.id;
              const isCompleted = job.status === "completed";
              const isRejected = job.status === "disputed";
              const submissionFiles = (job.files || []).filter((f) => f.is_submission);
              const briefFiles = (job.files || []).filter((f) => !f.is_submission);

              return (
                <motion.div
                  key={job.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card className="border-primary/10 shadow-card overflow-hidden">
                    <CardContent className="p-5 space-y-4">
                      {/* Job Metadata & Status Header */}
                      <div className="flex items-center justify-between gap-3 border-b border-muted pb-3">
                        <div className="flex flex-wrap gap-2 items-center">
                          <Badge variant="category">{job.category || "General"}</Badge>
                          <Badge
                            variant={
                              isCompleted
                                ? "outline"
                                : isRejected
                                ? "destructive"
                                : (job.status === "accepted")
                                ? "default"
                                : "secondary"
                            }
                            className="shrink-0"
                          >
                            {job.status === "accepted" && "In Progress"}
                            {job.status === "submitted" && "Awaiting Review"}
                            {job.status === "completed" && "✓ Accepted"}
                            {job.status === "disputed" && "✗ Rejected"}
                          </Badge>
                        </div>
                        <span className="font-display text-lg font-bold text-primary">
                          ₹{job.budget}
                        </span>
                      </div>

                      {/* Job Title & Participants */}
                      <div className="space-y-1">
                        <Link
                          to={`/jobs/${job.id}`}
                          className="font-display text-lg font-bold text-foreground hover:text-primary transition-colors block leading-tight"
                        >
                          {job.title}
                        </Link>
                        <div className="flex flex-wrap justify-between items-center text-xs text-muted-foreground gap-2">
                          <span>
                            {isPoster
                              ? `👤 Worker: ${job.worker?.full_name || "—"}`
                              : `👤 Poster: ${job.poster?.full_name || "—"}`}
                          </span>
                          {job.deadline && !isNaN(Date.parse(job.deadline)) && (
                            <span className="flex items-center gap-1 font-medium">
                              📅 Deadline: {new Date(job.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Job Description & Brief Details */}
                      {job.description && (
                        <div className="text-sm text-muted-foreground bg-muted/20 p-3.5 rounded-xl border border-muted/30">
                          <p className="font-bold text-xs uppercase tracking-wider text-foreground/75 mb-1">Project Brief / Description</p>
                          <p className="line-clamp-4 whitespace-pre-wrap leading-relaxed">{job.description}</p>
                        </div>
                      )}

                      {/* Required Skills */}
                      {job.skills && job.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {job.skills.map((skill) => (
                            <Badge key={skill} variant="secondary" className="text-[10px] py-0.5">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* Rejection reason (if any) */}
                      {isRejected && job.rejection_reason && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex gap-2 text-sm text-red-700">
                          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-bold">Rejection Reason:</p>
                            <p>{job.rejection_reason}</p>
                          </div>
                        </div>
                      )}

                      {/* Submission Files */}
                      {submissionFiles.length > 0 && (
                        <NoScreenshotWrapper>
                          <div className="space-y-2">
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                              Submitted Files
                            </p>
                            {submissionFiles.map((f) => (
                              <div
                                key={f.id}
                                className="flex items-center justify-between p-3 bg-muted/30 rounded-xl border"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="h-8 w-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                                    <FileUp className="h-4 w-4" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium truncate max-w-[200px]">
                                      {f.file_name}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground uppercase">
                                      {f.file_type?.split("/")[1] || "file"}
                                    </p>
                                    {/* Inline image preview if file is an image and downlo                                    {/* Inline image preview if file is an image and downloadUrl is available */}
                                    {(job.status === "submitted" || isCompleted) && f.downloadUrl && (f.file_type?.startsWith("image/") || ["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(f.file_name.split('.').pop()?.toLowerCase() || "")) && (
                                      <div 
                                        className="mt-2 rounded-lg overflow-hidden border border-muted max-w-[150px] shadow-sm hover:scale-105 transition-transform duration-200 cursor-pointer"
                                        onClick={() => setPreviewFile({
                                          url: f.downloadUrl || "",
                                          name: f.file_name,
                                          type: f.file_type,
                                          jobTitle: job.title,
                                          budget: job.budget
                                        })}
                                      >
                                        <img src={f.downloadUrl} alt={f.file_name} className="w-full h-auto object-cover max-h-[100px]" />
                                      </div>
                                    )}
                                    {/* Inline PDF link */}
                                    {(job.status === "submitted" || isCompleted) && f.downloadUrl && (f.file_type === "application/pdf" || f.file_name.split('.').pop()?.toLowerCase() === "pdf") && (
                                      <div className="mt-1.5">
                                        <button 
                                          onClick={() => setPreviewFile({
                                            url: f.downloadUrl || "",
                                            name: f.file_name,
                                            type: f.file_type,
                                            jobTitle: job.title,
                                            budget: job.budget
                                          })}
                                          className="text-xs text-primary underline font-medium hover:text-primary-hover flex items-center gap-1"
                                        >
                                          📄 Open PDF Preview
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
 
                                {/* Download and Preview always available for review on submitted or completed jobs */}
                                {(isCompleted || job.status === "submitted") && f.downloadUrl ? (
                                  <div className="flex gap-2">
                                    <Button 
                                      size="sm" 
                                      variant="outline" 
                                      className="text-primary border-primary/20 gap-1"
                                      onClick={() => setPreviewFile({
                                        url: f.downloadUrl || "",
                                        name: f.file_name,
                                        type: f.file_type,
                                        jobTitle: job.title,
                                        budget: job.budget
                                      })}
                                    >
                                      View Preview
                                    </Button>
                                    <a href={f.downloadUrl} download={f.file_name}>
                                      <Button size="sm" variant="ghost" className="text-primary gap-1">
                                        <Download className="h-3.5 w-3.5" />
                                        {job.status === "submitted" ? "Download to Review" : "Download"}
                                      </Button>
                                    </a>
                                  </div>
                                ) : (
                                  <Badge variant="outline" className="text-[10px] opacity-60">
                                    <Lock className="h-3 w-3 mr-1" />
                                    {isRejected ? "Rejected" : "Locked until accepted"}
                                  </Badge>
                                )}
                              </div>
                            ))}
                          </div>
                        </NoScreenshotWrapper>
                      )}

                      {/* Brief / Original files */}
                      {briefFiles.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                            Original Brief Files
                          </p>
                          {briefFiles.map((f) => (
                            <div
                              key={f.id}
                              className="flex items-center gap-3 p-2 bg-muted/20 rounded-lg border text-sm"
                            >
                              <FileUp className="h-4 w-4 text-muted-foreground" />
                              <span className="truncate">{f.file_name}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Actions for poster on submitted jobs */}
                      {isPoster && job.status === "submitted" && (
                        <div className="flex gap-3 pt-2">
                          <Button
                            variant="hero"
                            className="flex-1 gap-2"
                            disabled={actionLoading}
                            onClick={() => { setAcceptDialogJob(job); setRatingValue(5); }}
                          >
                            {actionLoading ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <CheckCircle className="h-4 w-4" />
                            )}
                            Accept & Release Payment
                          </Button>
                          <Button
                            variant="outline"
                            className="flex-1 text-destructive border-destructive/30 gap-2"
                            disabled={actionLoading}
                            onClick={() => setRejectDialogJob(job)}
                          >
                            <XCircle className="h-4 w-4" />
                            Reject Work
                          </Button>
                        </div>
                      )}

                      {/* Poster: show banner if job is active */}
                      {isPoster && (job.status === "accepted") && (
                        <div className="p-3 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg text-sm flex items-start gap-2">
                          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-bold">Job In Progress</p>
                            <p className="text-xs">Worker is currently completing this job. Deliverables will appear here once uploaded.</p>
                          </div>
                        </div>
                      )}

                      {/* Worker: upload deliverables option */}
                      {isWorker && (job.status === "accepted" || job.status === "disputed") && (
                        <div className="pt-2">
                          <Button
                            variant="hero"
                            className="w-full gap-2"
                            onClick={() => setUploadDialogJob(job)}
                          >
                            <Upload className="h-4 w-4" />
                            {job.status === "disputed" ? "Re-submit / Upload New Deliverables" : "Upload Deliverables / Submit Work"}
                          </Button>
                        </div>
                      )}

                      {/* Worker: notify about status */}
                      {isWorker && (
                        <div
                          className={`p-3 rounded-lg border text-sm ${
                            isCompleted
                              ? "bg-green-50 border-green-200 text-green-700"
                              : isRejected
                              ? "bg-red-50 border-red-200 text-red-700"
                              : (job.status === "accepted")
                              ? "bg-blue-50 border-blue-200 text-blue-700"
                              : "bg-amber-50 border-amber-200 text-amber-700"
                          }`}
                        >
                          {isCompleted &&
                            "✓ Your work was accepted! Payment has been released to your wallet."}
                          {isRejected &&
                            "✗ Your work was rejected. See the reason above and contact the poster."}
                          {job.status === "submitted" &&
                            "⏳ Awaiting poster review. You'll be notified once accepted or rejected."}
                          {(job.status === "accepted") &&
                            "ℹ️ You have taken this job. Upload your deliverables to request payment."}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Reject Dialog */}
      <Dialog open={!!rejectDialogJob} onOpenChange={() => setRejectDialogJob(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Submitted Work</DialogTitle>
            <DialogDescription>
              Explain why you are rejecting this submission. The worker will see your reason.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="e.g. The work didn't follow the brief. Specific issues: ..."
            className="min-h-[120px]"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRejectDialogJob(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={actionLoading || !rejectReason.trim()}
              onClick={handleReject}
            >
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm Rejection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload Deliverables Dialog */}
      <Dialog open={!!uploadDialogJob || isGeneralUploadOpen} onOpenChange={(open) => {
        if (!uploading) {
          setUploadDialogJob(null);
          setIsGeneralUploadOpen(false);
          setSelectedFile(null);
        }
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Upload Deliverables</DialogTitle>
            <DialogDescription>
              Submit your completed work. The poster will review and approve it to release your payment.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            {/* Job Selector Dropdown if opened generally */}
            {isGeneralUploadOpen && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                  Select Job *
                </label>
                {jobs.filter(
                  (j) => j.worker_id === user?.id && ["accepted", "disputed"].includes(j.status)
                ).length === 0 ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 text-amber-700 text-xs rounded-lg">
                    ⚠️ You do not have any active or in-progress jobs that you have taken. Go to <Link to="/jobs" className="underline font-bold">Browse Jobs</Link> to take a job first.
                  </div>
                ) : (
                  <select
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={uploadDialogJob?.id || ""}
                    onChange={(e) => {
                      const selected = jobs.find((j) => j.id === e.target.value);
                      if (selected) setUploadDialogJob(selected);
                    }}
                  >
                    <option value="" disabled={!!uploadDialogJob}>-- Select a Job --</option>
                    {jobs.filter(
                      (j) => j.worker_id === user?.id && ["accepted", "disputed"].includes(j.status)
                    ).map((j) => (
                      <option key={j.id} value={j.id}>
                        {j.title} (₹{j.budget})
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {/* Pre-selected Job Info */}
            {!isGeneralUploadOpen && uploadDialogJob && (
              <div className="p-3 bg-muted/30 rounded-lg border border-primary/10">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Submitting for</p>
                <p className="font-semibold text-foreground truncate">{uploadDialogJob.title}</p>
                <p className="text-xs text-primary font-bold">Budget: ₹{uploadDialogJob.budget}</p>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                Upload Work File *
              </label>
              {!selectedFile ? (
                <div className="relative border-2 border-dashed border-muted rounded-xl p-8 transition-colors hover:border-primary/50 group">
                  <input
                    type="file"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    disabled={isGeneralUploadOpen && !uploadDialogJob}
                  />
                  <div className="flex flex-col items-center justify-center text-center">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                      <FileUp className="h-5 w-5 text-primary" />
                    </div>
                    <p className="text-sm font-medium text-foreground">Click to upload or drag and drop</p>
                    <p className="text-xs text-muted-foreground mt-1">PDF, Word, Images, or Zip (Max 10MB)</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-primary/20">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-8 w-8 rounded bg-primary/20 flex items-center justify-center text-primary">
                      <FileUp className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate max-w-[220px]">{selectedFile.name}</p>
                      <p className="text-[10px] text-muted-foreground">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => setSelectedFile(null)}
                    disabled={uploading}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => {
              setUploadDialogJob(null);
              setIsGeneralUploadOpen(false);
              setSelectedFile(null);
            }} disabled={uploading}>
              Cancel
            </Button>
            <Button
              variant="hero"
              disabled={uploading || !selectedFile || !uploadDialogJob}
              onClick={handleUploadDeliverable}
              className="gap-2"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Submit Work
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {previewFile && (
        <FilePreviewModal
          isOpen={!!previewFile}
          onClose={() => setPreviewFile(null)}
          fileUrl={previewFile.url}
          fileName={previewFile.name}
          fileType={previewFile.type}
          jobTitle={previewFile.jobTitle}
          budget={previewFile.budget}
        />
      )}

      {/* Accept and Rate Dialog */}
      <Dialog open={!!acceptDialogJob} onOpenChange={() => setAcceptDialogJob(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Accept Work & Rate Worker
            </DialogTitle>
            <DialogDescription>
              Accept the deliverables for "{acceptDialogJob?.title}". This will release the escrow payment (₹{acceptDialogJob?.budget}) directly to the worker's wallet.
            </DialogDescription>
          </DialogHeader>

          <div className="py-6 flex flex-col items-center justify-center space-y-4">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Rate the worker's performance:</p>
            <div className="flex gap-2.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRatingValue(star)}
                  className="transition-transform hover:scale-125 focus:outline-none"
                  type="button"
                >
                  <Star
                    className={`h-9 w-9 ${
                      star <= ratingValue
                        ? "fill-amber-500 text-amber-500"
                        : "text-slate-300"
                    }`}
                  />
                </button>
              ))}
            </div>
            <span className="text-sm font-bold text-slate-700">
              {ratingValue === 5 && "⭐ 5.0 (Excellent! Perfect work)"}
              {ratingValue === 4 && "⭐ 4.0 (Very Good)"}
              {ratingValue === 3 && "⭐ 3.0 (Good / Average)"}
              {ratingValue === 2 && "⭐ 2.0 (Needs Improvement)"}
              {ratingValue === 1 && "⭐ 1.0 (Poor)"}
            </span>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setAcceptDialogJob(null)}>
              Cancel
            </Button>
            <Button
              variant="hero"
              disabled={actionLoading}
              onClick={() => acceptDialogJob && handleAccept(acceptDialogJob, ratingValue)}
            >
              {actionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Approve & Release Payment"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SubmittedWork;
