import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PersonaSearchPicker } from "@/components/persona/PersonaSearchPicker";
import { usePersonaSearch, type PersonaOption } from "@/hooks/usePersonaSearch";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Search, Mail, UserPlus, Loader2, Music } from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ActorZoneKey } from "@/hooks/useEventActors";
import { ACTOR_ZONES } from "@/hooks/useEventActors";

interface AddActorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialZone: ActorZoneKey;
  existingParticipantIds: Set<string>;
  onAddPlatformUser: (kind: "persona" | "entity", id: string, zone: ActorZoneKey) => Promise<void>;
  onInviteByEmail: (email: string, name: string, zone: ActorZoneKey, message?: string) => Promise<void>;
  onAddOffline: (name: string, zone: ActorZoneKey, roleLabel?: string) => Promise<void>;
}

export function AddActorDialog({
  open,
  onOpenChange,
  initialZone,
  existingParticipantIds,
  onAddPlatformUser,
  onInviteByEmail,
  onAddOffline,
}: AddActorDialogProps) {
  const [tab, setTab] = useState<string>("search");
  const [zone, setZone] = useState<ActorZoneKey>(initialZone);

  // Search tab
  const [searchQuery, setSearchQuery] = useState("");
  const [searchTriggered, setSearchTriggered] = useState(false);
  const [entityMode, setEntityMode] = useState(false);
  const [selectedEntityId, setSelectedEntityId] = useState("");
  const [adding, setAdding] = useState(false);

  // Email tab
  const [emailName, setEmailName] = useState("");
  const [email, setEmail] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [sending, setSending] = useState(false);

  // Offline tab
  const [offlineName, setOfflineName] = useState("");
  const [offlineRole, setOfflineRole] = useState("");
  const [addingOffline, setAddingOffline] = useState(false);

  // Reset on zone change from initialZone
  const handleOpenChange = (o: boolean) => {
    if (o) {
      setZone(initialZone);
      setSearchQuery("");
      setSearchTriggered(false);
      setSelectedEntityId("");
      setEmailName("");
      setEmail("");
      setEmailMessage("");
      setOfflineName("");
      setOfflineRole("");
    }
    onOpenChange(o);
  };

  // Persona search
  const { data: personaResults = [], isLoading: searchLoading } = usePersonaSearch({
    query: searchQuery,
    mode: "all",
    enabled: searchTriggered && !!searchQuery.trim(),
  });

  // Entity search for lineup
  const { data: entities = [] } = useQuery({
    queryKey: ["actors-entities-search", searchQuery],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("entities")
        .select("id, name, slug, type")
        .in("type", ["solo", "band"])
        .eq("is_system", false)
        .ilike("name", `%${searchQuery.trim()}%`)
        .limit(20);
      if (error) throw error;
      return (data || []) as { id: string; name: string; slug: string; type: string }[];
    },
    enabled: entityMode && searchTriggered && searchQuery.trim().length >= 2,
  });

  const handleAddPersona = async (persona: PersonaOption) => {
    if (existingParticipantIds.has(persona.id)) {
      toast.error("Allerede lagt til");
      return;
    }
    setAdding(true);
    try {
      await onAddPlatformUser("persona", persona.id, zone);
      toast.success(`${persona.name} lagt til i ${ACTOR_ZONES.find(z => z.key === zone)?.label}`);
    } catch (e: any) {
      toast.error(e?.message || "Kunne ikke legge til");
    } finally {
      setAdding(false);
    }
  };

  const handleAddEntity = async () => {
    if (!selectedEntityId) return;
    if (existingParticipantIds.has(selectedEntityId)) {
      toast.error("Allerede lagt til");
      return;
    }
    setAdding(true);
    try {
      await onAddPlatformUser("entity", selectedEntityId, zone);
      toast.success("Lagt til");
      setSelectedEntityId("");
    } catch (e: any) {
      toast.error(e?.message || "Kunne ikke legge til");
    } finally {
      setAdding(false);
    }
  };

  const handleSendInvitation = async () => {
    if (!email.trim()) {
      toast.error("E-post er påkrevd");
      return;
    }
    setSending(true);
    try {
      await onInviteByEmail(email.trim(), emailName.trim(), zone, emailMessage.trim() || undefined);
      toast.success("Invitasjon sendt");
      setEmail("");
      setEmailName("");
      setEmailMessage("");
    } catch (e: any) {
      toast.error(e?.message || "Kunne ikke sende invitasjon");
    } finally {
      setSending(false);
    }
  };

  const handleAddOfflineActor = async () => {
    if (!offlineName.trim()) {
      toast.error("Navn er påkrevd");
      return;
    }
    setAddingOffline(true);
    try {
      await onAddOffline(offlineName.trim(), zone, offlineRole.trim() || undefined);
      toast.success(`${offlineName} lagt til`);
      setOfflineName("");
      setOfflineRole("");
    } catch (e: any) {
      toast.error(e?.message || "Kunne ikke legge til");
    } finally {
      setAddingOffline(false);
    }
  };

  const zoneLabel = ACTOR_ZONES.find(z => z.key === zone)?.label || zone;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">Legg til aktør</DialogTitle>
        </DialogHeader>

        {/* Zone selector */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Sone</Label>
          <div className="flex gap-1.5">
            {ACTOR_ZONES.map(z => (
              <Button
                key={z.key}
                variant={zone === z.key ? "default" : "outline"}
                size="sm"
                className="text-xs flex-1"
                onClick={() => setZone(z.key)}
              >
                {z.label}
              </Button>
            ))}
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab} className="mt-2">
          <TabsList className="w-full grid grid-cols-3 h-9">
            <TabsTrigger value="search" className="text-xs gap-1.5">
              <Search className="h-3.5 w-3.5" />
              Søk
            </TabsTrigger>
            <TabsTrigger value="email" className="text-xs gap-1.5">
              <Mail className="h-3.5 w-3.5" />
              E-post
            </TabsTrigger>
            <TabsTrigger value="offline" className="text-xs gap-1.5">
              <UserPlus className="h-3.5 w-3.5" />
              Offline
            </TabsTrigger>
          </TabsList>

          {/* ─── Tab A: Search platform ─── */}
          <TabsContent value="search" className="mt-3 space-y-3">
            {zone === "lineup" && (
              <div className="flex gap-2">
                <Button
                  variant={!entityMode ? "default" : "outline"}
                  size="sm"
                  className="text-xs"
                  onClick={() => setEntityMode(false)}
                >
                  Person
                </Button>
                <Button
                  variant={entityMode ? "default" : "outline"}
                  size="sm"
                  className="text-xs"
                  onClick={() => setEntityMode(true)}
                >
                  <Music className="h-3 w-3 mr-1" />
                  Prosjekt / Artist
                </Button>
              </div>
            )}

            {!entityMode ? (
              <PersonaSearchPicker
                personas={personaResults}
                isLoading={searchLoading}
                searchQuery={searchQuery}
                onSearchQueryChange={(v) => {
                  setSearchQuery(v);
                  if (!v.trim()) setSearchTriggered(false);
                }}
                onSelect={handleAddPersona}
                showSearchButton
                onSearchSubmit={() => setSearchTriggered(true)}
                placeholder="Søk etter person..."
                emptyMessage="Ingen profiler funnet"
                disabledIds={existingParticipantIds}
              />
            ) : (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    placeholder="Søk etter prosjekt..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      if (!e.target.value.trim()) setSearchTriggered(false);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") setSearchTriggered(true);
                    }}
                    className="text-base"
                  />
                  <Button variant="outline" onClick={() => setSearchTriggered(true)}>
                    Søk
                  </Button>
                </div>
                {entities.length > 0 && (
                  <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                    {entities.map(e => (
                      <button
                        key={e.id}
                        onClick={() => {
                          setSelectedEntityId(e.id);
                          handleAddEntity();
                        }}
                        disabled={existingParticipantIds.has(e.id)}
                        className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 text-left disabled:opacity-50"
                      >
                        <Music className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div>
                          <p className="text-sm font-medium">{e.name}</p>
                          <p className="text-[10px] text-muted-foreground capitalize">{e.type}</p>
                        </div>
                        {existingParticipantIds.has(e.id) && (
                          <span className="text-[10px] text-muted-foreground ml-auto">(lagt til)</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* ─── Tab B: Email invite ─── */}
          <TabsContent value="email" className="mt-3 space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Navn</Label>
              <Input
                value={emailName}
                onChange={(e) => setEmailName(e.target.value)}
                placeholder="Fullt navn"
                className="text-base"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">E-post</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="epost@eksempel.no"
                className="text-base"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Melding (valgfritt)</Label>
              <Textarea
                value={emailMessage}
                onChange={(e) => setEmailMessage(e.target.value)}
                placeholder="Personlig melding til mottaker..."
                rows={2}
                className="text-sm"
              />
            </div>
            <Button
              onClick={handleSendInvitation}
              disabled={!email.trim() || sending}
              className="w-full"
            >
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sender...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Send invitasjon til {zoneLabel}
                </>
              )}
            </Button>
          </TabsContent>

          {/* ─── Tab C: Offline ─── */}
          <TabsContent value="offline" className="mt-3 space-y-3">
            <p className="text-[11px] text-muted-foreground">
              Legg til en person uten konto. Personen får ingen systemtilgang.
            </p>
            <div className="space-y-1.5">
              <Label className="text-xs">Navn</Label>
              <Input
                value={offlineName}
                onChange={(e) => setOfflineName(e.target.value)}
                placeholder="Fullt navn"
                className="text-base"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Rolle / notat (valgfritt)</Label>
              <Input
                value={offlineRole}
                onChange={(e) => setOfflineRole(e.target.value)}
                placeholder="F.eks. Lydtekniker, Scenearbeider..."
                className="text-base"
              />
            </div>
            <Button
              onClick={handleAddOfflineActor}
              disabled={!offlineName.trim() || addingOffline}
              className="w-full"
            >
              {addingOffline ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Legger til...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Legg til i {zoneLabel}
                </>
              )}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
