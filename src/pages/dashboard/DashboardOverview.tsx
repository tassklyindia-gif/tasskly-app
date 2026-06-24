import { useApp } from "@/context/AppContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Briefcase, IndianRupee, TrendingUp, ArrowRight, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

const DashboardOverview = () => {
  const { myPostedJobs, payments, profile } = useApp();

  const totalEarned = payments.filter((p) => p.type === "earned" && p.status === "completed").reduce((s, p) => s + p.amount, 0);
  const totalSpent = payments.filter((p) => p.type === "spent" && p.status === "completed").reduce((s, p) => s + p.amount, 0);
  const inEscrow = payments.filter((p) => p.status === "escrow").reduce((s, p) => s + p.amount, 0);
  const openJobs = myPostedJobs.filter((j) => j.status === "open").length;

  const chartData = payments.length > 0
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
    { label: "My Balance", value: `₹${profile?.wallet_balance ?? 0}`, icon: IndianRupee, color: "text-primary" },
    { label: "Live Jobs", value: openJobs, icon: Briefcase, color: "text-accent" },
    { label: "Held in Escrow", value: `₹${inEscrow}`, icon: ShieldCheck, color: "text-primary" },
    { label: "Total Earned", value: `₹${totalEarned}`, icon: TrendingUp, color: "text-primary" },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Welcome back, {profile?.full_name?.split(' ')[0] || 'User'}! 👋</h1>
        <p className="text-muted-foreground">Here's what's happening with your gigs.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
          >
            <Card className="shadow-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <div className="font-display text-2xl font-bold text-foreground">{stat.value}</div>
                <div className="text-xs text-muted-foreground">{stat.label}</div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="shadow-card">
          <CardContent className="p-5">
            <h2 className="font-display text-lg font-semibold text-foreground mb-4">Earnings Overview</h2>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${v}`} />
                  <Tooltip formatter={(value: number) => [`₹${value}`]} />
                  <Bar dataKey="earned" fill="hsl(160 84% 39%)" radius={[4, 4, 0, 0]} name="Earned" />
                  <Bar dataKey="spent" fill="hsl(16 85% 61%)" radius={[4, 4, 0, 0]} name="Spent" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
                No earnings yet. Complete jobs to see your chart!
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-semibold text-foreground">Recent Activity</h2>
            </div>
            <div className="space-y-3">
              {payments.slice(0, 4).map((p) => (
                <div key={p.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-foreground">{p.jobTitle}</div>
                    <div className="text-xs text-muted-foreground">{p.date}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={p.status === "escrow" ? "secondary" : p.type === "earned" ? "default" : "accent"}>
                      {p.status === "escrow" ? "Escrow" : p.type === "earned" ? "Earned" : "Spent"}
                    </Badge>
                    <span className={`font-display text-sm font-bold ${p.type === "earned" ? "text-primary" : "text-accent"}`}>
                      {p.type === "earned" ? "+" : "-"}₹{p.amount}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <Link to="/post-job">
          <Button variant="hero" className="w-full gap-2">
            <Briefcase className="h-4 w-4" /> Post a Job
          </Button>
        </Link>
        <Link to="/jobs">
          <Button variant="hero-outline" className="w-full gap-2">
            Browse Jobs <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
        <Link to="/dashboard/earnings">
          <Button variant="outline" className="w-full gap-2">
            <IndianRupee className="h-4 w-4" /> View Earnings
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default DashboardOverview;
