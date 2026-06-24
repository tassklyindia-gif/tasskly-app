import React from "react";
import { motion, AnimatePresence } from "framer-motion";

interface UnreadBadgeProps {
  count: number;
  className?: string;
}

const UnreadBadge: React.FC<UnreadBadgeProps> = ({ count, className = "" }) => {
  if (count <= 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0 }}
        className={`flex items-center justify-center bg-red-500 text-white text-[10px] font-black rounded-full min-w-[18px] h-[18px] px-1 shadow-sm border-2 border-card ${className}`}
      >
        {count > 99 ? "99+" : count}
      </motion.div>
    </AnimatePresence>
  );
};

export default UnreadBadge;
