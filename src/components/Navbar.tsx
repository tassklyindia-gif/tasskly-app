import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Search, PlusCircle, LayoutDashboard, LogIn, LogOut, Briefcase, Menu } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";

import { safeLocalStorage } from "@/utils/safeStorage";

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { session, profile } = useApp();
  const isAuthenticated = !!session;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    safeLocalStorage.removeItem("tasskly_otp_verified");
    safeLocalStorage.removeItem("demoUserEmail");
    safeLocalStorage.removeItem("demoAdminAuth");
    toast.success("Signed out");
    navigate("/auth");
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-50 border-b bg-transparent backdrop-blur-md shadow-sm">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <Link to="/" className="flex items-center" style={{ gap: 0 }}>
          <img
            src="/taskly-logo.png"
            alt="Tasskly logo"
            style={{ width: "35px", height: "35px", marginRight: "8px" }}
            className="object-contain"
          />
          <span className="text-foreground font-bold tracking-tight" style={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: "28px", lineHeight: "36px" }}>
            Tasskly
          </span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          <Link to="/jobs">
            <Button variant={isActive("/jobs") ? "secondary" : "ghost"} size="sm" className="gap-2">
              <Search className="h-4 w-4" />
              Browse Jobs
            </Button>
          </Link>
          <Link to="/post-job">
            <Button variant={isActive("/post-job") ? "secondary" : "ghost"} size="sm" className="gap-2">
              <PlusCircle className="h-4 w-4" />
              Post a Job
            </Button>
          </Link>
          <Link to="/internships">
            <Button variant={isActive("/internships") ? "secondary" : "ghost"} size="sm" className="gap-2">
              <Briefcase className="h-4 w-4" />
              Internships
            </Button>
          </Link>
        </div>

        {/* Desktop Navigation Actions */}
        <div className="hidden md:flex items-center gap-2">
          {isAuthenticated ? (
            <>
              {profile && (
                <div className="hidden lg:flex items-center gap-2 mr-2 px-2 border-r border-border min-w-0">
                  <span className="text-sm font-medium truncate max-w-[120px]">{profile.full_name}</span>
                </div>
              )}
              <Link to="/dashboard">
                <Button variant="hero" size="sm" className="gap-2">
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </Button>
              </Link>
              <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-2">
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </>
          ) : (
            <Link to="/auth">
              <Button variant="hero" size="sm" className="gap-2">
                <LogIn className="h-4 w-4" />
                Sign In
              </Button>
            </Link>
          )}
        </div>

        {/* Mobile Navigation Actions */}
        <div className="flex items-center gap-2 md:hidden">
          {isAuthenticated ? (
            <Link to="/dashboard">
              <Button variant="hero" size="sm" className="h-9 px-3 gap-1">
                <LayoutDashboard className="h-4 w-4" />
                <span>Dashboard</span>
              </Button>
            </Link>
          ) : (
            <Link to="/auth">
              <Button variant="hero" size="sm" className="h-9 px-3 gap-1">
                <LogIn className="h-4 w-4" />
                <span>Sign In</span>
              </Button>
            </Link>
          )}

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px]">
              <SheetHeader className="mb-4">
                <SheetTitle className="text-left font-bold text-xl flex items-center gap-2 border-b pb-3">
                  <img
                    src="/taskly-logo.png"
                    alt="Tasskly logo"
                    className="w-6 h-6 object-contain"
                  />
                  Tasskly Menu
                </SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-2 py-2">
                <SheetClose asChild>
                  <Link to="/jobs" className="w-full">
                    <Button variant={isActive("/jobs") ? "secondary" : "ghost"} className="w-full justify-start gap-3 h-11 text-base">
                      <Search className="h-4 w-4 text-muted-foreground" />
                      Browse Jobs
                    </Button>
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link to="/post-job" className="w-full">
                    <Button variant={isActive("/post-job") ? "secondary" : "ghost"} className="w-full justify-start gap-3 h-11 text-base">
                      <PlusCircle className="h-4 w-4 text-muted-foreground" />
                      Post a Job
                    </Button>
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link to="/internships" className="w-full">
                    <Button variant={isActive("/internships") ? "secondary" : "ghost"} className="w-full justify-start gap-3 h-11 text-base">
                      <Briefcase className="h-4 w-4 text-muted-foreground" />
                      Internships
                    </Button>
                  </Link>
                </SheetClose>

                <div className="border-t my-2" />

                {isAuthenticated ? (
                  <>
                    {profile && (
                      <div className="px-3 py-1 text-xs font-semibold text-muted-foreground truncate">
                        Signed in as: {profile.full_name || profile.email}
                      </div>
                    )}
                    <SheetClose asChild>
                      <Link to="/dashboard" className="w-full">
                        <Button variant="ghost" className="w-full justify-start gap-3 h-11 text-base">
                          <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
                          Dashboard Overview
                        </Button>
                      </Link>
                    </SheetClose>
                    <SheetClose asChild>
                      <Button
                        variant="ghost"
                        className="w-full justify-start gap-3 h-11 text-base text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={handleLogout}
                      >
                        <LogOut className="h-4 w-4" />
                        Sign Out
                      </Button>
                    </SheetClose>
                  </>
                ) : (
                  <SheetClose asChild>
                    <Link to="/auth" className="w-full">
                      <Button variant="hero" className="w-full justify-start gap-3 h-11 text-base">
                        <LogIn className="h-4 w-4" />
                        Sign In
                      </Button>
                    </Link>
                  </SheetClose>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
