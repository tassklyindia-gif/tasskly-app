import { useState, useEffect } from "react";
import { useAdmin } from "@/hooks/useAdmin";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowDownLeft, CheckCircle2, Shield, XCircle, Loader2, User, Briefcase, IndianRupee, Percent } from "lucide-react";
import { motion } from "framer-motion";

const PLATFORM_FEE_PCT = 30;

const AdminEscrow = () => {
  const { fetchEscrowQueue, releaseEscrow, refundEscrow } = useAdmin();
  const [escrowPayments, setEscrowPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [levelFilter, setLevelFilter] = useState<string>("all");

  const loadQueue = async () => {
    setLoading(true);
    const data = await fetchEscrowQueue();
    setEscrowPayments(data);
    setLoading(false);
  };

  useEffect(() => { loadQueue(); }, []);

  const handleRelease = async (jobId: string) => {
    setActionLoading(jobId);
    await releaseEscrow(jobId);
    setActionLoading(null);
    await loadQueue();
  };

  const handleRefund = async (jobId: string) => {
    setActionLoading(jobId);
    await refundEscrow(jobId);
    setActionLoading(null);
    await loadQueue();
  };

  const filteredPayments = escrowPayments.filter((p) => {
    if (levelFilter === "all") return true;
    return String(p.worker_level) === levelFilter;
  });

  const totalEscrow = filteredPayments.reduce((sum, p) => sum + (p.total_amount || 0), 0);
  const totalPlatformFee = filteredPayments.reduce((sum, p) => sum + (p.platform_fee || 0), 0);
  const totalWorkerPayout = filteredPayments.reduce((sum, p) => sum + (p.worker_amount || 0), 0);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Escrow Payments</h1>
          <p className="text-muted-foreground text-sm">
            Platform splits dynamically based on worker levels: <span className="font-bold text-primary">Level 1</span> (70%-75% payout), <span className="font-bold text-amber-600">Level 2</span> (80% payout), <span className="font-bold text-green-600">Level 3</span> (90% payout).
          </p>
        </div>
        <Badge variant="secondary" className="flex items-center gap-1 text-sm px-3 py-1">
          <Shield className="h-3 w-3" />
          {filteredPayments.length} pending
        </Badge>
      </div>

      {/* Level Filters */}
      <div className="flex gap-1.5 p-1 bg-muted/60 rounded-xl border max-w-sm">
        <button
          onClick={() => setLevelFilter("all")}
          className={`flex-1 py-1.5 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${
            levelFilter === "all"
              ? "bg-white text-foreground shadow-sm font-black"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          All
          <Badge variant="secondary" className="px-1.5 py-0 h-4 text-[9px] font-black shrink-0">
            {escrowPayments.length}
          </Badge>
        </button>
        <button
          onClick={() => setLevelFilter("1")}
          className={`flex-1 py-1.5 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${
            levelFilter === "1"
              ? "bg-white text-blue-700 shadow-sm font-black border border-blue-100"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Lvl 1
          <Badge variant="secondary" className="bg-blue-50 text-blue-700 px-1.5 py-0 h-4 text-[9px] font-black shrink-0">
            {escrowPayments.filter(p => p.worker_level === 1).length}
          </Badge>
        </button>
        <button
          onClick={() => setLevelFilter("2")}
          className={`flex-1 py-1.5 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${
            levelFilter === "2"
              ? "bg-white text-amber-700 shadow-sm font-black border border-amber-100"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Lvl 2
          <Badge variant="secondary" className="bg-amber-50 text-amber-700 px-1.5 py-0 h-4 text-[9px] font-black shrink-0">
            {escrowPayments.filter(p => p.worker_level === 2).length}
          </Badge>
        </button>
        <button
          onClick={() => setLevelFilter("3")}
          className={`flex-1 py-1.5 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${
            levelFilter === "3"
              ? "bg-white text-green-700 shadow-sm font-black border border-green-100"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Lvl 3
          <Badge variant="secondary" className="bg-green-50 text-green-700 px-1.5 py-0 h-4 text-[9px] font-black shrink-0">
            {escrowPayments.filter(p => p.worker_level === 3).length}
          </Badge>
        </button>
      </div>

      {/* Summary Cards */}
      {!loading && filteredPayments.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <p className="text-xs text-blue-600 font-bold uppercase tracking-wide mb-1">Total in Escrow</p>
              <p className="text-2xl font-black text-blue-700">₹{totalEscrow.toLocaleString('en-IN')}</p>
            </CardContent>
          </Card>
          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="p-4">
              <p className="text-xs text-amber-600 font-bold uppercase tracking-wide mb-1">Platform Fees (Summed)</p>
              <p className="text-2xl font-black text-amber-700">₹{totalPlatformFee.toLocaleString('en-IN')}</p>
            </CardContent>
          </Card>
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-4">
              <p className="text-xs text-green-600 font-bold uppercase tracking-wide mb-1">Worker Payouts (Summed)</p>
              <p className="text-2xl font-black text-green-700">₹{totalWorkerPayout.toLocaleString('en-IN')}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Escrow List */}
      <Card className="shadow-card">
        <CardContent className="p-4 space-y-4">
          {loading ? (
            <div className="h-[160px] flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="h-[160px] flex items-center justify-center text-sm text-muted-foreground italic">
              No pending escrow payments found under this level filter.
            </div>
          ) : (
            filteredPayments.map((p, i) => {
              const total = p.total_amount || 0;
              const fee = p.platform_fee ?? Math.round(total * 0.30);
              const payout = p.worker_amount ?? (total - fee);
              const payoutPercent = p.worker_payout_percent || 70;
              const feePercent = 100 - payoutPercent;
              const isLoading = actionLoading === p.job_id;

              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="border rounded-xl p-4 bg-card space-y-4"
                >
                  {/* Job title + status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <Briefcase className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-sm text-foreground truncate">{p.job_title || 'Untitled Job'}</p>
                        <p className="text-[10px] text-muted-foreground">Deadline: {p.job_deadline || '—'}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px] shrink-0 bg-amber-50 text-amber-700 border-amber-200">
                      {p.job_status?.replace('_', ' ') || 'In Escrow'}
                    </Badge>
                  </div>

                  {/* Poster & Worker */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2 bg-muted/40 rounded-lg p-2 min-w-0">
                      <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[9px] text-muted-foreground uppercase font-bold">Poster</p>
                        <p className="text-xs font-semibold text-foreground truncate">{p.poster_name || '—'}</p>
                        <p className="text-[9px] font-mono text-muted-foreground truncate">{p.poster_upi || 'No UPI'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 bg-muted/40 rounded-lg p-2 min-w-0">
                      <User className="h-3.5 w-3.5 text-green-600 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-[9px] text-muted-foreground uppercase font-bold">Worker</p>
                          <Badge variant="outline" className={`text-[8px] font-black h-4 px-1 py-0 uppercase border-none scale-90 origin-right shrink-0
                            ${p.worker_level === 3 ? 'bg-green-50 text-green-700 border-green-200 animate-pulse' :
                              p.worker_level === 2 ? 'bg-amber-50 text-amber-700 border-amber-200' :
                              'bg-blue-50 text-blue-700 border-blue-200'}`}>
                            Lvl {p.worker_level || 1}
                          </Badge>
                        </div>
                        <p className="text-xs font-semibold text-foreground truncate">{p.worker_name || '—'}</p>
                        <p className="text-[9px] font-mono text-green-600 truncate font-semibold">{p.worker_upi || 'No UPI ID Set'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Payment Breakdown */}
                  <div className="rounded-lg border bg-muted/20 divide-y">
                    <div className="flex items-center justify-between px-4 py-2">
                      <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <IndianRupee className="h-3 w-3" /> Total Amount Paid
                      </span>
                      <span className="text-sm font-black text-foreground">₹{total.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex items-center justify-between px-4 py-2">
                      <span className="text-xs text-amber-600 flex items-center gap-1.5 font-bold">
                        <Percent className="h-3 w-3" /> Platform Fee ({feePercent}%)
                      </span>
                      <span className="text-sm font-bold text-amber-600">− ₹{fee.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex items-center justify-between px-4 py-2 bg-green-50 rounded-b-lg">
                      <span className="text-xs text-green-700 font-bold flex items-center gap-1.5">
                        <ArrowDownLeft className="h-3 w-3" /> Worker Receives ({payoutPercent}%)
                      </span>
                      <span className="text-sm font-black text-green-700">₹{payout.toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      className="flex-1 gap-1.5 bg-green-600 hover:bg-green-700 text-white"
                      disabled={isLoading}
                      onClick={() => handleRelease(p.job_id)}
                    >
                      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      Release ₹{payout.toLocaleString('en-IN')} to Worker
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 text-destructive hover:bg-destructive/10 border-destructive/30"
                      disabled={isLoading}
                      onClick={() => handleRefund(p.job_id)}
                    >
                      <XCircle className="h-4 w-4" />
                      Refund
                    </Button>
                  </div>
                </motion.div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminEscrow;
