import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Shield, Lock, Mail, ArrowRight, Eye, EyeOff, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import ColorBends from "@/components/ColorBends";
import { supabase } from "@/lib/supabase";

const AdminAuth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    // Check if already logged in as admin via Supabase session
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: profile } = await (supabase as any)
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .limit(1)
        .maybeSingle();
      if (profile?.role === "admin") navigate("/admin");
    };
    checkSession();
  }, [navigate]);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) throw authError;

      if (data.user) {
        const { data: profile, error: profileError } = await (supabase as any)
          .from("profiles")
          .select("role")
          .eq("id", data.user.id)
          .limit(1)
          .maybeSingle();

        if (profileError) throw profileError;

        if (!profile || (
          profile.role !== "admin" && 
          data.user.email !== "tasskly@admin.com" && 
          data.user.email !== "karthikmethuku180@gmail.com" &&
          data.user.email !== "shrikarakarapu@gmail.com"
        )) {
          await supabase.auth.signOut();
          setError("Access Denied. You do not have administrative privileges.");
          toast.error("Access Denied.");
          setLoading(false);
          return;
        }

        toast.success("Welcome, Administrator.");
        navigate("/admin");
      }
    } catch (err: any) {
      setError(err.message || "Invalid credentials.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center relative overflow-hidden px-4">
      <div className="absolute inset-0 z-0 opacity-40">
        <ColorBends
          colors={["#4f46e5", "#7c3aed", "#b91c1c"]}
          rotation={45}
          speed={0.1}
          scale={0.8}
          warpStrength={2}
          transparent
        />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 mb-4 shadow-xl shadow-primary/5">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <h1 className="font-display text-3xl font-black text-foreground tracking-tight italic">
            ADMIN <span className="text-primary">PORTAL</span>
          </h1>
          <p className="text-muted-foreground text-sm mt-2">Authorized Personnel Only</p>
        </div>

        <Card className="shadow-2xl border-primary/20 bg-card/80 backdrop-blur-xl">
          <CardContent className="p-8">
            <form onSubmit={handleAdminLogin} className="space-y-5">
              {error && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs font-bold"
                >
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </motion.div>
              )}

              <div className="space-y-2">
                <Label htmlFor="admin-email">Admin Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="admin-email"
                    type="email"
                    placeholder="tasskly@admin.com"
                    className="pl-10 h-11 bg-background/50 border-primary/10 focus:border-primary/40"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="admin-password">Secure Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="admin-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="pl-10 pr-10 h-11 bg-background/50 border-primary/10 focus:border-primary/40"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                variant="hero"
                className="w-full h-11 font-bold tracking-wide mt-2 shadow-lg shadow-primary/20"
                disabled={loading}
              >
                {loading ? (
                  <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <div className="flex items-center gap-2">
                    Verify Identity <ArrowRight className="h-4 w-4" />
                  </div>
                )}
              </Button>
            </form>

            <div className="mt-8 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold opacity-50">
                Security clearance level tracking active
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 text-center">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => navigate("/")}
          >
            Cancel and Return Home
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default AdminAuth;
