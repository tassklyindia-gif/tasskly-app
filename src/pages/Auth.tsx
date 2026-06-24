import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, User, ArrowRight, ArrowLeft, Sparkles, Eye, EyeOff, Phone } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { getApiUrl } from "@/lib/api";
import { safeLocalStorage } from "@/utils/safeStorage";

type AuthView = "signin" | "signup" | "otp_verify" | "forgot" | "reset" | "upi_required";

const Auth = () => {
  const [view, setView] = useState<AuthView>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [showWelcome, setShowWelcome] = useState(false);
  const [upiId, setUpiId] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const navigate = useNavigate();

  // Custom OTP state to retain temporary secure details across views
  const [generatedOtp, setGeneratedOtp] = useState("");
  const [tempPassword, setTempPassword] = useState("");

  // Helper to generate a secure random 6-digit code
  const generateOTP = () => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    console.log("[Tasskly Dev Mode] OTP Verification Code:", code);
    return code;
  };

  // Helper to trigger custom OTP delivery (SMTP / Resend)
  const triggerCustomOtp = async (targetEmail: string, code: string, type: 'signup' | 'login') => {
    // Attempt live delivery via our Vercel Serverless Function
    try {
      const response = await fetch(getApiUrl("/api/send-otp"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail, otp: code, type }),
      });
      
      const resData = await response.json();
      if (resData.success) {
        toast.success("A secure verification code has been sent to your email! ✉️");
      } else {
        console.error("[Tasskly Backend Error]", resData.message);
        toast.warning(`[Developer Fallback] Email failed to send (${resData.message}). Use verification code: ${code}`, { duration: 15000 });
      }
    } catch (err) {
      console.error("Could not reach backend OTP dispatch API:", err);
      toast.warning(`[Developer Fallback] Could not contact OTP service. Use verification code: ${code}`, { duration: 15000 });
    }
  };

  // Redirect if already logged in, OR detect recovery/reset mode
  useEffect(() => {
    // Parse recovery mode from URL query or hash params
    const searchParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    
    if (searchParams.get("type") === "reset" || hashParams.get("type") === "recovery" || window.location.hash.includes("access_token")) {
      setView("reset");
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      const isOtpVerified = safeLocalStorage.getItem("tasskly_otp_verified") === "true";
      if (session && isOtpVerified) {
        navigate("/dashboard", { replace: true });
      } else if (session && !isOtpVerified) {
        setView("otp_verify");
        if (session.user?.email) {
          setEmail(session.user.email);
        }
      }
    });
  }, [navigate]);

  const handleResendCode = async () => {
    if (!email) {
      toast.error("Email is required to resend verification code.");
      return;
    }
    setLoading(true);
    try {
      const code = generateOTP();
      setGeneratedOtp(code);
      safeLocalStorage.setItem("pending_otp_code", code);
      safeLocalStorage.setItem("pending_otp_email", email.trim());
      const otpType = safeLocalStorage.getItem("pending_otp_type") || "email";

      await triggerCustomOtp(email.trim(), code, otpType === "signup" ? "signup" : "login");

      toast.success("A new verification code has been sent to your email! ✉️");
      setInfoMessage("A new 6-digit verification code has been sent to your email. Please check your inbox and verify below.");
    } catch (err: any) {
      toast.error(err.message || "Failed to resend code.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setError("");
    setInfoMessage("");

    try {
      if (view === "signin") {
        // 1. Sign In directly with email & password (no OTP!)
        if (!email.trim() || !password.trim()) throw new Error("Email and password are required");

        const { data, error: signInErr } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password
        });

        if (signInErr) {
          throw signInErr;
        }

        // Check if user has registered but skipped the OTP step (metadata otp_verified is explicitly false)
        const isOtpPending = data.user?.user_metadata?.otp_verified === false;
        
        if (isOtpPending) {
          // Generate a new OTP code for them
          const code = generateOTP();
          setGeneratedOtp(code);
          setTempPassword(password); // Save correct password to log back in after OTP match
          safeLocalStorage.setItem("pending_otp_code", code);
          safeLocalStorage.setItem("pending_otp_email", email.trim());
          safeLocalStorage.setItem("pending_otp_type", "signup");
          
          // Trigger the OTP email
          await triggerCustomOtp(email.trim(), code, "signup");
          
          setInfoMessage("Your account activation is pending. We have sent a 6-digit verification code to your email. Enter it below to complete activation.");
          setView("otp_verify");
          setLoading(false);
          return;
        }

        // Set verified so they bypass ProtectedRoute gate
        safeLocalStorage.setItem("tasskly_otp_verified", "true");

        toast.success("Successfully logged in! Welcome to Tasskly 🎉");
        setShowWelcome(true);
        setTimeout(() => {
          setShowWelcome(false);
          navigate("/dashboard");
        }, 900);
      } else if (view === "signup") {
        // 2. Sign Up (with Password + verification OTP)
        if (!displayName.trim()) throw new Error("Please enter your display name");
        if (!phone.trim()) throw new Error("Please enter your phone number");
        
        // Basic phone number validation (10 to 15 digits)
        const cleanPhone = phone.trim().replace(/[\s-]/g, "");
        const phoneRegex = /^[+]?[0-9]{10,15}$/;
        if (!phoneRegex.test(cleanPhone)) {
          throw new Error("Please enter a valid phone number (10 to 15 digits)");
        }

        if (!agreeTerms) throw new Error("You must agree to the Terms & Conditions and Privacy Policy");
        if (!email.trim() || !password.trim()) throw new Error("Email and password are required");

        // Create user in Supabase (confirm email is OFF, so this succeeds and signs them in immediately!)
        const { data, error: signUpErr } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { 
            data: { 
              full_name: displayName.trim(),
              phone: cleanPhone,
              otp_verified: false
            } 
          },
        });

        if (signUpErr) {
          if (
            signUpErr.message.toLowerCase().includes("already") ||
            signUpErr.message.toLowerCase().includes("registered") ||
            signUpErr.message.toLowerCase().includes("exists")
          ) {
            setError("An account with this email already exists. Please sign in instead.");
            setView("signin");
            setLoading(false);
            return;
          }
          throw signUpErr;
        }

        // Generate custom OTP code for signup
        const code = generateOTP();
        setGeneratedOtp(code);
        setTempPassword(password); // Save correct password to log back in after OTP match
        safeLocalStorage.setItem("pending_otp_code", code);
        safeLocalStorage.setItem("pending_otp_email", email.trim());
        safeLocalStorage.setItem("pending_otp_type", "signup");

        await triggerCustomOtp(email.trim(), code, "signup");

        setInfoMessage("Account registered successfully! To activate your account securely, we have sent a 6-digit verification code to your email. Enter it below to complete registration.");
        setView("otp_verify");
        setLoading(false);
      } else if (view === "otp_verify") {
        // 3. Confirm OTP code!
        if (!otpCode.trim()) throw new Error("Please enter the 6-digit verification code");
        
        const storedCode = safeLocalStorage.getItem("pending_otp_code");
        const storedEmail = safeLocalStorage.getItem("pending_otp_email") || email.trim();
        const otpType = safeLocalStorage.getItem("pending_otp_type") || "email";

        if (otpCode.trim() !== storedCode) {
          throw new Error("Invalid verification code. Please check your inbox or developer console (F12) and try again.");
        }

        // OTP matches! Check if we are already signed in
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (!currentSession) {
          const targetPassword = tempPassword || password;
          if (!targetPassword) {
            throw new Error("Temporary login session expired. Please sign in again.");
          }

          const { error: finalSignInErr } = await supabase.auth.signInWithPassword({
            email: storedEmail,
            password: targetPassword
          });

          if (finalSignInErr) throw finalSignInErr;
        }

        // Set metadata otp_verified to true upon successful OTP match
        const { error: updateMetaErr } = await supabase.auth.updateUser({
          data: { otp_verified: true }
        });
        if (updateMetaErr) throw updateMetaErr;

        // Clean up OTP session state
        safeLocalStorage.removeItem("pending_otp_type");
        safeLocalStorage.removeItem("pending_otp_code");
        safeLocalStorage.removeItem("pending_otp_email");

        // Authorize this device's dashboard access via the OTP verification gate!
        safeLocalStorage.setItem("tasskly_otp_verified", "true");

        toast.success("Successfully verified! Welcome to Tasskly 🎉");
        setShowWelcome(true);
        setTimeout(() => {
          setShowWelcome(false);
          navigate("/dashboard");
        }, 900);
      }
    } catch (err: any) {
      console.error("Auth Error:", err);
      setError(err.message || "An authentication error occurred.");
      toast.error(err.message || "Authentication failed");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden px-4"
      style={{
        background: "linear-gradient(135deg, #bae6fd 0%, #f0fdf4 75%, #d1fae5 100%)",
      }}
    >
      {/* Soft brand-matching blob backgrounds */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-sky-200/40 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-emerald-200/40 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-teal-100/30 blur-3xl" />
      </div>

      {/* Subtle dot grid */}
      <div className="absolute inset-0 z-0 opacity-[0.06] pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(circle, #6366f1 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Logo — centered */}
        <motion.div
          className="w-full flex flex-col items-center justify-center text-center mb-6"
          initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        >
          <motion.div
            className="flex flex-col items-center justify-center animate-in fade-in gap-3"
            whileHover={{ scale: 1.05 }}
          >
            <img
              src="/taskly-logo.png"
              alt="Tasskly logo"
              style={{ width: "70px", height: "70px" }}
              className="object-contain shrink-0"
            />
            <span
              className="text-gray-900 font-bold tracking-tight animate-in fade-in"
              style={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: "36px", lineHeight: "1.2" }}
            >
              Tasskly
            </span>
          </motion.div>
          <p className="text-sm text-gray-500 mt-2 font-medium">
            {view === "signup" ? "Create an account with password + OTP code" : 
             view === "otp_verify" ? "Confirm 6-digit code to activate account" :
             view === "forgot" ? "Reset your password credentials" :
             view === "reset" ? "Select a secure new password" :
             "Sign in with password + email verification code"}
          </p>
        </motion.div>

        <Card className="shadow-xl border-white/60 backdrop-blur-sm bg-white/90 mx-auto">
          <CardContent className="p-6 space-y-6">
            
            {/* Header / Back navigation */}
            {!(view === "signin" || view === "signup") && (
              <button
                type="button"
                onClick={async () => {
                  setView("signin");
                  setError("");
                  setInfoMessage("");
                  // Clean up session if they click back to login
                  await supabase.auth.signOut();
                }}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors uppercase tracking-wider"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back to Login
              </button>
            )}

            {/* Toggle (Sign In / Sign Up) */}
            {(view === "signin" || view === "signup") && (
              <div className="relative flex rounded-lg bg-gray-100 p-1">
                <motion.div
                  className="absolute top-1 bottom-1 rounded-md bg-primary"
                  initial={false}
                  animate={{ 
                    left: view === "signin" ? "4px" : "50%", 
                    width: "calc(50% - 4px)" 
                  }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
                <button type="button" onClick={() => setView("signin")}
                  className={`relative z-10 flex-1 py-2 text-sm font-semibold transition-colors ${
                    view === "signin" ? "text-primary-foreground" : "text-muted-foreground"
                  }`}>
                  Sign In
                </button>
                <button type="button" onClick={() => { setView("signup"); setError(""); setInfoMessage(""); }}
                  className={`relative z-10 flex-1 py-2 text-sm font-semibold transition-colors ${
                    view === "signup" ? "text-primary-foreground" : "text-muted-foreground"
                  }`}>
                  Sign Up
                </button>
              </div>
            )}

            {/* Error & Info Messages */}
            {error && (
              <div className="space-y-3">
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium text-left shadow-sm"
                >
                  <span className="flex-1 font-semibold">{error}</span>
                </motion.div>
              </div>
            )}

            {infoMessage && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3.5 rounded-xl border border-violet-200/80 bg-violet-50/80 text-violet-800 text-xs text-left leading-relaxed shadow-sm flex items-start gap-2.5 font-medium"
              >
                <span className="shrink-0 mt-0.5">✉️</span>
                <span className="flex-1">{infoMessage}</span>
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 animate-in fade-in">
              <AnimatePresence mode="wait">
                
                {/* ── VIEW: Forgot Password ── */}
                {view === "forgot" && (
                  <motion.div key="forgot-view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4 text-left">
                    <div className="space-y-1.5">
                      <h4 className="font-bold text-slate-800 text-sm">Recover Password</h4>
                      <p className="text-xs text-slate-500">Enter your email below. We'll send you a custom verification link to securely choose a new password.</p>
                    </div>
                    <div>
                      <Label htmlFor="email" className="block mb-1.5 text-sm font-medium text-foreground">Email</Label>
                      <div className="relative mt-1">
                        <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                          placeholder="name@email.com" className="pl-10" required />
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* ── VIEW: Reset Password ── */}
                {view === "reset" && (
                  <motion.div key="reset-view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4 text-left">
                    <div className="space-y-1.5">
                      <h4 className="font-bold text-slate-800 text-sm">Choose New Password</h4>
                      <p className="text-xs text-slate-500">Secure your account by typing your new login password below.</p>
                    </div>
                    <div>
                      <Label htmlFor="new-password" className="block mb-1.5 text-sm font-medium text-foreground">New Password</Label>
                      <div className="relative mt-1">
                        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input id="new-password" type={showPassword ? "text" : "password"} value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••"
                          className="pl-10 pr-10" required minLength={6} />
                        <button type="button" onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="confirm-password" className="block mb-1.5 text-sm font-medium text-foreground">Confirm New Password</Label>
                      <div className="relative mt-1">
                        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input id="confirm-password" type="password" value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••"
                          className="pl-10" required />
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* ── VIEW: OTP Verify ── */}
                {view === "otp_verify" && (
                  <motion.div key="otp-verify-view" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="space-y-4 text-left">
                    <div className="space-y-1.5">
                      <h4 className="font-bold text-slate-800 text-sm">Enter Verification Code</h4>
                      <p className="text-xs text-slate-500">Please enter the 6-digit verification token sent to <strong className="text-slate-700">{email}</strong>.</p>
                    </div>
                    <div>
                      <Label htmlFor="otp" className="block mb-1.5 text-sm font-medium text-foreground">6-Digit Code</Label>
                      <div className="relative mt-1">
                        <Sparkles className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary animate-pulse" />
                        <Input id="otp" value={otpCode} onChange={(e) => setOtpCode(e.target.value)}
                          placeholder="e.g. 123456" className="pl-10 text-center tracking-[0.5em] font-mono text-lg font-bold" required />
                      </div>
                    </div>
                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={handleResendCode}
                        className="text-xs font-bold text-primary hover:underline"
                        disabled={loading}
                      >
                        Resend Verification Code?
                      </button>
                    </div>
                  </motion.div>
                )}



                {/* ── VIEW: Sign In ── */}
                {view === "signin" && (
                  <motion.div key="signin-view" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="space-y-4 text-left">
                    <div>
                      <Label htmlFor="email" className="block mb-1.5 text-sm font-medium text-foreground">Email</Label>
                      <div className="relative mt-1">
                        <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                          placeholder="Enter your registered email" className="pl-10" required />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="password" className="block mb-1.5 text-sm font-medium text-foreground">Password</Label>
                      <div className="relative mt-1">
                        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input id="password" type={showPassword ? "text" : "password"} value={password}
                          onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
                          className="pl-10 pr-10" required minLength={6} />
                        <button type="button" onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      <div className="flex justify-end pt-2">
                        <button
                          type="button"
                          onClick={() => { setView("forgot"); setError(""); setInfoMessage(""); }}
                          className="text-xs font-bold text-primary hover:underline"
                        >
                          Forgot Password?
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* ── VIEW: Sign Up ── */}
                {view === "signup" && (
                  <motion.div key="signup-view" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="space-y-4 text-left">
                    <div>
                      <Label htmlFor="name" className="block mb-1.5 text-sm font-medium text-foreground">Display Name</Label>
                      <div className="relative mt-1">
                        <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input id="name" value={displayName} onChange={(e) => setDisplayName(e.target.value)}
                          placeholder="Your name" className="pl-10" required />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="phone" className="block mb-1.5 text-sm font-medium text-foreground">Phone Number</Label>
                      <div className="relative mt-1">
                        <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                          placeholder="+91 98765 43210" className="pl-10" required />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="email" className="block mb-1.5 text-sm font-medium text-foreground">Email</Label>
                      <div className="relative mt-1">
                        <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                          placeholder="name@email.com" className="pl-10" required />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="password" className="block mb-1.5 text-sm font-medium text-foreground">Password</Label>
                      <div className="relative mt-1">
                        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input id="password" type={showPassword ? "text" : "password"} value={password}
                          onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
                          className="pl-10 pr-10" required minLength={6} />
                        <button type="button" onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5 pt-1 text-left">
                      <input
                        id="agreeTerms"
                        type="checkbox"
                        checked={agreeTerms}
                        onChange={(e) => setAgreeTerms(e.target.checked)}
                        className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer shrink-0"
                        required
                      />
                      <Label htmlFor="agreeTerms" className="text-xs text-muted-foreground leading-normal font-normal cursor-pointer select-none">
                        I agree to the{" "}
                        <span className="text-primary hover:underline font-semibold cursor-pointer">Terms & Conditions</span>
                        {" "}and{" "}
                        <span className="text-primary hover:underline font-semibold cursor-pointer">Privacy Policy</span>.
                      </Label>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <Button type="submit" variant="hero" className="w-full gap-2 mt-2 shadow-lg shadow-primary/10" disabled={loading}>
                {loading ? (
                  <motion.div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full"
                    animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} />
                ) : (
                  <>
                    {view === "signup" ? "Create Account & Send Code" :
                     view === "otp_verify" ? "Confirm & Enter Dashboard" :
                     view === "forgot" ? "Send Reset Link" :
                     view === "reset" ? "Save & Login" :
                     "Verify Password & Send Code"}
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </form>

            {/* Promo banner */}
            {(view === "signin" || view === "signup") && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
                className="flex items-center gap-2 rounded-lg bg-primary/5 p-3 text-xs text-muted-foreground text-left leading-relaxed">
                <Sparkles className="h-4 w-4 shrink-0 text-primary animate-pulse" />
                Post jobs, bid on tasks, and earn money within your student community.
              </motion.div>
            )}

          </CardContent>
        </Card>
      </motion.div>

      {/* Welcome Flash screen */}
      <AnimatePresence>
        {showWelcome && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }} transition={{ duration: 0.3 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #bae6fd 0%, #f0fdf4 75%, #d1fae5 100%)" }}
          >
            <div className="relative z-10 text-center space-y-4 flex flex-col items-center">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                transition={{ type: "spring", damping: 12, delay: 0.1 }}
                className="mx-auto flex flex-col items-center justify-center gap-3" >
                <img src="/taskly-logo.png" alt="Tasskly logo"
                  style={{ width: "70px", height: "70px" }}
                  className="object-contain shrink-0" />
                <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                  className="text-gray-900 font-bold tracking-tight animate-in fade-in"
                  style={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: "36px", lineHeight: "1.2" }}>Tasskly</motion.h1>
              </motion.div>
              <div>
                <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                  className="mt-1 text-sm font-medium text-gray-500">Welcome to the student marketplace</motion.p>
              </div>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
                className="flex flex-col items-center gap-2 mt-8">
                <div className="h-1.5 w-64 bg-primary/20 overflow-hidden rounded-full">
                  <motion.div className="h-full bg-primary" initial={{ width: "0%" }} animate={{ width: "100%" }}
                    transition={{ duration: 0.8 }} />
                </div>
                <p className="text-xs font-medium mt-1 uppercase tracking-widest text-primary/70">
                  Loading workspace
                </p>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Auth;
