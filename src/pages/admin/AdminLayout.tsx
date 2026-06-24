import { Outlet, useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/pages/admin/AdminSidebar";
import { Button } from "@/components/ui/button";
import { LogOut, ArrowLeft } from "lucide-react";

import { safeLocalStorage } from "@/utils/safeStorage";

const AdminLayout = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    safeLocalStorage.removeItem("demoAdminAuth");
    navigate("/admin/auth");
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AdminSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between border-b bg-card/80 backdrop-blur-lg px-4 gap-3">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-9 w-9 shrink-0 border" />
              <span className="font-display font-semibold text-foreground text-sm sm:text-base">Tasskly Admin</span>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-1.5 text-xs h-8 px-2.5" 
                onClick={() => navigate("/dashboard")}
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Exit Admin</span>
                <span className="sm:hidden">Exit</span>
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="gap-1.5 text-muted-foreground text-xs h-8 px-2" 
                onClick={handleLogout}
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </div>
          </header>
          <main className="flex-1 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AdminLayout;

