import React, { useEffect, useState, useCallback } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppProvider } from "@/context/AppContext";
import { useApp } from "@/context/AppContext";
import AdminLayout from "./pages/admin/AdminLayout.tsx";
import AdminOverview from "./pages/admin/AdminOverview.tsx";
import AdminEscrow from "./pages/admin/AdminEscrow.tsx";
import AdminLedger from "./pages/admin/AdminLedger.tsx";
import AdminUsers from "./pages/admin/AdminUsers.tsx";
import AdminNotifications from "./pages/admin/AdminNotifications.tsx";
import AdminRefunds from "./pages/admin/AdminRefunds.tsx";
import AdminWithdrawals from "./pages/admin/AdminWithdrawals.tsx";
import AdminAuth from "./pages/admin/AdminAuth.tsx";
import AdminGuard from "./components/AdminGuard.tsx";
import Index from "./pages/Index.tsx";
import BrowseJobs from "./pages/BrowseJobs.tsx";
import JobDetail from "./pages/JobDetail.tsx";
import PostJob from "./pages/PostJob.tsx";
import OnTimeWorks from "./pages/OnTimeWorks.tsx";
import Internships from "./pages/Internships.tsx";
import Auth from "./pages/Auth.tsx";
import DashboardLayout from "./pages/dashboard/DashboardLayout.tsx";
import DashboardOverview from "./pages/dashboard/DashboardOverview.tsx";
import MyJobs from "./pages/dashboard/MyJobs.tsx";
import Earnings from "./pages/dashboard/Earnings.tsx";
import Portfolio from "./pages/dashboard/Portfolio.tsx";
import Profile from "./pages/dashboard/Profile.tsx";
import SubmittedWork from "./pages/dashboard/SubmittedWork.tsx";
import CustomerService from "./pages/dashboard/CustomerService.tsx";
import Levels from "./pages/dashboard/Levels.tsx";
import NotFound from "./pages/NotFound.tsx";
import { useNotificationPermission } from "./hooks/useNotificationPermission";
import NotificationBanner from "./components/NotificationBanner";
import { motion } from "framer-motion";
import CircularText from "./components/CircularText";
import ColorBends from "./components/ColorBends";

const NotificationGate = ({ children }: { children: React.ReactNode }) => {
  useNotificationPermission();
  return <>{children}</>;
};

const SplashScreen = ({ onComplete }: { onComplete: () => void }) => {
  const [progress, setProgress] = useState(0);
  const [currentText, setCurrentText] = useState(0);
  const [dimensions, setDimensions] = useState({ size: 440, radius: 176 });

  const loadingTexts = [
    "Finding assignments for you...",
    "Connecting students & experts...",
    "Loading your marketplace...",
    "Almost ready...",
  ];

  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth < 640;
      setDimensions((prev) => {
        const nextSize = isMobile ? 310 : 440;
        const nextRadius = isMobile ? 122 : 176;
        if (prev.size === nextSize && prev.radius === nextRadius) {
          return prev;
        }
        return { size: nextSize, radius: nextRadius };
      });
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const duration = 1500; // 1.5 seconds total loading
    const intervalTime = 50; // update progress every 50ms
    const step = 100 / (duration / intervalTime); // increment step

    const timer = setInterval(() => {
      setProgress((old) => {
        if (old >= 100) {
          clearInterval(timer);
          setTimeout(onComplete, 150); // Pause briefly at 100% so it is fully visible
          return 100;
        }
        return Math.min(old + step, 100);
      });
    }, intervalTime);
    return () => clearInterval(timer);
  }, [onComplete]);

  useEffect(() => {
    const t = setInterval(() => {
      setCurrentText((old) => (old + 1) % loadingTexts.length);
    }, 2000); // calm transition matching the 8 second load time
    return () => clearInterval(t);
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white relative overflow-hidden">

      {/* Soft colorful gradient blobs — light theme */}
      <div className="absolute inset-0 z-0">
        <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-violet-200 via-pink-100 to-transparent opacity-70 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] rounded-full bg-gradient-to-tl from-emerald-200 via-cyan-100 to-transparent opacity-60 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-blue-100 via-indigo-50 to-transparent opacity-50 blur-3xl" />
      </div>

      {/* Subtle dot grid */}
      <div
        className="absolute inset-0 opacity-[0.07] z-0"
        style={{
          backgroundImage: "radial-gradient(circle, #6366f1 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      {/* Center content */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-10 flex flex-col items-center gap-8"
      >
        {/* Logo + Circular Text */}
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 18, delay: 0.1 }}
          className="relative flex items-center justify-center mb-6 origin-center"
        >
          {/* Soft glow ring */}
          <motion.div
            animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.1, 0.3] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="absolute rounded-full bg-gradient-to-br from-violet-300/30 to-emerald-300/30 blur-3xl pointer-events-none"
            style={{
              width: `${dimensions.size + 10}px`,
              height: `${dimensions.size + 10}px`,
            }}
          />

          <CircularText
            text="TASSKLY • INDIA'S STUDENT MARKETPLACE • "
            spinDuration={20}
            onHover="speedUp"
            size={dimensions.size}
            radius={dimensions.radius}
          >
            {/* Brand — bigger logo + text, dark color for light bg */}
            <div className="flex flex-col items-center justify-center">
               <div className="flex flex-col items-center justify-center" style={{ gap: 0 }}>
                 <img
                   src="/taskly-logo.png"
                   alt="Tasskly Logo"
                   style={{
                     width: dimensions.size === 310 ? '75px' : '100px',
                     height: dimensions.size === 310 ? '75px' : '100px',
                     animationDuration: '4s'
                   }}
                   className="object-contain animate-pulse shrink-0 mb-2"
                 />
                 <h1 className="text-gray-900 font-bold tracking-tight animate-in fade-in" style={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: dimensions.size === 310 ? '26px' : '36px', lineHeight: '1.2', marginTop: '0px' }}>
                   Tasskly
                 </h1>
               </div>
              <p className="text-[9px] font-bold text-violet-600 tracking-widest uppercase mt-2">
                India's Student Marketplace
              </p>
            </div>
          </CircularText>
        </motion.div>

        {/* Animated loading text */}
        <motion.p
          key={currentText}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="text-xs text-gray-500 tracking-wide"
        >
          {loadingTexts[currentText]}
        </motion.p>

        {/* Progress bar */}
        <div className="w-64">
          <div className="w-full h-[3px] bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-violet-500 via-pink-400 to-emerald-500"
              animate={{ width: `${progress}%` }}
              transition={{ ease: "easeOut", duration: 0.3 }}
            />
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-[10px] text-gray-400">Loading</span>
            <span className="text-[10px] text-gray-400">{Math.round(progress)}%</span>
          </div>
        </div>
      </motion.div>

      {/* Bottom tagline */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="absolute bottom-8 text-[11px] text-gray-400 tracking-widest uppercase"
      >
        Upload · Assign · Deliver
      </motion.p>
    </div>
  );
};

const queryClient = new QueryClient();


import { safeLocalStorage } from "@/utils/safeStorage";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { session, authLoading } = useApp();
  const location = useLocation();

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Live OTP verification gate
  const isOtpVerified = safeLocalStorage.getItem("tasskly_otp_verified") === "true";
  if (!isOtpVerified) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

const App = () => {
  const [showSplash, setShowSplash] = useState(false);

  const handleSplashComplete = useCallback(() => {
    setShowSplash(false);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppProvider>
          <NotificationGate>
            <NotificationBanner />
            <Toaster />
            <Sonner />
            <BrowserRouter>
              {showSplash ? (
                <SplashScreen onComplete={handleSplashComplete} />
              ) : (
                <Routes>
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/" element={<Index />} />
                  <Route path="/jobs" element={<BrowseJobs />} />
                  <Route path="/internships" element={<Internships />} />
                  <Route path="/jobs/:id" element={<JobDetail />} />
                  <Route path="/post-job" element={<ProtectedRoute><PostJob /></ProtectedRoute>} />
                  <Route path="/on-time-works" element={<ProtectedRoute><OnTimeWorks /></ProtectedRoute>} />
                  <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
                    <Route index element={<DashboardOverview />} />
                    <Route path="jobs" element={<MyJobs />} />
                    <Route path="earnings" element={<Earnings />} />
                    <Route path="portfolio" element={<Portfolio />} />
                    <Route path="profile" element={<Profile />} />
                    <Route path="levels" element={<Levels />} />
                    <Route path="submitted" element={<SubmittedWork />} />
                    <Route path="support" element={<CustomerService />} />
                  </Route>
                  <Route path="/admin/auth" element={<AdminAuth />} />
                  <Route path="/admin" element={<AdminGuard><AdminLayout /></AdminGuard>}>
                    <Route index element={<AdminOverview />} />
                    <Route path="escrow" element={<AdminEscrow />} />
                    <Route path="ledger" element={<AdminLedger />} />
                    <Route path="users" element={<AdminUsers />} />
                    <Route path="refunds" element={<AdminRefunds />} />
                    <Route path="withdrawals" element={<AdminWithdrawals />} />
                    <Route path="notifications" element={<AdminNotifications />} />
                  </Route>
                  <Route path="*" element={<NotFound />} />
                </Routes>
              )}
            </BrowserRouter>
          </NotificationGate>
        </AppProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
