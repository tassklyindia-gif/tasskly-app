import { motion, AnimatePresence } from "framer-motion";
import { Bell, X } from "lucide-react";
import { usePlatformNotifications } from "@/hooks/useNotificationPermission";

const NotificationBanner = () => {
  const { notifications, clearNotification } = usePlatformNotifications();

  return (
    <div className="fixed top-20 right-4 z-[100] flex flex-col gap-2 max-w-sm pointer-events-none">
      <AnimatePresence>
        {notifications.map((n) => (
          <motion.div
            key={n.id}
            initial={{ opacity: 0, x: 100, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="flex items-start gap-3 rounded-xl border border-primary/30 bg-card/95 p-4 shadow-lg backdrop-blur-sm pointer-events-auto"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <Bell className="h-5 w-5 text-primary animate-ring" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-display text-sm font-bold text-foreground">
                {n.type === 'bid' && "🔔 New Bid Alert!"}
                {n.type === 'acceptance' && "✅ Bid Accepted!"}
                {n.type === 'payment' && "💰 Payment Verified!"}
                {n.type === 'timeout' && "⏰ Project Deleted"}
                {n.type === 'work_submitted' && "📦 Work Submitted!"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {n.type === 'bid' && `${n.user} bid ₹${n.amount} on "${n.jobTitle}"`}
                {n.type === 'acceptance' && `Job "${n.jobTitle}" is ready for payment.`}
                {n.type === 'payment' && `Files unlocked for "${n.jobTitle}".`}
                {n.type === 'timeout' && `"${n.jobTitle}" removed (Timeout).`}
                {n.type === 'work_submitted' && `Freelancer submitted work for "${n.jobTitle}".`}
              </p>
            </div>
            <button
              onClick={() => clearNotification(n.id)}
              className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default NotificationBanner;
