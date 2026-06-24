import React from "react";

/**
 * Wraps content to deter casual screenshots:
 * - Disables right-click context menu
 * - Disables text selection
 * - Disables drag
 */
export const NoScreenshotWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    onContextMenu={(e) => e.preventDefault()}
    onDragStart={(e) => e.preventDefault()}
    style={{ userSelect: "none", WebkitUserSelect: "none" }}
  >
    {children}
  </div>
);
