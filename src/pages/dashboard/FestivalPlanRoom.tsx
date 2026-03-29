import { useParams, Link, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FestivalRunSheet } from "@/components/dashboard/FestivalRunSheet";
import { LoadingState } from "@/components/ui/LoadingState";
import { FocusThemeProvider } from "@/contexts/FocusThemeContext";
import { ArrowLeft } from "lucide-react";

const NAV_ITEMS = [
  { label: "Plan", suffix: "/plan" },
  { label: "Produksjon", suffix: "/run-sheet" },
  { label: "Live", suffix: "/live" },
] as const;

export default function FestivalPlanRoom() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const base = `/dashboard/festival/${id}`;

  const { data: festival, isLoading } = useQuery({
    queryKey: ["festival-shell", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("festivals")
        .select("id, name, slug")
        .eq("id", id!)
        .single();
      return data;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="finance-theme min-h-[100svh] flex items-center justify-center">
        <LoadingState message="Laster plan..." />
      </div>
    );
  }

  return (
    <FocusThemeProvider value="light">
    <div className="finance-theme min-h-[100svh]">
      <div className="max-w-[1400px] mx-auto px-3 py-4 md:px-6 md:py-8 space-y-6">
        <Link
          to={base}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Tilbake til festivalrommet</span>
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
              Plan
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5 uppercase tracking-wider">
              {festival?.name} · fokusmodus
            </p>
          </div>

          {/* Segmented nav */}
          <div className="flex items-center gap-1 bg-muted/40 rounded-lg p-1">
            {NAV_ITEMS.map((item) => {
              const to = `${base}${item.suffix}`;
              const isActive = location.pathname === to;
              return (
                <Link
                  key={item.suffix}
                  to={to}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    isActive
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>

        <FestivalRunSheet
          festivalId={id!}
          canOperate={false}
        />
      </div>
    </div>
    </FocusThemeProvider>
  );
}
