import { mockNotifications } from "@/hooks/useAdmin";
import { Card, CardContent } from "@/components/ui/card";
import { Bell, Clock, User, IndianRupee, Package, AlertTriangle, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const AdminNotifications = () => {
  const notifications = mockNotifications;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Platform Notifications</h1>
        <p className="text-muted-foreground text-sm">
          A real-time log of all critical activities across the platform.
        </p>
      </div>

      <div className="space-y-4">
        {notifications.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center p-12 text-center">
              <Bell className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <h3 className="font-semibold text-lg">No notifications yet</h3>
              <p className="text-sm text-muted-foreground">Activities like bids and payments will appear here.</p>
            </CardContent>
          </Card>
        ) : (
          notifications.map((n) => (
            <Card key={n.id} className="shadow-card border-none bg-card/50">
              <CardContent className="p-4 flex items-center gap-4">
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${
                  n.type === 'bid' ? 'bg-blue-100 text-blue-600' :
                  n.type === 'acceptance' ? 'bg-green-100 text-green-600' :
                  n.type === 'payment' ? 'bg-amber-100 text-amber-600' :
                  n.type === 'timeout' ? 'bg-rose-100 text-rose-600' :
                  'bg-purple-100 text-purple-600'
                }`}>
                  {n.type === 'bid' && <User className="h-6 w-6" />}
                  {n.type === 'acceptance' && <CheckCircle className="h-6 w-6" />}
                  {n.type === 'payment' && <IndianRupee className="h-6 w-6" />}
                  {n.type === 'timeout' && <AlertTriangle className="h-6 w-6" />}
                  {n.type === 'work_submitted' && <Package className="h-6 w-6" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <Badge variant={
                      n.type === 'bid' ? 'default' :
                      n.type === 'acceptance' ? 'outline' :
                      n.type === 'payment' ? 'secondary' :
                      n.type === 'timeout' ? 'destructive' :
                      'secondary'
                    }>
                      {n.type.replace('_', ' ').toUpperCase()}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(n.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <h4 className="font-semibold text-sm text-foreground truncate">{n.jobTitle}</h4>
                  <p className="text-xs text-muted-foreground">
                    {n.type === 'bid' && `${n.user} placed a bid of ₹${n.amount}`}
                    {n.type === 'acceptance' && `Employer accepted a bid. Payment in escrow.`}
                    {n.type === 'payment' && `Payment of ₹${n.amount} verified for escrow.`}
                    {n.type === 'timeout' && `Project deleted due to payment failure.`}
                    {n.type === 'work_submitted' && `${n.user} submitted work files.`}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminNotifications;
