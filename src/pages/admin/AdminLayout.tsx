import { Outlet, Link, useLocation, Navigate } from "react-router-dom";
import { LayoutDashboard, Calendar, MapPin, Music, Users, FolderOpen, Menu, X, Clock, Layers, UserPlus, Home, Trash2, QrCode, Ticket, Inbox } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LoadingState } from "@/components/ui/LoadingState";
import { AdminErrorBoundary } from "@/components/admin/AdminErrorBoundary";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState } from "react";

export default function AdminLayout() {
  const location = useLocation();
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Check if user is authenticated
  const { data: session, isLoading: isLoadingSession } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      return session;
    },
  });

  // Check if user has backstage access (admin, crew, or festival team)
  const { data: hasBackstageAccess, isLoading: isLoadingAccess } = useQuery({
    queryKey: ["has-backstage-access"],
    queryFn: async () => {
      const { data } = await supabase.rpc("has_backstage_access");
      return data || false;
    },
    enabled: !!session,
  });

  // Check if user is admin (for showing admin-only nav items)
  const { data: isAdmin } = useQuery({
    queryKey: ["is-admin"],
    queryFn: async () => {
      const { data } = await supabase.rpc("is_admin");
      return data || false;
    },
    enabled: !!session,
  });

  const isLoading = isLoadingSession || (!!session && isLoadingAccess);

  const allNavItems = [
    { to: "/admin", icon: LayoutDashboard, label: "Dashboard", exact: true },
    { to: "/admin/festivals", icon: Calendar, label: "Festivaler" },
    { to: "/admin/events", icon: Music, label: "Events", adminOnly: true },
    { to: "/admin/entities", icon: Layers, label: "Entities", adminOnly: true },
    { to: "/admin/access-generator", icon: UserPlus, label: "Tilgang", adminOnly: true },
    { to: "/admin/timeline", icon: Clock, label: "Timeline", adminOnly: true },
    { to: "/admin/media", icon: FolderOpen, label: "Filbank" },
    { to: "/admin/tickets", icon: Ticket, label: "Billetter", adminOnly: true },
    { to: "/crew/checkin", icon: QrCode, label: "Scan billetter" },
    { to: "/admin/deletion-requests", icon: Trash2, label: "Sletting", adminOnly: true },
    { to: "/admin/inbox", icon: Inbox, label: "Inbox", adminOnly: true },
    { to: "/admin/access-requests", icon: UserPlus, label: "Forespørsler", adminOnly: true },
  ];

  const navItems = isAdmin
    ? allNavItems
    : allNavItems.filter((item) => !item.adminOnly);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingState message="Laster..." />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/admin/login" replace />;
  }

  // Redirect users without backstage access to dashboard
  if (!hasBackstageAccess) {
    return <Navigate to="/dashboard" replace />;
  }

  const NavContent = () => (
    <>
      <div className="p-4 md:p-6 border-b border-border/30">
        <Link to="/admin" className="text-lg md:text-xl font-bold text-foreground" onClick={() => setSidebarOpen(false)}>
          GIGGEN <span className="text-muted-foreground font-normal text-sm">Backstage</span>
        </Link>
      </div>
      
      <nav className="flex-1 p-2 md:p-4 space-y-0.5">
        {navItems.map(({ to, icon: Icon, label, exact }) => {
          const isActive = exact 
            ? location.pathname === to 
            : location.pathname.startsWith(to) && (exact || to !== "/admin");
          
          return (
            <Link
              key={to}
              to={to}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 md:px-4 py-2.5 md:py-3 rounded-md transition-colors text-sm md:text-base active:bg-muted ${
                isActive
                  ? "bg-accent/15 text-accent"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4 md:h-5 md:w-5 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 md:p-4 border-t border-border/30 space-y-1">
        <Link 
          to="/dashboard" 
          onClick={() => setSidebarOpen(false)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground active:text-foreground transition-colors py-2"
        >
          <Home className="h-4 w-4" />
          Backstage
        </Link>
        <Link 
          to="/" 
          onClick={() => setSidebarOpen(false)}
          className="text-sm text-muted-foreground hover:text-foreground active:text-foreground transition-colors block py-2"
        >
          ← Tilbake til siden
        </Link>
      </div>
    </>
  );

  return (
    <div className="min-h-[100svh] flex flex-col md:flex-row">
      {/* Mobile header */}
      {isMobile && (
        <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border/30 px-3 py-2.5 flex items-center justify-between" style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 0.625rem)' }}>
          <Link to="/admin" className="text-base font-bold text-foreground">
            GIGGEN <span className="text-muted-foreground font-normal text-xs">Backstage</span>
          </Link>
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] p-0 flex flex-col">
              <NavContent />
            </SheetContent>
          </Sheet>
        </header>
      )}

      {/* Desktop Sidebar */}
      {!isMobile && (
        <aside className="w-64 bg-card/50 border-r border-border/30 flex flex-col shrink-0">
          <NavContent />
        </aside>
      )}

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="px-3 py-4 md:p-8 pb-[env(safe-area-inset-bottom)]">
          <AdminErrorBoundary>
            <Outlet />
          </AdminErrorBoundary>
        </div>
      </main>
    </div>
  );
}
