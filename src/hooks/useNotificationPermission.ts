import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";

export type PlatformNotification = {
  id: string;
  type: 'bid' | 'acceptance' | 'payment' | 'timeout' | 'work_submitted';
  jobTitle: string;
  user?: string;
  amount?: number;
  timestamp: number;
};

let notificationListeners: ((n: PlatformNotification) => void)[] = [];

export function useNotificationPermission() {
  useEffect(() => {
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);
}

export function usePlatformNotifications() {
  const [notifications, setNotifications] = useState<PlatformNotification[]>([]);

  useEffect(() => {
    const listener = (n: PlatformNotification) => {
      setNotifications((prev) => [n, ...prev]);
    };
    notificationListeners.push(listener);
    return () => {
      notificationListeners = notificationListeners.filter((l) => l !== listener);
    };
  }, []);

  const clearNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  return { notifications, clearNotification };
}

export function sendBidNotification(jobTitle: string, bidAmount: number, bidderName: string) {
  const notification: PlatformNotification = {
    id: `bid-notif-${Date.now()}`,
    type: 'bid',
    jobTitle,
    amount: bidAmount,
    user: bidderName,
    timestamp: Date.now(),
  };

  // Notify all in-app listeners
  notificationListeners.forEach((l) => l(notification));

  // Show sonner toast with alarm styling
  toast.success(`🔔 New Bid Alert!`, {
    description: `${bidderName} bid ₹${bidAmount} on "${jobTitle}"`,
    duration: 8000,
  });

  // Play alarm sound
  try {
    const audioCtx = new AudioContext();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    oscillator.frequency.value = 880;
    oscillator.type = "sine";
    gainNode.gain.value = 0.3;
    oscillator.start();

    setTimeout(() => { gainNode.gain.value = 0; }, 200);
    setTimeout(() => { gainNode.gain.value = 0.3; }, 400);
    setTimeout(() => { gainNode.gain.value = 0; }, 600);
    setTimeout(() => { gainNode.gain.value = 0.3; }, 800);
    setTimeout(() => {
      oscillator.stop();
      audioCtx.close();
    }, 1000);
  } catch (e) {
    // Audio not supported in this context
  }

  // Also try browser notification (works when deployed, not in iframe preview)
  if (typeof Notification !== "undefined" && Notification.permission === "granted") {
    try {
      new Notification("🔔 New Bid on Your Job!", {
        body: `${bidderName} bid ₹${bidAmount} on "${jobTitle}"`,
        icon: "/taskly-logo.png",
        tag: notification.id,
        requireInteraction: true,
      });
    } catch (e) {
      // Browser notification not available
    }
  }
}

// Alarm specifically when a job has been accepted and payment is required soon.
export function sendJobAcceptedAlarm(jobTitle: string, amount: number) {
  const notification: PlatformNotification = {
    id: `acc-notif-${Date.now()}`,
    type: 'acceptance',
    jobTitle,
    amount,
    timestamp: Date.now(),
  };
  notificationListeners.forEach((l) => l(notification));

  toast.success("✅ Your job has been accepted!", {
    description: `Please pay ₹${amount} within 20 minutes for "${jobTitle}".`,
    duration: 10000,
  });

  // Reuse the same beep pattern to grab attention.
  try {
    const audioCtx = new AudioContext();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    oscillator.frequency.value = 660;
    oscillator.type = "square";
    gainNode.gain.value = 0.25;
    oscillator.start();

    setTimeout(() => { gainNode.gain.value = 0; }, 300);
    setTimeout(() => { gainNode.gain.value = 0.25; }, 600);
    setTimeout(() => { gainNode.gain.value = 0; }, 900);
    setTimeout(() => { gainNode.gain.value = 0.25; }, 1200);
    setTimeout(() => {
      oscillator.stop();
      audioCtx.close();
    }, 1500);
  } catch {
    // Audio not supported or blocked.
  }
}


export function sendBidRejectedNotification(jobTitle: string, amount: number) {
  const notification: PlatformNotification = {
    id: `reject-notif-${Date.now()}`,
    type: 'bid',
    jobTitle,
    amount,
    timestamp: Date.now(),
  };
  notificationListeners.forEach((l) => l(notification));

  toast.error(`❌ Bid Rejected`, {
    description: `Your bid of ₹${amount} on "${jobTitle}" was rejected by the poster.`,
    duration: 8000,
  });
}

export function sendPaymentRequiredNotification(jobTitle: string, amount: number) {
  const notification: PlatformNotification = {
    id: `pay-notif-${Date.now()}`,
    type: 'payment',
    jobTitle,
    amount,
    timestamp: Date.now(),
  };
  notificationListeners.forEach((l) => l(notification));

  toast.success(`💰 Bid Accepted! Payment Required`, {
    description: `Pay ₹${amount} within 10 minutes for "${jobTitle}" to confirm the job.`,
    duration: 10000,
  });
}
