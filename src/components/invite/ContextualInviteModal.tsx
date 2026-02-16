import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateInvitation } from "@/hooks/useInvitations";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getPublicUrl } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  UserPlus,
  Mail,
  Users,
  ArrowLeft,
  Copy,
  Check,
  Loader2,
} from "lucide-react";
import type { AccessLevel } from "@/types/database";
import { InviteExistingUserStep } from "@/components/invite/InviteExistingUserStep";

const ACCESS_OPTIONS: { value: Exclude<AccessLevel, "owner">; label: string }[] = [
  { value: "admin", label: "Administrer" },
  { value: "editor", label: "Rediger" },
  { value: "viewer", label: "Se" },
];

type InviteStep = "choose" | "new" | "existing";

export interface ContextualInviteTarget {
  entityId: string;
  label: string;
  eventId?: string | null;
  festivalId?: string | null;
  /** For festival: entityId to use for email invitations (e.g. platform entity) */
  newUserInviteEntityId?: string | null;
}

interface ContextualInviteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: ContextualInviteTarget;
  accessLevel?: Exclude<AccessLevel, "owner">;
  onSuccess?: () => void;
}

export function ContextualInviteModal({
  open,
  onOpenChange,
  target,
  accessLevel: initialAccess = "editor",
  onSuccess,
}: ContextualInviteModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createInvitation = useCreateInvitation();
  const [step, setStep] = useState<InviteStep>("choose");

  const isFestival = !!target.festivalId;

  // New user state
  const [emails, setEmails] = useState<string[]>([""]);
  const [generatedLinks, setGeneratedLinks] = useState<{ email: string; link: string }[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [accessLevel, setAccessLevel] = useState<Exclude<AccessLevel, "owner">>(initialAccess);

  // (existing user state removed – handled by InviteExistingUserStep)

  const { data: currentUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
    enabled: open,
  });

  // For entity-based invitations, check existing team members
  const { data: existingTeamUserIds } = useQuery({
    queryKey: ["entity-team-user-ids", target.entityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("entity_team")
        .select("user_id")
        .eq("entity_id", target.entityId)
        .is("left_at", null);
      if (error) throw error;
      return (data || []).map((r: { user_id: string }) => r.user_id);
    },
    enabled: open && !!target.entityId && !isFestival,
  });

  // For festival invitations, check existing festival participants
  const { data: existingFestivalPersonaIds } = useQuery({
    queryKey: ["festival-participant-persona-ids", target.festivalId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("festival_participants")
        .select("participant_id")
        .eq("festival_id", target.festivalId!)
        .eq("participant_kind", "persona");
      if (error) throw error;
      return (data || []).map((r: { participant_id: string }) => r.participant_id);
    },
    enabled: open && isFestival,
  });

  const excludedUserIds = [...(existingTeamUserIds || [])];
  const excludedPersonaIds = existingFestivalPersonaIds || [];

  const addEmailRow = () => setEmails((prev) => [...prev, ""]);
  const setEmailAt = (index: number, value: string) => {
    setEmails((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };
  const removeEmailRow = (index: number) => {
    if (emails.length <= 1) return;
    setEmails((prev) => prev.filter((_, i) => i !== index));
  };

  const handleGenerateLinks = async () => {
    const validEmails = emails.map((e) => e.trim()).filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
    if (validEmails.length === 0) {
      toast({ title: "Skriv inn minst én gyldig e-post", variant: "destructive" });
      return;
    }
    const links: { email: string; link: string }[] = [];
    const publishedUrl = getPublicUrl();
    try {
      const entityIdForInvite = isFestival && target.newUserInviteEntityId
        ? target.newUserInviteEntityId
        : target.entityId;
      for (const emailAddr of validEmails) {
        const created = await createInvitation.mutateAsync({
          entityId: entityIdForInvite,
          email: emailAddr,
          access: accessLevel,
          roleLabels: [],
          invitedBy: currentUser!.id,
          festivalId: isFestival && target.festivalId ? target.festivalId : undefined,
        });
        const token = (created as { token?: string | null })?.token;
        const link = token
          ? `${publishedUrl}/i?t=${encodeURIComponent(token)}`
          : `${publishedUrl}/accept-invitation?email=${encodeURIComponent(emailAddr)}&entity_id=${entityIdForInvite}`;
        links.push({ email: emailAddr, link });
      }
      setGeneratedLinks(links);
      toast({ title: `${links.length} lenke(r) generert` });
    } catch (e: unknown) {
      toast({ title: "Kunne ikke opprette invitasjon", description: String(e), variant: "destructive" });
    }
  };

  const handleCopyLink = async (link: string, index: number) => {
    try {
      await navigator.clipboard.writeText(link);
      setCopiedIndex(index);
      toast({ title: "Lenke kopiert" });
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch {
      toast({ title: "Kunne ikke kopiere", variant: "destructive" });
    }
  };

  const resetAndClose = () => {
    setStep("choose");
    setEmails([""]);
    setGeneratedLinks([]);
    setCopiedIndex(null);
  };

  const handleOpenChange = (o: boolean) => {
    if (!o) resetAndClose();
    onOpenChange(o);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Inviter til {target.label}
          </DialogTitle>
        <DialogDescription>
            {isFestival
              ? "Inviter ny bruker via e-post (plattformlenke), eller legg til en eksisterende bruker i festival-teamet."
              : "Inviter ny bruker via e-post eller en som allerede er på GIGGEN."}
          </DialogDescription>
        </DialogHeader>

        {step === "choose" && (
          <div className="grid grid-cols-2 gap-3 pt-2">
            <Button
              variant="outline"
              className="flex flex-col items-center gap-2 h-auto py-6"
              onClick={() => setStep("new")}
              disabled={isFestival && !target.newUserInviteEntityId}
            >
              <Mail className="h-6 w-6" />
              <span className="font-medium">Ny bruker</span>
              <span className="text-xs text-muted-foreground">
                {isFestival ? "Send plattformlenke på e-post" : "Send lenke på e-post"}
              </span>
            </Button>
            <Button
              variant="outline"
              className="flex flex-col items-center gap-2 h-auto py-6"
              onClick={() => setStep("existing")}
            >
              <Users className="h-6 w-6" />
              <span className="font-medium">Eksisterende bruker</span>
              <span className="text-xs text-muted-foreground">
                {isFestival ? "Legg til i festival-teamet" : "Får melding i dashboard"}
              </span>
            </Button>
          </div>
        )}

        {step === "new" && (
          <div className="space-y-4 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setStep("choose")} className="gap-1 -ml-2">
              <ArrowLeft className="h-4 w-4" />
              Tilbake
            </Button>

            {isFestival && (
              <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded-md">
                Du genererer en plattformlenke. Når personen har registrert seg og opprettet profil, kan du legge dem til i festival-teamet under «Eksisterende bruker».
              </p>
            )}

            <div className="space-y-2">
              <Label>Tilgangsnivå</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={accessLevel}
                onChange={(e) => setAccessLevel(e.target.value as Exclude<AccessLevel, "owner">)}
              >
                {ACCESS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            {generatedLinks.length === 0 ? (
              <>
                <div className="space-y-2">
                  <Label>E-postadresse(r)</Label>
                  {emails.map((emailVal, i) => (
                    <div key={i} className="flex gap-2">
                      <Input
                        type="email"
                        placeholder="navn@example.com"
                        value={emailVal}
                        onChange={(e) => setEmailAt(i, e.target.value)}
                      />
                      {emails.length > 1 && (
                        <Button variant="ghost" size="icon" onClick={() => removeEmailRow(i)}>
                          ×
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button variant="ghost" size="sm" onClick={addEmailRow}>
                    + Legg til flere
                  </Button>
                </div>
                <Button onClick={handleGenerateLinks} disabled={createInvitation.isPending} className="w-full gap-2">
                  {createInvitation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                  Generer invitasjonslenke(r)
                </Button>
              </>
            ) : (
              <div className="space-y-3">
                {generatedLinks.map(({ email: linkEmail, link }, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
                    <span className="text-xs text-muted-foreground truncate flex-1">{linkEmail}</span>
                    <Button variant="ghost" size="icon" onClick={() => handleCopyLink(link, i)}>
                      {copiedIndex === i ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                ))}
                <p className="text-xs text-muted-foreground">
                  Send lenken til {generatedLinks.map((l) => l.email).join(", ")}
                </p>
                <Button variant="secondary" className="w-full" onClick={() => handleOpenChange(false)}>
                  Ferdig
                </Button>
              </div>
            )}
          </div>
        )}

        {step === "existing" && (
          <div className="space-y-4 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setStep("choose")} className="gap-1 -ml-2">
              <ArrowLeft className="h-4 w-4" />
              Tilbake
            </Button>

            {!isFestival && (
              <div className="space-y-2">
                <Label>Tilgangsnivå</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={accessLevel}
                  onChange={(e) => setAccessLevel(e.target.value as Exclude<AccessLevel, "owner">)}
                >
                  {ACCESS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            )}
            {isFestival && (
              <p className="text-xs text-muted-foreground">
                Personen legges til i backstage-teamet. Tillatelser kan justeres etterpå.
              </p>
            )}

            <InviteExistingUserStep
              entityId={target.entityId}
              isFestival={isFestival}
              festivalId={target.festivalId}
              excludedUserIds={excludedUserIds}
              excludedPersonaIds={excludedPersonaIds}
              accessLevel={accessLevel}
              onSent={onSuccess}
              submitLabel="Send"
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
