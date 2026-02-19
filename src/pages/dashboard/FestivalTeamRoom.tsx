import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FestivalParticipantsZoneEditor } from "@/components/admin/FestivalParticipantsZoneEditor";
import { ContextualInviteModal, type ContextualInviteTarget } from "@/components/invite/ContextualInviteModal";
import { usePlatformEntity } from "@/hooks/useEntityTypes";
import gIcon from "@/assets/giggen-g-icon-red.png";
import { LoadingState } from "@/components/ui/LoadingState";

export default function FestivalTeamRoom() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [inviteOpen, setInviteOpen] = useState(false);

  const { data: festival, isLoading } = useQuery({
    queryKey: ["festival-room", id],
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

  const { data: platformEntity } = usePlatformEntity();

  const { data: permissions } = useQuery({
    queryKey: ["festival-room-permissions", id],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data: isAdmin } = await supabase.rpc("is_admin");
      if (isAdmin) return { can_edit_festival: true };
      const { data: personas } = await supabase
        .from("personas")
        .select("id")
        .eq("user_id", user.id);
      if (!personas?.length) return null;
      const { data: fp } = await supabase
        .from("festival_participants")
        .select("can_edit_festival")
        .eq("festival_id", id!)
        .eq("participant_kind", "persona")
        .in("participant_id", personas.map((p) => p.id));
      return { can_edit_festival: fp?.some((f) => f.can_edit_festival) ?? false };
    },
    enabled: !!id,
  });

  if (isLoading) return <LoadingState message="Laster..." />;
  if (!festival || !id) return <p className="p-8 text-muted-foreground">Festival ikke funnet.</p>;

  const canEdit = permissions?.can_edit_festival;

  const inviteTarget: ContextualInviteTarget | null = platformEntity
    ? {
        entityId: platformEntity.id,
        label: festival.name,
        festivalId: id,
        newUserInviteEntityId: platformEntity.id,
      }
    : null;

  return (
    <div className="min-h-[100svh] bg-background">
      <header
        className="sticky top-0 z-50 bg-background/60 backdrop-blur-xl border-b border-border/20"
        style={{ paddingTop: "max(env(safe-area-inset-top, 0px), 0px)" }}
      >
        <div className="w-full px-4 sm:px-8 lg:px-12 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(`/dashboard/festival/${id}`)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <span className="text-sm font-semibold tracking-tight text-foreground">
              BACKSTAGE · Team
            </span>
          </div>
          <div className="flex items-center gap-2">
            {canEdit && inviteTarget && (
              <Button size="sm" onClick={() => setInviteOpen(true)} className="gap-1.5">
                <UserPlus className="h-3.5 w-3.5" />
                Inviter
              </Button>
            )}
            <img src={gIcon} alt="" className="h-8 w-8 object-contain" />
          </div>
        </div>
      </header>

      <main className="w-full px-4 sm:px-8 lg:px-12 py-5 sm:py-6">
        <Tabs defaultValue="host" className="space-y-4">
          <TabsList>
            <TabsTrigger value="host">Arrangør</TabsTrigger>
            <TabsTrigger value="backstage">Bak scenen</TabsTrigger>
          </TabsList>
          <TabsContent value="host">
            <FestivalParticipantsZoneEditor festivalId={id} zone="host" />
          </TabsContent>
          <TabsContent value="backstage">
            <FestivalParticipantsZoneEditor festivalId={id} zone="backstage" />
          </TabsContent>
        </Tabs>
      </main>

      {inviteTarget && (
        <ContextualInviteModal
          open={inviteOpen}
          onOpenChange={setInviteOpen}
          target={inviteTarget}
          onSuccess={() => setInviteOpen(false)}
        />
      )}
    </div>
  );
}
