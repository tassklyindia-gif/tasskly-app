import { useState, useEffect } from "react";
import { useAdmin } from "@/hooks/useAdmin";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { IndianRupee, Lock, Users, CheckCircle } from "lucide-react";

interface AdminStats {
  platform_balance: number;
  total_escrow: number;
  total_jobs: number;
  active_jobs: number;
  completed_jobs: number;
  total_users: number;
}

const AdminOverview = () => {
  const { fetchAdminStats } = useAdmin();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStats = async () => {
    const data = await fetchAdminStats();
    if (data) setStats(data);
    setLoading(false);
  };

  useEffect(() => {
    loadStats();
  }, []);

  const fmt = (n: number) => `₹${(n || 0).toLocaleString('en-IN')}`;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Admin Overview</h1>
        <p className="text-muted-foreground text-sm">
          Manage platform funds and track escrow-based payouts.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="shadow-card">
          <CardContent className="p-4 space-y-1">
            <IndianRupee className="h-5 w-5 text-primary mb-1" />
            <div className="font-display text-2xl font-bold text-foreground">{loading ? '...' : fmt(stats?.platform_balance ?? 0)}</div>
            <div className="text-xs text-muted-foreground">Platform / Admin Balance</div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="p-4 space-y-1">
            <Lock className="h-5 w-5 text-muted-foreground mb-1" />
            <div className="font-display text-2xl font-bold text-foreground">{loading ? '...' : fmt(stats?.total_escrow ?? 0)}</div>
            <div className="text-xs text-muted-foreground">Held in Escrow (to freelancers)</div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="p-4 space-y-1">
            <CheckCircle className="h-5 w-5 text-primary mb-1" />
            <div className="font-display text-2xl font-bold text-foreground">{loading ? '...' : stats?.completed_jobs ?? 0}</div>
            <div className="text-xs text-muted-foreground">Completed Jobs</div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="p-4 space-y-1">
            <Users className="h-5 w-5 text-accent mb-1" />
            <div className="font-display text-2xl font-bold text-foreground">{loading ? '...' : stats?.total_users ?? 0}</div>
            <div className="text-xs text-muted-foreground">Total Users</div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-card">
        <CardContent className="p-5 space-y-3">
          <h2 className="font-display text-lg font-semibold text-foreground">How the payment flow works</h2>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li>
              <Badge variant="outline" className="mr-2">1</Badge>
              When a job owner accepts a bid, they pay the full amount to the platform/admin.
            </li>
            <li>
              <Badge variant="outline" className="mr-2">2</Badge>
              10% is kept as platform fee, and 90% is stored as an escrow payment for the freelancer.
            </li>
            <li>
              <Badge variant="outline" className="mr-2">3</Badge>
              After the work is confirmed, you (the admin) release escrow in the Escrow Payments screen.
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminOverview;
