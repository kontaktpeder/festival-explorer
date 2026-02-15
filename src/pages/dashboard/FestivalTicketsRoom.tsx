import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BackstageShell } from "@/components/layout/BackstageShell";
import { LoadingState } from "@/components/ui/LoadingState";
import AdminTicketsDashboard from "@/pages/admin/AdminTicketsDashboard";

export default function FestivalTicketsRoom() {
  const { id } = useParams<{ id: string }>();

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
      <div className="min-h-[100svh] bg-background flex items-center justify-center">
        <LoadingState message="Laster..." />
      </div>
    );
  }

  return (
    <BackstageShell
      title="Billettoversikt"
      subtitle={festival?.name}
      backTo={`/dashboard/festival/${id}`}
    >
      <AdminTicketsDashboard />
    </BackstageShell>
  );
}
