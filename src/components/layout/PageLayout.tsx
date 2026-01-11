import { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { BottomNav } from "./BottomNav";

interface PageLayoutProps {
  children: ReactNode;
}

export function PageLayout({ children }: PageLayoutProps) {
  const location = useLocation();
  const isFestivalRoute = location.pathname.startsWith("/festival");

  return (
    <div className="min-h-screen flex flex-col">
      <main className={`flex-1 ${!isFestivalRoute ? "pb-20" : ""}`}>{children}</main>
      {!isFestivalRoute && <BottomNav />}
    </div>
  );
}
