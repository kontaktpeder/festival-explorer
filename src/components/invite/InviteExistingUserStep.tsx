import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCreateInvitation } from "@/hooks/useInvitations";
import { usePersonaSearch, type PersonaOption } from "@/hooks/usePersonaSearch";
import { PersonaSearchPicker } from "@/components/persona/PersonaSearchPicker";
import type { AccessLevel } from "@/types/database";

interface InviteExistingUserStepProps {
  entityId: string;
  isFestival?: boolean;
  festivalId?: string | null;
  excludedUserIds: string[];
  /** For festivals: persona IDs already in the team */
  excludedPersonaIds?: string[];
  accessLevel: Exclude<AccessLevel, "owner">;
  onSent?: () => void;
  submitLabel?: string;
}

export function InviteExistingUserStep({
  entityId,
  isFestival,
  festivalId,
  excludedUserIds,
  excludedPersonaIds = [],
  accessLevel,
  onSent,
  submitLabel = "Inviter",
}: InviteExistingUserStepProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createInvitation = useCreateInvitation();
  const [searchQuery, setSearchQuery] = useState("");
  const [sendingIds, setSendingIds] = useState<Set<string>>(new Set());

  const { data: currentUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  const { data: searchResults = [], isLoading: searchLoading } = usePersonaSearch({
    query: searchQuery,
    mode: "public",
    excludeUserIds: excludedUserIds,
  });

  const addFestivalParticipant = useMutation({
    mutationFn: async ({ personaId }: { personaId: string }) => {
      const { error } = await supabase
        .from("festival_participants")
        .insert({
          festival_id: festivalId!,
          participant_id: personaId,
          participant_kind: "persona",
          zone: "backstage",
          role_label: null,
          is_public: false,
          can_edit_festival: false,
          can_edit_events: false,
          can_access_media: true,
          can_scan_tickets: false,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      if (festivalId) {
        queryClient.invalidateQueries({ queryKey: ["festival-participants", festivalId] });
        queryClient.invalidateQueries({ queryKey: ["admin-festival-events", festivalId] });
      }
    },
  });

  const handleSend = async (persona: PersonaOption) => {
    if (!currentUser) return;
    setSendingIds((prev) => new Set(prev).add(persona.id));
    try {
      if (isFestival && festivalId) {
        if (excludedPersonaIds.includes(persona.id)) {
          toast({ title: `${persona.name} er allerede med i festival-teamet`, variant: "destructive" });
          return;
        }
        await addFestivalParticipant.mutateAsync({ personaId: persona.id });
        toast({ title: `${persona.name} lagt til i festival-teamet` });
      } else {
        await createInvitation.mutateAsync({
          entityId,
          access: accessLevel,
          invitedBy: currentUser.id,
          invitedUserId: persona.user_id!,
          invitedPersonaId: persona.id,
        });
        toast({ title: `Invitasjon sendt til ${persona.name}` });
      }
      onSent?.();
    } catch (e: unknown) {
      toast({ title: "Kunne ikke sende invitasjon", description: String(e), variant: "destructive" });
    } finally {
      setSendingIds((prev) => {
        const next = new Set(prev);
        next.delete(persona.id);
        return next;
      });
    }
  };

  const disabledIds = new Set(excludedPersonaIds);

  return (
    <PersonaSearchPicker
      personas={searchResults}
      isLoading={searchLoading}
      searchQuery={searchQuery}
      onSearchQueryChange={setSearchQuery}
      placeholder="Søk etter navn..."
      emptyMessage="Ingen profiler funnet."
      onAction={handleSend}
      actionLabel={submitLabel}
      actionPendingIds={sendingIds}
      disabledIds={disabledIds}
    />
  );
}
