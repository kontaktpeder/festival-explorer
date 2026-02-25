import { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { BottomNav } from "./BottomNav";

interface PageLayoutProps {
  children: ReactNode;
}

export function PageLayout({ children }: PageLayoutProps) {
  const location = useLocation();
  
  // Only show BottomNav on explore and search pages
  const showBottomNav = location.pathname === "/utforsk" || location.pathname === "/search";

  return (
    <div className="min-h-screen flex flex-col">
      <main className={`flex-1 ${showBottomNav ? "pb-20" : ""}`}>{children}</main>
      {showBottomNav && <BottomNav />}
    </div>
  );
}
