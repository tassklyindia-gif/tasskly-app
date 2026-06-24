import { useApp } from "@/context/AppContext";
import { supabase } from "@/lib/supabase";
import { useJobs } from "@/hooks/useJobs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, CheckCircle, Clock, Loader2, PlusCircle, FileUp, Upload, X } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useChat } from "@/hooks/useChat";
import { useEffect } from "react";
import UnreadBadge from "@/components/UnreadBadge";

const statusConfig = {
  open: { label: "Open", variant: "default" as const, icon: Clock },
  payment_pending: { label: "Escrow Pending", variant: "warning" as const, icon: Clock },
  in_progress: { label: "In Progress", variant: "hero" as const, icon: Loader2 },
  completed: { label: "Completed", variant: "outline" as const, icon: CheckCircle },
  submitted: { label: "Submitted", variant: "secondary" as const, icon: Clock },
};

const MyJobs = () => {
  const { myPostedJobs, myWorkingJobs, deleteJob, profile, updateMyJobs } = useApp();

  useEffect(() => {
    updateMyJobs();
  }, [updateMyJobs]);
  const { submitWork } = useJobs();
  const { subscribeToAllMessages } = useChat();
  const [filter, setFilter] = useState<"all" | "open" | "payment_pending" | "in_progress" | "completed" | "submitted">("all");
  const [unreadCounts, setUnreadCounts] = useState<{ [key: string]: number }>({});
  const [uploadDialogJob, setUploadDialogJob] = useState<any | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleUploadDeliverable = async () => {
    if (!uploadDialogJob || !selectedFile || !profile?.id) return;
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
        profile.id,
        filePath,
        file.name,
        file.type
      );
      
      if (success) {
        setUploadDialogJob(null);
        setSelectedFile(null);
        toast.success("Deliverables submitted successfully!");
        window.location.reload();
      }
    } catch (err: any) {
      console.error("Upload error:", err);
      toast.error(err.message || "Failed to upload files");
    } finally {
      setUploading(false);
    }
  };

  const allMyJobs = [...myPostedJobs, ...myWorkingJobs];

  const fetchUnreadCounts = async () => {
    if (!profile?.id || allMyJobs.length === 0) return;
    
    const counts: { [key: string]: number } = {};
    for (const job of allMyJobs) {
      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('job_id', job.id)
        .neq('sender_id', profile.id)
        .eq('is_read', false);
      
      counts[job.id] = count || 0;
    }
    setUnreadCounts(counts);
  };

  useEffect(() => {
    fetchUnreadCounts();
    const unsubscribe = subscribeToAllMessages(() => {
        fetchUnreadCounts();
    });
    return () => unsubscribe();
  }, [profile?.id, allMyJobs.length, subscribeToAllMessages]);

  const filtered = filter === "all" ? allMyJobs : allMyJobs.filter((j) => j.status === filter);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">My Jobs</h1>
          <p className="text-muted-foreground">{allMyJobs.length} total jobs (Hiring & Working)</p>
        </div>
        <Link to="/post-job">
          <Button variant="hero" size="sm" className="gap-2">
            <PlusCircle className="h-4 w-4" /> Post Job
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {(["all", "open", "payment_pending", "in_progress", "submitted", "completed"] as const).map((f) => (
          <Badge
            key={f}
            variant={filter === f ? "default" : "category"}
            className="cursor-pointer capitalize"
            onClick={() => setFilter(f)}
          >
            {f === "all" ? "All" : f.replace("_", " ")}
          </Badge>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground">
          <p>No jobs found.</p>
          <Link to="/post-job">
            <Button variant="hero" className="mt-4">Post Your First Job</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((job, i) => {
            const sc = statusConfig[job.status as keyof typeof statusConfig] || statusConfig.open;
            const isClient = job.poster_id === profile?.id;
            
            return (
              <motion.div
                key={job.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="shadow-card overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={isClient ? "default" : "hero"} className="shrink-0 bg-opacity-20">
                            {isClient ? "Hiring" : "Working"}
                          </Badge>
                          <Badge variant={sc.variant as any} className="shrink-0">
                            <sc.icon className="mr-1 h-3 w-3" />
                            {sc.label}
                          </Badge>
                          <Badge variant="category" className="shrink-0">{job.category}</Badge>
                        </div>
                        <Link to={`/jobs/${job.id}`}>
                          <h3 className="font-display font-semibold text-foreground hover:text-primary transition-colors truncate">
                            {job.title}
                          </h3>
                        </Link>
                        <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                          <span className="font-display font-bold text-primary text-sm">₹{job.budget}</span>
                          <span>Due {job.deadline && !isNaN(Date.parse(job.deadline)) ? new Date(job.deadline).toLocaleDateString() : "No deadline"}</span>
                          {unreadCounts[job.id] > 0 && (
                            <div className="flex items-center gap-1.5 bg-red-50 px-2 py-0.5 rounded border border-red-100 animate-pulse">
                                <span className="h-2 w-2 rounded-full bg-red-500" />
                                <span className="text-[10px] font-bold text-red-600 uppercase">New Message</span>
                                <UnreadBadge count={unreadCounts[job.id]} className="scale-75 origin-left" />
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {!isClient && (job.status === "accepted" || job.status === "disputed") && (
                          <Button variant="hero" size="sm" className="gap-1.5" onClick={() => setUploadDialogJob(job)}>
                            <Upload className="h-3.5 w-3.5" />
                            Submit Work
                          </Button>
                        )}
                        <Link to={`/jobs/${job.id}`}>
                          <Button variant="outline" size="sm">
                            View Details
                          </Button>
                        </Link>
                        {isClient && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete this job?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone. This will permanently delete "{job.title}".
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteJob(job.id)}>
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Upload Deliverables Dialog */}
      <Dialog open={!!uploadDialogJob} onOpenChange={() => { if (!uploading) { setUploadDialogJob(null); setSelectedFile(null); } }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Upload Deliverables</DialogTitle>
            <DialogDescription>
              Submit your completed work for "{uploadDialogJob?.title}". The poster will review and approve it to release your payment.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="flex flex-col gap-2">
              {!selectedFile ? (
                <div className="relative border-2 border-dashed border-muted rounded-xl p-8 transition-colors hover:border-primary/50 group">
                  <input
                    type="file"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
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
            <Button variant="outline" onClick={() => { setUploadDialogJob(null); setSelectedFile(null); }} disabled={uploading}>
              Cancel
            </Button>
            <Button
              variant="hero"
              disabled={uploading || !selectedFile}
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
    </div>
  );
};

export default MyJobs;
