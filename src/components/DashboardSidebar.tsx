import { safeLocalStorage } from "@/utils/safeStorage";

import { NavLink } from "@/components/NavLink";
import { useLocation, Link } from "react-router-dom";
import {
  LayoutDashboard,
  Briefcase,
  Gavel,
  IndianRupee,
  Settings,
  ArrowLeft,
  FolderOutput,
  UserCircle,
  Upload,
  Headphones,
  TrendingUp,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useApp } from "@/context/AppContext";
import { supabase } from "@/lib/supabase";
 
const baseMenuItems = [
  { title: "Overview", url: "/dashboard", icon: LayoutDashboard },
  { title: "My Jobs", url: "/dashboard/jobs", icon: Briefcase },
  { title: "Submitted Work", url: "/dashboard/submitted", icon: Upload },
  { title: "Portfolio", url: "/dashboard/portfolio", icon: FolderOutput },
  { title: "Earnings", url: "/dashboard/earnings", icon: IndianRupee },
  { title: "My Level", url: "/dashboard/levels", icon: TrendingUp },
  { title: "Your Information", url: "/dashboard/profile", icon: UserCircle },
  { title: "Customer Service", url: "/dashboard/support", icon: Headphones },
];


export function DashboardSidebar() {
  const { state, isMobile, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { profile, isAdmin } = useApp();

  const menuItems = [...baseMenuItems];
  if (isAdmin) {
    menuItems.push({ title: "Admin Panel", url: "/admin", icon: Settings });
  }

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarContent>

        <SidebarGroup>
          <SidebarGroupLabel>Dashboard</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end
                      className="hover:bg-muted/50"
                      activeClassName="bg-primary/10 text-primary font-medium"
                      onClick={() => {
                        if (isMobile) setOpenMobile(false);
                      }}
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t p-2 flex flex-col gap-2">
        <Link to="/" onClick={() => { if (isMobile) setOpenMobile(false); }}>
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
            <ArrowLeft className="h-4 w-4" />
            {!collapsed && <span>Back to Home</span>}
          </Button>
        </Link>
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full justify-start gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={async () => {
            await supabase.auth.signOut();
            safeLocalStorage.removeItem("tasskly_otp_verified");
            window.location.href = "/auth";
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-log-out"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
          {!collapsed && <span>Log Out</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
