/**
 * Dynamic API routing helper for Tasskly.
 * Resolves absolute production URL when running on mobile devices (Capacitor/localhost)
 * to prevent relative route connection drops.
 */
export const getApiUrl = (path: string): string => {
  if (typeof window !== "undefined") {
    const isMobileContainer = 
      window.location.hostname === "localhost" || 
      window.location.hostname === "127.0.0.1" || 
      window.location.protocol === "file:" || 
      window.location.hostname === "";
      
    if (isMobileContainer) {
      return `https://tasskly.com${path}`;
    }
  }
  return path;
};
