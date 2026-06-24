import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";

const NotFound = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-lg w-full text-center space-y-8">
        {/* Animated Illustration Mock */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="relative mx-auto w-64 h-64 flex items-center justify-center"
        >
          <div className="absolute inset-0 bg-primary/5 rounded-full animate-pulse" />
          <div className="text-9xl font-display font-black text-primary/20">404</div>
          <div className="absolute font-display text-4xl font-bold text-foreground">Lost?</div>
        </motion.div>

        <div className="space-y-3">
          <h1 className="font-display text-3xl font-bold text-foreground md:text-4xl">Page Not Found</h1>
          <p className="text-muted-foreground text-lg max-w-md mx-auto">
            The page you're looking for doesn't exist or has been moved. Let's get you back on track.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link to="/dashboard" className="w-full sm:w-auto">
            <Button variant="hero" className="w-full gap-2">
              <Home className="w-4 h-4" />
              Go to Dashboard
            </Button>
          </Link>
          <Button 
            variant="outline" 
            onClick={() => window.history.back()}
            className="w-full sm:w-auto gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
