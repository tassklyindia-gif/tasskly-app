import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowRight, User, AlertCircle, IndianRupee, RefreshCw, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAdmin } from "@/hooks/useAdmin";

const AdminRefunds = () => {
  const [rejectedJobs, setRejectedJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const { processSplitRefund } = useAdmin();

  const fetchRejectedJobs = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("jobs")
        .select("*, poster:profiles!jobs_poster_id_fkey(full_name), worker:profiles!jobs_worker_id_fkey(full_name)")
        .eq("status", "disputed")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRejectedJobs(data || []);
    } catch (err) {
      console.error("Error fetching rejected jobs:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteRefund = async (jobId: string) => {
    setProcessingId(jobId);
    const success = await processSplitRefund(jobId);
    if (success) {
      await fetchRejectedJobs();
    }
    setProcessingId(null);
  };

  useEffect(() => {
    fetchRejectedJobs();
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Disputes & Refunds Log</h1>
          <p className="text-muted-foreground text-sm">
            Monitor rejected jobs and track auto-split refunds: <span className="font-bold text-primary">70%</span> to Poster, <span className="font-bold text-green-600">25%</span> to Worker compensation.
          </p>
        </div>
        <Badge variant="secondary" className="flex items-center gap-1 text-sm px-3 py-1">
          <AlertCircle className="h-3.5 w-3.5 text-red-500" />
          {rejectedJobs.length} disputed
        </Badge>
      </div>

      <Card className="shadow-card">
        <CardContent className="p-4 space-y-4">
          {loading ? (
            <div className="h-[200px] flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : rejectedJobs.length === 0 ? (
            <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground italic">
              No rejected/disputed jobs found in logs.
            </div>
          ) : (
            <div className="space-y-4">
              <AnimatePresence>
                {rejectedJobs.map((job, i) => {
                  const posterRefund = Math.floor(job.budget * 0.70);
                  const workerComp = Math.floor(job.budget * 0.25);
                  const fee = job.budget - posterRefund - workerComp;

                  return (
                    <motion.div
                      key={job.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="border rounded-xl p-4 bg-card space-y-4"
                    >
                      {/* Job Title & Category */}
                      <div className="flex justify-between items-start gap-2 flex-wrap">
                        <div>
                          <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                            {job.category || "General"}
                          </span>
                          <h3 className="font-bold text-base text-foreground mt-1">{job.title}</h3>
                          <p className="text-[10px] text-muted-foreground mt-0.5">Job ID: {job.id}</p>
                        </div>
                        <Badge variant="destructive" className="uppercase text-[9px] font-black tracking-widest px-2 py-0.5">
                          Rejected / Disputed
                        </Badge>
                      </div>

                      {/* Dispute / Rejection Reason */}
                      {job.rejection_reason && (
                        <div className="p-3 bg-red-50 border border-red-100 rounded-lg flex items-start gap-2.5 text-xs text-red-700 leading-relaxed">
                          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold block">Rejection Reason:</span>
                            <span>{job.rejection_reason}</span>
                          </div>
                        </div>
                      )}

                      {/* Original Budget summary */}
                      <div className="flex items-center gap-2 bg-slate-50 border rounded-lg px-4 py-2.5 text-sm text-slate-700">
                        <IndianRupee className="h-4 w-4 text-slate-500 shrink-0" />
                        <span>Original Escrow Budget:</span>
                        <span className="font-black text-slate-900 ml-1">₹{job.budget?.toLocaleString('en-IN')}</span>
                      </div>

                      {/* Poster 70% Refund and Worker 25% Compensation breakdown */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Poster Column */}
                        <div className="border border-blue-100 rounded-xl p-3.5 bg-blue-50/20 space-y-3 flex flex-col justify-between">
                          <div className="flex items-start gap-2">
                            <User className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                            <div>
                              <p className="text-[9px] text-blue-600 uppercase font-black tracking-wide">Job Poster (70% Refund)</p>
                              <p className="text-sm font-bold text-slate-800">{job.poster?.full_name || "Anonymous Poster"}</p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between border-t border-blue-100 pt-2 text-xs">
                            <span className="text-blue-700 font-semibold">Refund Amount</span>
                            <span className="text-base font-black text-blue-700">₹{posterRefund.toLocaleString('en-IN')}</span>
                          </div>
                        </div>

                        {/* Worker Column */}
                        <div className="border border-green-100 rounded-xl p-3.5 bg-green-50/20 space-y-3 flex flex-col justify-between">
                          <div className="flex items-start gap-2">
                            <User className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                            <div>
                              <p className="text-[9px] text-green-600 uppercase font-black tracking-wide">Worker Done (25% Compensation)</p>
                              <p className="text-sm font-bold text-slate-800">{job.worker?.full_name || "Anonymous Worker"}</p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between border-t border-green-100 pt-2 text-xs">
                            <span className="text-green-700 font-semibold">Compensation Payout</span>
                            <span className="text-base font-black text-green-700">₹{workerComp.toLocaleString('en-IN')}</span>
                          </div>
                        </div>
                      </div>

                      {/* Execute Refund Button */}
                      <div className="pt-2">
                        <Button
                          onClick={() => handleExecuteRefund(job.id)}
                          disabled={processingId !== null}
                          className="w-full bg-red-600 hover:bg-red-700 text-white gap-2 h-10 font-bold shadow-md shadow-red-500/10"
                        >
                          {processingId === job.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4" />
                          )}
                          Process Auto-Split Refund (₹{posterRefund.toLocaleString('en-IN')} to Poster / ₹{workerComp.toLocaleString('en-IN')} to Worker)
                        </Button>
                      </div>

                      {/* 5% Platform Fee & Date summary */}
                      <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-wider px-2 border-t pt-3">
                        <span>Fee collected: ₹{fee.toLocaleString('en-IN')} (5%)</span>
                        <span>Date: {job.created_at ? new Date(job.created_at).toLocaleDateString() : "—"}</span>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminRefunds;
