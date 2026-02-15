import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BackstageShell } from "@/components/layout/BackstageShell";
import { LoadingState } from "@/components/ui/LoadingState";
import AdminSections from "@/pages/admin/AdminSections";

export default function FestivalSettingsRoom() {
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
      title="Innstillinger"
      subtitle={festival?.name}
      backTo={`/dashboard/festival/${id}`}
      externalLink={
        festival?.slug
          ? { to: `/festival/${festival.slug}`, label: "Se live" }
          : undefined
      }
    >
      <AdminSections />
    </BackstageShell>
  );
}
