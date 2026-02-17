import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Save,
  Users,
  Check,
  ChevronsUpDown,
  Plus,
  ExternalLink,
} from "lucide-react";
import { EventParticipantsZoneEditor } from "@/components/admin/EventParticipantsZoneEditor";
import { EventProgramSlotsEditor } from "@/components/dashboard/EventProgramSlotsEditor";
import { EventInvitationsEditor } from "@/components/dashboard/EventInvitationsEditor";
import { InlineMediaPickerWithCrop } from "@/components/admin/InlineMediaPickerWithCrop";
import { LoadingState } from "@/components/ui/LoadingState";
import { getAuthenticatedUser } from "@/lib/admin-helpers";
import { generateSlug, cn, isoToLocalDatetimeString } from "@/lib/utils";
import type { ImageSettings } from "@/types/database";
import { parseImageSettings } from "@/types/database";
import { useMyEntities } from "@/hooks/useEntity";
import { inferEntityKind, getEventHostId } from "@/lib/role-model-helpers";

export default function EventRoomPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const isNew = id === "new";

  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    description: "",
    start_at: "",
    end_at: "",
    venue_id: "",
    city: "",
    hero_image_url: "",
    status: "draft" as "draft" | "submitted" | "published",
    age_limit: "",
    cloakroom_available: null as boolean | null,
  });
  const [heroImageSettings, setHeroImageSettings] = useState<ImageSettings | null>(null);
  const [venuePickerOpen, setVenuePickerOpen] = useState(false);
  const [isTicketAdmin, setIsTicketAdmin] = useState(false);
  

  const { data: myEntities } = useMyEntities();

  const { data: event, isLoading } = useQuery({
    queryKey: ["admin-event", id],
    queryFn: async () => {
      if (isNew) return null;
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !isNew,
    retry: 1,
  });

  useEffect(() => {
    const check = async () => {
      const { data } = await supabase.rpc("is_ticket_admin");
      setIsTicketAdmin(!!data);
    };
    void check();
  }, []);

  const hostEntities = (myEntities ?? []).filter((e) => inferEntityKind(e) === "host");
  const eventHostId = event ? getEventHostId(event) : null;

  const { data: canEditEventRpc } = useQuery({
    queryKey: ["can-edit-event", id],
    queryFn: async () => {
      const { data } = await supabase.rpc("can_edit_event", { p_event_id: id });
      return data ?? false;
    },
    enabled: !!id && !isNew,
  });

  const canEdit =
    isNew ||
    isTicketAdmin ||
    canEditEventRpc === true ||
    (!!eventHostId && hostEntities.some((h) => h.id === eventHostId));

  // Festival context
  const { data: festivalContext } = useQuery({
    queryKey: ["event-festival-context", id],
    enabled: !!event && !isNew,
    queryFn: async () => {
      const { data } = await supabase
        .from("festival_events")
        .select("festival_id, festival:festivals(id, slug, name)")
        .eq("event_id", event!.id)
        .maybeSingle();
      return data;
    },
  });

  // Festival team (inherited)
  const { data: festivalTeam } = useQuery({
    queryKey: ["admin-event-festival-team", id],
    enabled: !!event && !isNew,
    queryFn: async () => {
      const { data: festivalEvent } = await supabase
        .from("festival_events")
        .select("festival_id, festival:festivals(slug, name)")
        .eq("event_id", event!.id)
        .maybeSingle();
      if (!festivalEvent?.festival_id) return null;

      const { data: festivalParticipants } = await supabase
        .from("festival_participants")
        .select("*")
        .eq("festival_id", festivalEvent.festival_id)
        .in("zone", ["backstage", "host"])
        .order("zone")
        .order("sort_order");

      if (!festivalParticipants || festivalParticipants.length === 0) {
        return { festival: festivalEvent.festival, backstage: [], hostRoles: [] };
      }

      const personaIds = festivalParticipants
        .filter((p) => p.participant_kind === "persona")
        .map((p) => p.participant_id);
      const entityIds = festivalParticipants
        .filter((p) => p.participant_kind !== "persona")
        .map((p) => p.participant_id);

      const [personasRes, entitiesRes] = await Promise.all([
        personaIds.length
          ? supabase.from("personas").select("id, name, avatar_url, slug, is_public").in("id", personaIds)
          : Promise.resolve({ data: [] as any[] }),
        entityIds.length
          ? supabase.from("entities").select("id, name, slug, type, hero_image_url, is_published").in("id", entityIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      const personaMap = new Map((personasRes.data || []).map((p: any) => [p.id, p]));
      const entityMap = new Map((entitiesRes.data || []).map((e: any) => [e.id, e]));

      const backstage: any[] = [];
      const hostRoles: any[] = [];

      festivalParticipants.forEach((p) => {
        const resolved =
          p.participant_kind === "persona"
            ? personaMap.get(p.participant_id)
            : entityMap.get(p.participant_id);
        if (!resolved) return;
        const item = {
          participant_kind: p.participant_kind,
          participant_id: p.participant_id,
          entity: p.participant_kind !== "persona" ? resolved : null,
          persona: p.participant_kind === "persona" ? resolved : null,
          role_label: p.role_label,
        };
        if (p.zone === "backstage") backstage.push(item);
        else if (p.zone === "host") hostRoles.push(item);
      });

      return { festival: festivalEvent.festival, backstage, hostRoles };
    },
  });

  const { data: venues } = useQuery({
    queryKey: ["admin-venues-list"],
    queryFn: async () => {
      const { data } = await supabase.from("venues").select("id, name, city").order("name");
      return data || [];
    },
  });

  useEffect(() => {
    if (event) {
      setFormData({
        title: event.title || "",
        slug: event.slug || "",
        description: event.description || "",
        start_at: isoToLocalDatetimeString(event.start_at),
        end_at: isoToLocalDatetimeString(event.end_at),
        venue_id: event.venue_id || "",
        city: event.city || "",
        hero_image_url: event.hero_image_url || "",
        status: event.status || "draft",
        age_limit: (event as any).age_limit ?? "",
        cloakroom_available: (event as any).cloakroom_available ?? null,
      });
      setHeroImageSettings(parseImageSettings(event.hero_image_settings) || null);
    }
  }, [event]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const user = await getAuthenticatedUser();
      const payload = {
        ...formData,
        start_at: formData.start_at ? new Date(formData.start_at).toISOString() : new Date().toISOString(),
        end_at: formData.end_at ? new Date(formData.end_at).toISOString() : null,
        venue_id: formData.venue_id || null,
        hero_image_url: formData.hero_image_url || null,
        hero_image_settings: heroImageSettings,
        city: formData.city || null,
        age_limit: formData.age_limit?.trim() || null,
        cloakroom_available: formData.cloakroom_available,
      };

      if (isNew) {
        const { data, error } = await supabase
          .from("events")
          .insert({ ...payload, created_by: user.id } as never)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { error } = await supabase
          .from("events")
          .update(payload as never)
          .eq("id", id);
        if (error) throw error;
        return null;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-events"] });
      queryClient.invalidateQueries({ queryKey: ["admin-event", id] });
      toast({ title: isNew ? "Event opprettet" : "Event oppdatert" });
      if (isNew && data) {
        navigate(`/event-room/${data.id}`);
      } else if (event?.venue_id) {
        navigate(`/dashboard/venue/${event.venue_id}`);
      } else if (festivalContext?.festival_id) {
        navigate(`/dashboard/festival/${festivalContext.festival_id}`);
      } else {
        navigate(-1);
      }
    },
    onError: (error: Error) => {
      toast({ title: "Feil", description: error.message, variant: "destructive" });
    },
  });

  const handleTitleChange = (title: string) => {
    setFormData((prev) => ({ ...prev, title, slug: generateSlug(title) }));
  };

  if (isLoading) {
    return (
      <div className="min-h-[100svh] flex items-center justify-center bg-background">
        <LoadingState message="Laster event..." />
      </div>
    );
  }

  if (!isNew && event && !canEdit) {
    return (
      <div className="min-h-[100svh] bg-background">
        <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border/30 px-4 py-3" style={{ paddingTop: "max(env(safe-area-inset-top, 0px), 0.75rem)" }}>
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <span className="text-sm font-semibold text-foreground">Event</span>
            <div className="w-5" />
          </div>
        </header>
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <p className="text-muted-foreground">Du har ikke tilgang til å redigere dette eventet.</p>
          {event.slug && (
            <Button asChild variant="outline" className="mt-4">
              <Link to={`/event/${event.slug}`}>Se publikumsvisning</Link>
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100svh] bg-background">
      {/* Header */}
      <header
        className="sticky top-0 z-50 bg-background/60 backdrop-blur-xl border-b border-border/20"
        style={{ paddingTop: "max(env(safe-area-inset-top, 0px), 0px)" }}
      >
        <div className="w-full px-4 sm:px-8 lg:px-12 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <span className="text-sm font-semibold tracking-tight text-foreground">
              BACKSTAGE
            </span>
            {festivalContext?.festival && (
              <span className="text-[10px] text-muted-foreground/60 hidden sm:inline">
                / {(festivalContext.festival as any).name}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {!isNew && event?.slug && (
              <Button asChild variant="outline" size="sm" className="text-xs border-border/30 hover:border-accent/40">
                <Link to={`/event/${event.slug}`} target="_blank">
                  <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                  Se live
                </Link>
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="h-8 px-3 text-xs font-semibold"
            >
              <Save className="h-3.5 w-3.5 mr-1.5" />
              {saveMutation.isPending ? "Lagrer..." : "Lagre"}
            </Button>
          </div>
        </div>
      </header>

      {/* Hero section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/8 via-background to-accent-warm/5" />
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-accent/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/4" />
        <div className="relative w-full px-4 sm:px-8 lg:px-12 py-6 sm:py-8">
          <div className="max-w-5xl">
            <div className="flex items-center gap-3 mb-2">
              <Badge
                variant={formData.status === "published" ? "default" : "secondary"}
                className="text-[10px] uppercase tracking-widest"
              >
                {formData.status === "published" ? "Publisert" : "Utkast"}
              </Badge>
              <Select
                value={formData.status}
                onValueChange={(v: "draft" | "published") => setFormData((prev) => ({ ...prev, status: v }))}
              >
                <SelectTrigger className="h-6 w-auto text-[10px] border-none bg-transparent shadow-none px-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Utkast</SelectItem>
                  <SelectItem value="published">Publisert</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Input
              value={formData.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Tittel"
              className="border-none bg-transparent text-3xl sm:text-4xl lg:text-5xl font-bold shadow-none px-0 h-auto py-1 placeholder:text-muted-foreground/30 focus-visible:ring-0 tracking-tight"
              required
            />
            <p className="text-[10px] text-muted-foreground/40 font-mono mt-1">
              /event/{formData.slug || "..."}
            </p>
          </div>
        </div>
      </section>

      {/* Content */}
      <main
        className="w-full px-4 sm:px-8 lg:px-12 py-5 sm:py-6 pb-[max(2rem,env(safe-area-inset-bottom))]"
      >
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-6 lg:gap-10">
          {/* Left column: form fields */}
          <div className="space-y-5">
            {/* Description */}
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Beskrivelse..."
              className="border-none bg-transparent shadow-none px-0 min-h-[70px] resize-none placeholder:text-muted-foreground/40 focus-visible:ring-0"
              rows={3}
            />

            {/* Compact info grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-3">
              <div className="space-y-1">
                <Label className="text-[10px] uppercase tracking-widest text-muted-foreground/50">Start</Label>
                <Input
                  type="datetime-local"
                  value={formData.start_at}
                  onChange={(e) => setFormData((prev) => ({ ...prev, start_at: e.target.value }))}
                  className="h-8 text-xs bg-muted/20 border-border/20"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase tracking-widest text-muted-foreground/50">Slutt</Label>
                <Input
                  type="datetime-local"
                  value={formData.end_at}
                  onChange={(e) => setFormData((prev) => ({ ...prev, end_at: e.target.value }))}
                  className="h-8 text-xs bg-muted/20 border-border/20"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase tracking-widest text-muted-foreground/50">Venue</Label>
                <Popover open={venuePickerOpen} onOpenChange={setVenuePickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between font-normal h-8 text-xs bg-muted/20 border-border/20"
                    >
                      <span className="truncate">
                        {formData.venue_id
                          ? venues?.find((v) => v.id === formData.venue_id)?.name
                          : "Velg..."}
                      </span>
                      <ChevronsUpDown className="ml-1 h-3 w-3 opacity-40 shrink-0" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Søk etter venue..." />
                      <CommandList>
                        <CommandEmpty>Ingen venue funnet.</CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            value="__none__"
                            onSelect={() => {
                              setFormData((prev) => ({ ...prev, venue_id: "" }));
                              setVenuePickerOpen(false);
                            }}
                          >
                            <Check className={cn("mr-2 h-3.5 w-3.5", !formData.venue_id ? "opacity-100" : "opacity-0")} />
                            Ingen venue
                          </CommandItem>
                          {venues?.map((venue) => (
                            <CommandItem
                              key={venue.id}
                              value={venue.name}
                              onSelect={() => {
                                setFormData((prev) => ({ ...prev, venue_id: venue.id }));
                                setVenuePickerOpen(false);
                              }}
                            >
                              <Check className={cn("mr-2 h-3.5 w-3.5", formData.venue_id === venue.id ? "opacity-100" : "opacity-0")} />
                              {venue.name}
                              {venue.city && <span className="ml-2 text-muted-foreground text-xs">({venue.city})</span>}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase tracking-widest text-muted-foreground/50">By</Label>
                <Input
                  value={formData.city}
                  onChange={(e) => setFormData((prev) => ({ ...prev, city: e.target.value }))}
                  placeholder="Oslo"
                  className="h-8 text-xs bg-muted/20 border-border/20"
                />
              </div>
            </div>

            {/* Secondary row: age, cloakroom, hero image */}
            <div className="flex flex-wrap items-end gap-x-5 gap-y-3">
              <div className="space-y-1 w-28">
                <Label className="text-[10px] uppercase tracking-widest text-muted-foreground/50">Alder</Label>
                <Input
                  value={formData.age_limit}
                  onChange={(e) => setFormData((prev) => ({ ...prev, age_limit: e.target.value }))}
                  placeholder="18+"
                  className="h-8 text-xs bg-muted/20 border-border/20"
                />
              </div>
              <div className="flex items-center gap-2 pb-1">
                <input
                  type="checkbox"
                  id="cloakroom_available"
                  checked={formData.cloakroom_available === true}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      cloakroom_available: e.target.checked ? true : null,
                    }))
                  }
                  className="h-3.5 w-3.5 rounded border-border"
                />
                <Label htmlFor="cloakroom_available" className="text-xs font-normal cursor-pointer text-muted-foreground">
                  Garderobe
                </Label>
              </div>
              <div className="flex items-center gap-2 pb-1 ml-auto">
                {formData.hero_image_url && (
                  <img
                    src={formData.hero_image_url}
                    alt="Hero"
                    className="h-8 w-12 rounded object-cover border border-border/20"
                  />
                )}
                <InlineMediaPickerWithCrop
                  value={formData.hero_image_url}
                  imageSettings={heroImageSettings}
                  onChange={(url) => setFormData((prev) => ({ ...prev, hero_image_url: url }))}
                  onSettingsChange={setHeroImageSettings}
                  cropMode="hero"
                  placeholder="Hero-bilde"
                  showAllForAdmin
                  useNaturalAspect
                  hidePreview
                />
              </div>
            </div>
          </div>

          {/* Right column: program + participants */}
          <div className="space-y-6">
            {/* Event invitations */}
            {!isNew && id && (
              <EventInvitationsEditor eventId={id} canEdit={canEdit} />
            )}

            {/* Program slots */}
            {!isNew && id && (
              <EventProgramSlotsEditor eventId={id} canEdit={canEdit} eventStartAt={event?.start_at} />
            )}

            {/* Medvirkende */}
            {!isNew && id && (
              <div className="space-y-5 pt-4 border-t border-border/10">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground/50" />
                  <h2 className="text-sm font-semibold tracking-tight text-foreground">
                    Medvirkende
                  </h2>
                </div>
                <Tabs defaultValue="on_stage">
                  <TabsList className="w-full grid grid-cols-3 h-8 bg-muted/20">
                    <TabsTrigger value="on_stage" className="text-[11px] data-[state=active]:bg-background">På scenen</TabsTrigger>
                    <TabsTrigger value="backstage" className="text-[11px] data-[state=active]:bg-background">Bak scenen</TabsTrigger>
                    <TabsTrigger value="host" className="text-[11px] data-[state=active]:bg-background">Arrangør</TabsTrigger>
                  </TabsList>
                  <TabsContent value="on_stage" className="mt-3">
                    <EventParticipantsZoneEditor eventId={id} zone="on_stage" />
                  </TabsContent>
                  <TabsContent value="backstage" className="mt-3">
                    <EventParticipantsZoneEditor eventId={id} zone="backstage" />
                  </TabsContent>
                  <TabsContent value="host" className="mt-3">
                    <EventParticipantsZoneEditor eventId={id} zone="host" />
                  </TabsContent>
                </Tabs>
              </div>
            )}

            {/* Festival team (inherited, read-only) */}
            {!isNew && festivalTeam && (festivalTeam.hostRoles.length > 0 || festivalTeam.backstage.length > 0) && (
              <div className="space-y-3 pt-4 border-t border-border/30">
                <div className="flex items-center gap-3">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs font-semibold text-foreground">
                      Festival-team ({festivalTeam.festival?.name})
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      Arves fra festivalen
                    </p>
                  </div>
                </div>

                {festivalTeam.hostRoles.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60">Arrangør</p>
                    {festivalTeam.hostRoles.map((item: any, i: number) => (
                      <div key={item.participant_id || i} className="flex items-center gap-2 text-sm">
                        <span className="font-medium text-foreground">{item.persona?.name || item.entity?.name}</span>
                        {item.role_label && <span className="text-xs text-muted-foreground">· {item.role_label}</span>}
                      </div>
                    ))}
                  </div>
                )}

                {festivalTeam.backstage.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60">Bak scenen</p>
                    {festivalTeam.backstage.map((item: any, i: number) => (
                      <div key={item.participant_id || i} className="flex items-center gap-2 text-sm">
                        <span className="font-medium text-foreground">{item.persona?.name || item.entity?.name}</span>
                        {item.role_label && <span className="text-xs text-muted-foreground">· {item.role_label}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}