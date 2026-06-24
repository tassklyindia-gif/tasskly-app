import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Loader2,
  Landmark,
  Check,
  X,
  Search,
  IndianRupee,
  AlertCircle,
  Calendar,
  User,
  Phone,
  Mail,
  CheckCircle2,
  XCircle,
  Wallet,
  Clock
} from "lucide-react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { getApiUrl } from "@/lib/api";

interface Profile {
  full_name: string | null;
  email: string | null;
  phone: string | null;
  wallet_balance: number;
  avatar_url: string | null;
}

interface Withdrawal {
  id: string;
  user_id: string;
  amount: number;
  status: "pending" | "approved" | "rejected";
  bank_name: string;
  bank_account_number: string;
  bank_ifsc_code: string;
  bank_account_holder_name: string;
  admin_note: string | null;
  created_at: string;
  processed_at: string | null;
  profile: Profile | null;
}

const AdminWithdrawals = () => {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Rejection Dialog states
  const [rejectionTarget, setRejectionTarget] = useState<Withdrawal | null>(null);
  const [rejectNote, setRejectNote] = useState("");

  // Approval Dialog states
  const [approvalTarget, setApprovalTarget] = useState<Withdrawal | null>(null);
  const [approveNote, setApproveNote] = useState("Approved and processed");

  const fetchWithdrawals = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("withdrawals")
        .select("*, profile:profiles(full_name, email, phone, wallet_balance, avatar_url)")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setWithdrawals((data as any) || []);
    } catch (err: any) {
      console.error("Error fetching withdrawals:", err);
      toast.error("Failed to load withdrawals: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWithdrawals();
  }, []);

  const handleProcess = async (withdrawalId: string, status: "approved" | "rejected", note: string) => {
    setProcessingId(withdrawalId);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) {
        toast.error("Your session has expired. Please sign in again.");
        return;
      }

      const response = await fetch(getApiUrl("/api/process-withdrawal"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          withdrawal_id: withdrawalId,
          status,
          admin_note: note
        })
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || `Failed to ${status} request`);
      }

      toast.success(`Withdrawal request successfully ${status}! ✅`);
      
      // Close dialogs
      setRejectionTarget(null);
      setRejectNote("");
      setApprovalTarget(null);
      setApproveNote("Approved and processed");

      // Reload list
      await fetchWithdrawals();
    } catch (err: any) {
      console.error("Error processing withdrawal:", err);
      toast.error(err.message || "An error occurred");
    } finally {
      setProcessingId(null);
    }
  };

  // Stats calculation
  const pendingRequests = withdrawals.filter(w => w.status === "pending");
  const approvedRequests = withdrawals.filter(w => w.status === "approved");
  const rejectedRequests = withdrawals.filter(w => w.status === "rejected");

  const pendingAmount = pendingRequests.reduce((sum, w) => sum + Number(w.amount), 0);
  const approvedAmount = approvedRequests.reduce((sum, w) => sum + Number(w.amount), 0);
  const rejectedAmount = rejectedRequests.reduce((sum, w) => sum + Number(w.amount), 0);

  // Filter and Search logic
  const filteredWithdrawals = withdrawals.filter(w => {
    // 1. Status Filter
    if (statusFilter !== "all" && w.status !== statusFilter) return false;

    // 2. Search query
    if (!search) return true;
    const s = search.toLowerCase();
    const name = w.profile?.full_name?.toLowerCase() || "";
    const email = w.profile?.email?.toLowerCase() || "";
    const phone = w.profile?.phone?.toLowerCase() || "";
    const holder = w.bank_account_holder_name.toLowerCase();
    const bank = w.bank_name.toLowerCase();
    const accNum = w.bank_account_number;
    const ifsc = w.bank_ifsc_code.toLowerCase();

    return name.includes(s) || email.includes(s) || phone.includes(s) || holder.includes(s) || bank.includes(s) || accNum.includes(s) || ifsc.includes(s);
  });

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Withdrawal Requests</h1>
          <p className="text-muted-foreground text-sm">
            Process worker balance withdrawals to configured bank accounts.
          </p>
        </div>
        <Button onClick={fetchWithdrawals} variant="outline" size="sm" className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Pending Card */}
        <Card className="shadow-card border-none bg-orange-50/40">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-bold text-orange-600 uppercase tracking-wider">Pending Payouts</span>
              <h2 className="text-2xl font-black text-orange-700">₹{pendingAmount.toLocaleString("en-IN")}</h2>
              <p className="text-[10px] text-orange-500">{pendingRequests.length} requests pending review</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
              <Clock className="h-5 w-5 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        {/* Approved Card */}
        <Card className="shadow-card border-none bg-green-50/40">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-bold text-green-600 uppercase tracking-wider">Total Approved</span>
              <h2 className="text-2xl font-black text-green-700">₹{approvedAmount.toLocaleString("en-IN")}</h2>
              <p className="text-[10px] text-green-500">{approvedRequests.length} requests processed</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
          </CardContent>
        </Card>

        {/* Rejected Card */}
        <Card className="shadow-card border-none bg-red-50/40">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-bold text-red-600 uppercase tracking-wider">Total Rejected</span>
              <h2 className="text-2xl font-black text-red-700">₹{rejectedAmount.toLocaleString("en-IN")}</h2>
              <p className="text-[10px] text-red-500">{rejectedRequests.length} rejected requests</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
              <XCircle className="h-5 w-5 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by worker name, bank account, IFSC..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Tabs Filter */}
        <div className="flex bg-muted/60 p-1 rounded-lg border gap-1 self-start">
          {(["pending", "approved", "rejected", "all"] as const).map((filter) => (
            <Button
              key={filter}
              variant={statusFilter === filter ? "default" : "ghost"}
              size="sm"
              onClick={() => setStatusFilter(filter)}
              className="text-xs px-3.5 py-1.5 capitalize font-semibold h-8"
            >
              {filter}
            </Button>
          ))}
        </div>
      </div>

      {/* Main Request Container */}
      <Card className="shadow-card border-none overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="h-[300px] flex flex-col items-center justify-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="text-xs text-muted-foreground font-semibold">Loading withdrawal requests...</span>
            </div>
          ) : filteredWithdrawals.length === 0 ? (
            <div className="h-[250px] flex flex-col items-center justify-center text-muted-foreground gap-3">
              <Landmark className="h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm italic">
                No {statusFilter !== "all" ? statusFilter : ""} withdrawal requests found.
              </p>
            </div>
          ) : (
            <div className="divide-y">
              <AnimatePresence>
                {filteredWithdrawals.map((w, index) => (
                  <motion.div
                    key={w.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25, delay: index * 0.03 }}
                    className="p-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between hover:bg-muted/10 transition-colors"
                  >
                    {/* Left Section: Worker info, Bank details */}
                    <div className="space-y-3 flex-1">
                      {/* Worker profile details */}
                      <div className="flex items-center gap-3">
                        {w.profile?.avatar_url ? (
                          <img
                            src={w.profile.avatar_url}
                            alt={w.profile.full_name || ""}
                            className="h-10 w-10 rounded-full object-cover border"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center border shrink-0 text-slate-500 font-bold uppercase text-sm">
                            {(w.profile?.full_name || "A")[0]}
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-sm text-foreground">
                              {w.profile?.full_name || "Anonymous Worker"}
                            </h3>
                            <Badge
                              variant={
                                w.status === "pending"
                                  ? "outline"
                                  : w.status === "approved"
                                  ? "secondary"
                                  : "destructive"
                              }
                              className={`text-[9px] uppercase tracking-widest font-black py-0.5 px-1.5 ${
                                w.status === "pending"
                                  ? "text-orange-600 bg-orange-50 border-orange-200"
                                  : w.status === "approved"
                                  ? "text-green-700 bg-green-50 border-green-200"
                                  : "text-red-700 bg-red-50 border-red-200"
                              }`}
                            >
                              {w.status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3.5 text-xs text-muted-foreground mt-0.5 flex-wrap">
                            <span className="flex items-center gap-1">
                              <Mail className="h-3.5 w-3.5 shrink-0" />
                              {w.profile?.email || "—"}
                            </span>
                            {w.profile?.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3.5 w-3.5 shrink-0" />
                                {w.profile.phone}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Wallet className="h-3.5 w-3.5 shrink-0" />
                              Balance: ₹{(w.profile?.wallet_balance || 0).toLocaleString("en-IN")}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Bank account details card */}
                      <div className="bg-slate-50 border rounded-lg p-3 max-w-xl text-xs space-y-1.5">
                        <div className="font-bold text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b">
                          <Landmark className="h-3.5 w-3.5" /> Bank Payout Details
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 pt-1 text-slate-700">
                          <div>
                            <span className="text-muted-foreground block text-[10px]">Account Holder Name</span>
                            <span className="font-semibold text-slate-900">{w.bank_account_holder_name}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block text-[10px]">Bank Name</span>
                            <span className="font-semibold text-slate-900">{w.bank_name}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block text-[10px]">Account Number</span>
                            <span className="font-semibold text-slate-900 font-mono tracking-wider">{w.bank_account_number}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block text-[10px]">IFSC Code</span>
                            <span className="font-semibold text-slate-900 font-mono">{w.bank_ifsc_code}</span>
                          </div>
                        </div>
                      </div>

                      {/* Request metadata (Dates, notes) */}
                      <div className="flex flex-col gap-1 text-[11px] text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 shrink-0" />
                          Requested: {format(new Date(w.created_at), "dd MMM yyyy, hh:mm a")}
                        </div>
                        {w.processed_at && (
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 shrink-0" />
                            Processed: {format(new Date(w.processed_at), "dd MMM yyyy, hh:mm a")}
                          </div>
                        )}
                        {w.admin_note && (
                          <div className={`mt-1 p-2 rounded-md max-w-xl border leading-relaxed ${
                            w.status === "approved" 
                              ? "bg-green-50/50 border-green-100 text-green-800" 
                              : "bg-red-50/50 border-red-100 text-red-800"
                          }`}>
                            <span className="font-bold uppercase text-[9px] block">Admin Note:</span>
                            {w.admin_note}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right Section: Request Amount & Actions */}
                    <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-start gap-4 shrink-0 border-t md:border-none pt-3.5 md:pt-0">
                      <div className="text-left md:text-right">
                        <span className="text-[10px] text-muted-foreground font-black uppercase tracking-wider block">Requested Amount</span>
                        <div className="text-xl font-black text-slate-900 flex items-center">
                          <IndianRupee className="h-5 w-5 shrink-0" />
                          {w.amount.toLocaleString("en-IN")}
                        </div>
                      </div>

                      {/* Actions */}
                      {w.status === "pending" && (
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => setRejectionTarget(w)}
                            disabled={processingId !== null}
                            className="bg-red-600 hover:bg-red-700 text-white font-bold h-9 gap-1"
                          >
                            <X className="h-4 w-4" /> Reject
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => setApprovalTarget(w)}
                            disabled={processingId !== null}
                            className="bg-green-600 hover:bg-green-700 text-white font-bold h-9 gap-1"
                          >
                            <Check className="h-4 w-4" /> Approve
                          </Button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approval Dialog */}
      <Dialog open={approvalTarget !== null} onOpenChange={(open) => { if (!open) setApprovalTarget(null); }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-700">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Approve Withdrawal
            </DialogTitle>
            <DialogDescription>
              Confirm that you have transferred ₹{approvalTarget?.amount.toLocaleString("en-IN")} to the bank account of {approvalTarget?.bank_account_holder_name}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="approve-note" className="text-xs font-bold text-slate-700">Admin Note / Reference ID</Label>
              <Input
                id="approve-note"
                placeholder="e.g. Bank IMPS Ref No: 61920381923"
                value={approveNote}
                onChange={(e) => setApproveNote(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setApprovalTarget(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (approvalTarget) {
                  handleProcess(approvalTarget.id, "approved", approveNote);
                }
              }}
              disabled={processingId !== null}
              className="bg-green-600 hover:bg-green-700 text-white font-bold"
            >
              {processingId !== null && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm Payout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog open={rejectionTarget !== null} onOpenChange={(open) => { if (!open) { setRejectionTarget(null); setRejectNote(""); } }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <AlertCircle className="h-5 w-5 text-red-600" />
              Reject Withdrawal Request
            </DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting the withdrawal request. The money will be immediately refunded back to the worker's wallet balance.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="reject-reason" className="text-xs font-bold text-slate-700">Rejection Reason</Label>
              <Input
                id="reject-reason"
                placeholder="e.g. Invalid IFSC Code or Bank Account Number"
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => { setRejectionTarget(null); setRejectNote(""); }}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (!rejectNote.trim()) {
                  toast.error("Please provide a reason for rejection");
                  return;
                }
                if (rejectionTarget) {
                  handleProcess(rejectionTarget.id, "rejected", rejectNote);
                }
              }}
              disabled={processingId !== null}
              className="bg-red-600 hover:bg-red-700 font-bold"
            >
              {processingId !== null && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm Reject & Refund
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminWithdrawals;
