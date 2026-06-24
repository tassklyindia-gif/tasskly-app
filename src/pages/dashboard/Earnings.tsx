import { useApp } from "@/context/AppContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { IndianRupee, TrendingUp, ArrowDownLeft, ArrowUpRight, Lock, Landmark, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { getApiUrl } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Link } from "react-router-dom";

const Earnings = () => {
  const { payments, profile, refreshProfile } = useApp();
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [withdrawalsLoading, setWithdrawalsLoading] = useState(true);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [submittingWithdraw, setSubmittingWithdraw] = useState(false);

  const fetchWithdrawals = useCallback(async () => {
    if (!profile?.id) return;
    setWithdrawalsLoading(true);
    try {
      const { data, error } = await supabase
        .from("withdrawals")
        .select("*")
        .order("created_at", { ascending: false });
      if (!error && data) {
        setWithdrawals(data);
      }
    } catch (err) {
      console.error("Error fetching withdrawals:", err);
    } finally {
      setWithdrawalsLoading(false);
    }
  }, [profile?.id]);

  useEffect(() => {
    fetchWithdrawals();
  }, [fetchWithdrawals]);

  const handleWithdrawRequest = async () => {
    const amountNum = Number(withdrawAmount);
    if (!withdrawAmount || isNaN(amountNum) || amountNum <= 0) {
      toast.error("Please enter a valid amount to withdraw");
      return;
    }
    if (amountNum > balance) {
      toast.error(`Insufficient balance. Maximum you can withdraw is ₹${balance}`);
      return;
    }

    setSubmittingWithdraw(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) {
        toast.error("Your session has expired. Please sign in again.");
        return;
      }

      const response = await fetch(getApiUrl("/api/request-withdrawal"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ amount: amountNum })
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || "Failed to submit request");
      }

      toast.success("Withdrawal request submitted successfully! ✅");
      setIsWithdrawOpen(false);
      setWithdrawAmount("");
      refreshProfile(); // to update available balance
      fetchWithdrawals(); // to reload past requests
    } catch (err: any) {
      toast.error(err.message || "An error occurred during submission");
    } finally {
      setSubmittingWithdraw(false);
    }
  };

  const totalEarned = payments.filter((p) => p.type === "earned" && p.status === "completed").reduce((s, p) => s + p.amount, 0);
  const totalSpent = payments.filter((p) => p.type === "spent" && p.status === "completed").reduce((s, p) => s + p.amount, 0);
  const inEscrow = payments.filter((p) => p.status === "escrow").reduce((s, p) => s + p.amount, 0);
  
  const balance = profile?.wallet_balance ?? 0;

  const pieData = [
    { name: "Available", value: balance, color: "hsl(160 84% 39%)" },
    { name: "In Escrow", value: inEscrow, color: "hsl(45 93% 47%)" },
  ];

  const monthlyData = payments.length > 0
    ? Object.values(
        payments.reduce((acc, p) => {
          const month = new Date(p.date).toLocaleString("en-US", { month: "short" });
          if (!acc[month]) acc[month] = { month, earned: 0, spent: 0 };
          if (p.type === "earned" && p.status === "completed") acc[month].earned += p.amount;
          if (p.type === "spent" && p.status === "completed") acc[month].spent += p.amount;
          return acc;
        }, {} as Record<string, { month: string; earned: number; spent: number }>)
      )
    : [];

  const stats = [
    { label: "Available Balance", value: `₹${balance}`, icon: IndianRupee, color: "text-primary", desc: "Ready to withdraw" },
    { label: "Total Earned", value: `₹${totalEarned}`, icon: TrendingUp, color: "text-primary", desc: "All time" },
    { label: "Total Spent", value: `₹${totalSpent}`, icon: ArrowUpRight, color: "text-accent", desc: "On posted jobs" },
    { label: "In Escrow", value: `₹${inEscrow}`, icon: Lock, color: "text-muted-foreground", desc: "Pending completion" },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Earnings & Payments</h1>
        <p className="text-muted-foreground">Track your income and spending</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div key={stat.label} className="h-full" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
            <Card className="shadow-card h-full">
              <CardContent className="p-4 flex flex-col justify-between h-full min-h-[120px]">
                <div>
                  <stat.icon className={`h-5 w-5 mb-2 ${stat.color}`} />
                  <div className="font-display text-2xl font-bold text-foreground">{stat.value}</div>
                  <div className="text-xs text-muted-foreground">{stat.desc}</div>
                </div>
                {stat.label === "Available Balance" && balance > 0 && (
                  <Button 
                    size="sm" 
                    className="mt-3 w-full bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-bold py-1 h-8 rounded-lg shadow-sm"
                    onClick={() => setIsWithdrawOpen(true)}
                  >
                    Withdraw Funds
                  </Button>
                )}
                {stat.label === "Available Balance" && balance === 0 && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="mt-3 w-full text-xs font-bold py-1 h-8 rounded-lg opacity-50 cursor-not-allowed"
                    disabled
                  >
                    Withdraw Funds
                  </Button>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Bar Chart */}
        <Card className="shadow-card">
          <CardContent className="p-5">
            <h2 className="font-display text-lg font-semibold text-foreground mb-4">Monthly Breakdown</h2>
            {monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${v}`} />
                  <Tooltip formatter={(value: number) => [`₹${value}`]} />
                  <Bar dataKey="earned" fill="hsl(160 84% 39%)" radius={[4, 4, 0, 0]} name="Earned" />
                  <Bar dataKey="spent" fill="hsl(16 85% 61%)" radius={[4, 4, 0, 0]} name="Spent" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[220px] text-muted-foreground text-sm">
                No transactions yet. Start earning to see your breakdown!
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pie Chart */}
        <Card className="shadow-card">
          <CardContent className="p-5">
            <h2 className="font-display text-lg font-semibold text-foreground mb-4">Balance Distribution</h2>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={85} dataKey="value" paddingAngle={4}>
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [`₹${value}`]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-6 mt-2">
              {pieData.map((item) => (
                <div key={item.name} className="flex items-center gap-2 text-sm">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-muted-foreground">{item.name}: ₹{item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transaction History */}
      <Card className="shadow-card">
        <CardContent className="p-5">
          <h2 className="font-display text-lg font-semibold text-foreground mb-4">Transaction History</h2>
          <div className="space-y-2">
            {payments.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-center justify-between border-b py-3 last:border-0"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${p.type === "earned" ? "bg-primary/10" : "bg-accent/10"}`}>
                    {p.type === "earned" ? (
                      <ArrowDownLeft className="h-4 w-4 text-primary" />
                    ) : (
                      <ArrowUpRight className="h-4 w-4 text-accent" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-foreground">{p.jobTitle}</div>
                    <div className="text-xs text-muted-foreground">{p.date}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant={p.status === "escrow" ? "secondary" : "outline"} className="text-xs">
                    {p.status === "escrow" ? "Escrow" : "Done"}
                  </Badge>
                  <span className={`font-display text-sm font-bold ${p.type === "earned" ? "text-primary" : "text-accent"}`}>
                    {p.type === "earned" ? "+" : "-"}₹{p.amount}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Withdrawal Requests */}
      <Card className="shadow-card">
        <CardContent className="p-5">
          <h2 className="font-display text-lg font-semibold text-foreground mb-4">Withdrawal Requests History</h2>
          {withdrawalsLoading ? (
            <div className="flex h-20 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : withdrawals.length > 0 ? (
            <div className="space-y-2">
              {withdrawals.map((w, i) => (
                <motion.div
                  key={w.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="flex flex-col sm:flex-row sm:items-center justify-between border-b py-3 last:border-0 gap-2"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100">
                      <Landmark className="h-4 w-4 text-slate-600" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-foreground">
                        Withdrawal to {w.bank_name} (Acct: ******{w.bank_account_number.slice(-4)})
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Requested: {new Date(w.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </div>
                      {w.admin_note && (
                        <div className="text-xs text-amber-600 font-medium mt-1">
                          Note: {w.admin_note}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                    <Badge 
                      variant={w.status === "approved" ? "outline" : w.status === "rejected" ? "destructive" : "secondary"} 
                      className={`text-xs capitalize font-bold ${
                        w.status === "approved" ? "border-green-300 text-green-700 bg-green-50/50" : ""
                      }`}
                    >
                      {w.status}
                    </Badge>
                    <span className="font-display text-sm font-black text-slate-800">
                      -₹{w.amount}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-sm text-muted-foreground">
              No withdrawal requests submitted yet.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Withdrawal Dialog */}
      <Dialog open={isWithdrawOpen} onOpenChange={setIsWithdrawOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Withdraw Funds</DialogTitle>
            <DialogDescription>
              Submit a request to transfer funds from your wallet balance to your bank account.
            </DialogDescription>
          </DialogHeader>

          {!(profile as any)?.bank_account_number ? (
            <div className="py-4 text-center space-y-3">
              <p className="text-sm text-amber-600 font-semibold">Bank Details Missing ⚠️</p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                You must configure your bank account details in your profile before requesting a withdrawal.
              </p>
              <Link to="/dashboard/profile" onClick={() => setIsWithdrawOpen(false)}>
                <Button variant="hero" size="sm">
                  Go to Profile Settings
                </Button>
              </Link>
            </div>
          ) : (profile as any)?.bank_verification_status !== 'verified' ? (
            <div className="py-4 text-center space-y-3">
              <p className="text-sm text-amber-600 font-semibold">Bank Details Unverified ⚠️</p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Your bank details must be verified automatically by the backend before you can request a withdrawal.
              </p>
              <Link to="/dashboard/profile" onClick={() => setIsWithdrawOpen(false)}>
                <Button variant="hero" size="sm">
                  Go to Profile Settings
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="p-3 bg-slate-50 border rounded-xl space-y-1 text-xs text-slate-600">
                <p className="font-bold text-slate-700 mb-1">Bank Payout Destination:</p>
                <p><strong>Account Holder:</strong> {(profile as any).bank_account_holder_name}</p>
                <p><strong>Bank Name:</strong> {(profile as any).bank_name}</p>
                <p><strong>Account Number:</strong> ******{(profile as any).bank_account_number.slice(-4)}</p>
                <p><strong>IFSC Code:</strong> {(profile as any).bank_ifsc_code}</p>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Amount to Withdraw (₹)</label>
                <Input 
                  type="number" 
                  value={withdrawAmount} 
                  onChange={(e) => setWithdrawAmount(e.target.value)} 
                  placeholder="e.g. 500" 
                  max={balance} 
                  min={1}
                  className="text-sm font-semibold"
                />
                <p className="text-[10px] text-muted-foreground">
                  Available balance: ₹{balance}. Requests are processed within 24-48 business hours.
                </p>
              </div>

              <DialogFooter className="gap-2 pt-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setIsWithdrawOpen(false)}
                  disabled={submittingWithdraw}
                >
                  Cancel
                </Button>
                <Button 
                  variant="hero" 
                  size="sm" 
                  onClick={handleWithdrawRequest}
                  disabled={submittingWithdraw || !withdrawAmount || Number(withdrawAmount) <= 0 || Number(withdrawAmount) > balance}
                >
                  {submittingWithdraw ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit Request"
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Earnings;
