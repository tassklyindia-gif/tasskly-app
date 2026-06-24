import { useState, useEffect } from "react";
import { useAdmin } from "@/hooks/useAdmin";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, FileText, Calendar, User, ArrowRight, ArrowDownLeft } from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";

const AdminLedger = () => {
  const { fetchLedger } = useAdmin();
  const [ledger, setLedger] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const loadLedger = async (query?: string) => {
    setLoading(true);
    const data = await fetchLedger(query);
    setLedger(data);
    setLoading(false);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadLedger(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'fee_collected': return "Platform Fee";
      case 'escrow_held': return "Escrow Held";
      case 'escrow_released': return "Payout Released";
      case 'refund': return "Refund Issued";
      default: return type.replace('_', ' ');
    }
  };

  const getAmountColor = (type: string) => {
    switch (type) {
      case 'fee_collected': return "text-green-600 bg-green-50";
      case 'escrow_held': return "text-amber-600 bg-amber-50";
      case 'escrow_released': return "text-blue-600 bg-blue-50";
      case 'refund': return "text-red-600 bg-red-50";
      default: return "text-muted-foreground bg-muted";
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Financial Ledger</h1>
        <p className="text-muted-foreground text-sm">
          Detailed audit trail of all platform transactions and escrow movements.
        </p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by task, sender or recipient..."
          className="pl-10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Card className="shadow-card border-none overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-sm text-left border-collapse">
              <thead className="bg-muted/50 text-muted-foreground font-medium text-[10px] uppercase tracking-wider border-b">
                <tr>
                  <th className="px-6 py-4">Transaction Date</th>
                  <th className="px-6 py-4">Type & Description</th>
                  <th className="px-6 py-4">Funds Origin & Destination</th>
                  <th className="px-6 py-4 text-right">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center">
                      <div className="h-6 w-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin mx-auto" />
                    </td>
                  </tr>
                ) : ledger.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground italic">
                      No ledger entries found matching your search.
                    </td>
                  </tr>
                ) : (
                  ledger.map((entry, i) => (
                    <motion.tr 
                      key={entry.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className="hover:bg-muted/10 transition-colors"
                    >
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2 text-foreground font-medium">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          {format(new Date(entry.created_at), 'dd MMM yyyy')}
                        </div>
                        <div className="text-[10px] text-muted-foreground ml-5">
                          {format(new Date(entry.created_at), 'HH:mm:ss')}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${getAmountColor(entry.type)}`}>
                            {getTypeLabel(entry.type)}
                          </span>
                        </div>
                        <div className="text-xs text-foreground font-semibold flex items-center gap-1.5">
                          <FileText className="h-3 w-3 text-primary" />
                          {entry.job_title || "Manual Adjustment"}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <ArrowRight className="h-3 w-3 text-blue-500" />
                            <span className="text-xs text-muted-foreground font-medium uppercase text-[9px]">From:</span>
                            <span className="text-xs font-bold text-foreground">{entry.from_name || "Platform"}</span>
                          </div>
                          {entry.to_name && (
                            <div className="flex items-center gap-1.5">
                              <ArrowDownLeft className="h-3 w-3 text-green-500" />
                              <span className="text-xs text-muted-foreground font-medium uppercase text-[9px]">To:</span>
                              <span className="text-xs font-bold text-foreground">{entry.to_name}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-5 text-right font-display font-black text-base text-foreground tabular-nums">
                        ₹{entry.amount.toLocaleString('en-IN')}
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminLedger;
