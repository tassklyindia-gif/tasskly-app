import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useApp } from "@/context/AppContext";
import PageLoader from "./PageLoader";

interface AuthGuardProps {
  children: React.ReactNode;
}

const AuthGuard = ({ children }: AuthGuardProps) => {
  const { profile, authLoading: loading, user: sessionUser, refreshProfile } = useApp();
  const location = useLocation();

  if (loading) {
    return <PageLoader />;
  }

  if (!profile && !sessionUser) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (!profile && sessionUser) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 text-center">
        <PageLoader />
        <div className="mt-8 space-y-4 max-w-sm">
          <div className="space-y-2">
            <h2 className="text-xl font-bold">Initializing your account...</h2>
            <p className="text-muted-foreground text-sm">
              We're setting things up for you. This should only take a moment.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <button 
              onClick={() => refreshProfile()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Try Again
            </button>
            <button 
              onClick={() => window.location.href = '/auth'}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Back to Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default AuthGuard;
