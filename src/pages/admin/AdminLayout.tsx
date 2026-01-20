import { Outlet, Link, useLocation, Navigate } from "react-router-dom";
import { LayoutDashboard, Calendar, MapPin, Music, Users, FolderOpen, Menu, X, Clock, Layers, UserPlus, Home } from "lucide-react";
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
  const { data: session, isLoading } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      return session;
    },
  });

  const navItems = [
    { to: "/admin", icon: LayoutDashboard, label: "Dashboard", exact: true },
    { to: "/admin/festivals", icon: Calendar, label: "Festivaler" },
    { to: "/admin/events", icon: Music, label: "Events" },
    { to: "/admin/entities", icon: Layers, label: "Entities" },
    { to: "/admin/access-generator", icon: UserPlus, label: "Tilgang" },
    { to: "/admin/timeline", icon: Clock, label: "Timeline" },
    { to: "/admin/media", icon: FolderOpen, label: "Filbank" },
    // Legacy - hidden but still accessible
    // { to: "/admin/projects", icon: Users, label: "Artister (legacy)" },
    // { to: "/admin/venues", icon: MapPin, label: "Venues (legacy)" },
  ];

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

  const NavContent = () => (
    <>
      <div className="p-4 md:p-6 border-b border-border">
        <Link to="/admin" className="text-lg md:text-xl font-bold text-foreground" onClick={() => setSidebarOpen(false)}>
          GIGGEN <span className="text-muted-foreground font-normal text-sm">Backstage</span>
        </Link>
      </div>
      
      <nav className="flex-1 p-3 md:p-4 space-y-1">
        {navItems.map(({ to, icon: Icon, label, exact }) => {
          const isActive = exact 
            ? location.pathname === to 
            : location.pathname.startsWith(to) && (exact || to !== "/admin");
          
          return (
            <Link
              key={to}
              to={to}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 md:px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 md:p-4 border-t border-border space-y-2">
        <Link 
          to="/dashboard" 
          onClick={() => setSidebarOpen(false)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <Home className="h-4 w-4" />
          Brukerdashboard
        </Link>
        <Link 
          to="/" 
          onClick={() => setSidebarOpen(false)}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors block"
        >
          ← Tilbake til siden
        </Link>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Mobile header */}
      {isMobile && (
        <header className="sticky top-0 z-50 bg-card border-b border-border p-3 flex items-center justify-between">
          <Link to="/admin" className="text-lg font-bold text-foreground">
            GIGGEN <span className="text-muted-foreground font-normal text-sm">Backstage</span>
          </Link>
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0 flex flex-col">
              <NavContent />
            </SheetContent>
          </Sheet>
        </header>
      )}

      {/* Desktop Sidebar */}
      {!isMobile && (
        <aside className="w-64 bg-card border-r border-border flex flex-col shrink-0">
          <NavContent />
        </aside>
      )}

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="p-4 md:p-8">
          <AdminErrorBoundary>
            <Outlet />
          </AdminErrorBoundary>
        </div>
      </main>
    </div>
  );
}
