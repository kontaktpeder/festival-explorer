import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  ArrowLeft, Check, ChevronsUpDown, Globe, Tag, Lock, ChevronDown, ChevronUp, HelpCircle,
  Sparkles, Palette, Users2, Star, Mic2, GraduationCap, BookOpen, Trophy, RefreshCw, Target, LucideIcon,
  Building2, User, Users, Lightbulb, Calendar, Music, Wrench, AlertCircle, RotateCw, Compass
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { MediaPicker } from "@/components/admin/MediaPicker";
import { supabase } from "@/integrations/supabase/client";
import {
  useEntityTimelineEvent,
  useCreateEntityTimelineEvent,
  useUpdateEntityTimelineEvent,
} from "@/hooks/useEntityTimeline";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { TimelineEventType, TimelineVisibility, EntityType } from "@/types/database";

// Phases based on the artist journey - aligned with TimelineEventType
const PHASES: { 
  value: TimelineEventType; 
  label: string; 
  icon: LucideIcon; 
  defaultVisibility: TimelineVisibility;
  placeholders: string[];
  forVenue?: boolean; // If true, only for venues
  forArtist?: boolean; // If true, only for artists
}[] = [
  // Artist/Persona categories
  { 
    value: "start_identity", 
    label: "Start & identitet", 
    icon: Sparkles, 
    defaultVisibility: "public",
    placeholders: ["Bandet fikk navnet sitt", "Første låt skrevet"],
    forArtist: true,
  },
  { 
    value: "artistic_development", 
    label: "Kunstnerisk utvikling", 
    icon: Palette, 
    defaultVisibility: "public",
    placeholders: ["Ny sjanger", "Første studioinnspilling"],
    forArtist: true,
  },
  { 
    value: "collaboration", 
    label: "Samarbeid", 
    icon: Users2, 
    defaultVisibility: "public",
    placeholders: ["Samarbeid med annen artist", "Ny bandmedlem"],
  },
  { 
    value: "milestone", 
    label: "Milepæler", 
    icon: Star, 
    defaultVisibility: "public",
    placeholders: ["Første singel sluppet", "10-årsjubileum"],
  },
  { 
    value: "live_performance", 
    label: "Live & opptreden", 
    icon: Mic2, 
    defaultVisibility: "public",
    placeholders: ["Første konsert", "Festivalopptreden"],
    forArtist: true,
  },
  { 
    value: "education", 
    label: "Utdanning", 
    icon: GraduationCap, 
    defaultVisibility: "public",
    placeholders: ["Musikkutdanning", "Masterclass"],
    forArtist: true,
  },
  { 
    value: "course_competence", 
    label: "Kurs & kompetanse", 
    icon: BookOpen, 
    defaultVisibility: "public",
    placeholders: ["Produksjonskurs", "Sertifisering"],
    forArtist: true,
  },
  { 
    value: "recognition", 
    label: "Anerkjennelse", 
    icon: Trophy, 
    defaultVisibility: "public",
    placeholders: ["Første pris", "Nominasjon"],
  },
  { 
    value: "transitions_life", 
    label: "Overganger & liv", 
    icon: RefreshCw, 
    defaultVisibility: "public",
    placeholders: ["Ny kunstnerisk retning", "Pause fra musikk"],
    forArtist: true,
  },
  { 
    value: "present_direction", 
    label: "Nåtid & retning", 
    icon: Target, 
    defaultVisibility: "public",
    placeholders: ["Nåværende prosjekt", "Fremtidsplaner"],
    forArtist: true,
  },
  // Venue categories
  { 
    value: "establishment", 
    label: "Etablering & identitet", 
    icon: Building2, 
    defaultVisibility: "public",
    placeholders: ["Åpnet dørene første gang", "Grunnlagt"],
    forVenue: true,
  },
  { 
    value: "concept", 
    label: "Konsept & retning", 
    icon: Lightbulb, 
    defaultVisibility: "public",
    placeholders: ["Ny profil", "Endret konsept"],
    forVenue: true,
  },
  { 
    value: "program", 
    label: "Program & innhold", 
    icon: Calendar, 
    defaultVisibility: "public",
    placeholders: ["Ny konsertserie", "Første festival"],
    forVenue: true,
  },
  { 
    value: "artists", 
    label: "Kunstnere & øyeblikk", 
    icon: Music, 
    defaultVisibility: "public",
    placeholders: ["Legendarisk konsert", "Første internasjonale artist"],
    forVenue: true,
  },
  { 
    value: "development", 
    label: "Ombygging & utvikling", 
    icon: Wrench, 
    defaultVisibility: "public",
    placeholders: ["Renovering", "Utvidet kapasitet"],
    forVenue: true,
  },
  { 
    value: "pause", 
    label: "Utfordringer & pauser", 
    icon: AlertCircle, 
    defaultVisibility: "public",
    placeholders: ["Stengt under pandemi", "Eierskifte"],
    forVenue: true,
  },
  { 
    value: "relaunch", 
    label: "Gjenåpning & nye kapitler", 
    icon: RotateCw, 
    defaultVisibility: "public",
    placeholders: ["Gjenåpning", "Ny start"],
    forVenue: true,
  },
  { 
    value: "focus_now", 
    label: "Nåtid & fokus", 
    icon: Compass, 
    defaultVisibility: "public",
    placeholders: ["Dagens profil", "Nåværende satsing"],
    forVenue: true,
  },
];

// Phase value is now the same as event type (no mapping needed)

const VISIBILITY_OPTIONS: { 
  value: TimelineVisibility; 
  label: string; 
  icon: React.ReactNode;
  tooltip: string;
}[] = [
  { 
    value: "public", 
    label: "Offentlig", 
    icon: <Globe className="w-4 h-4" />,
    tooltip: "Synlig for alle – fans, arrangører og verden"
  },
  { 
    value: "pro", 
    label: "Pro", 
    icon: <Tag className="w-4 h-4" />,
    tooltip: "Kun synlig for bransjefolk og arrangører"
  },
  { 
    value: "private", 
    label: "Privat", 
    icon: <Lock className="w-4 h-4" />,
    tooltip: "Kun synlig for deg og entity-medlemmer"
  },
];

const TYPE_ICONS: Record<EntityType, React.ReactNode> = {
  venue: <Building2 className="w-4 h-4" />,
  solo: <User className="w-4 h-4" />,
  band: <Users className="w-4 h-4" />,
};

export default function AdminTimelineEventEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = id === "new";

  const { data: existingEvent, isLoading: loadingEvent } = useEntityTimelineEvent(id);
  const createMutation = useCreateEntityTimelineEvent();
  const updateMutation = useUpdateEntityTimelineEvent();

  // Form state
  const [entityId, setEntityId] = useState("");
  const [entityOpen, setEntityOpen] = useState(false);
  const [phase, setPhase] = useState<TimelineEventType>("start_identity");
  const [eventText, setEventText] = useState("");
  const [visibility, setVisibility] = useState<TimelineVisibility>("public");
  const [date, setDate] = useState("");
  const [year, setYear] = useState<number | "">("");
  const [locationName, setLocationName] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [description, setDescription] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Fetch entities for dropdown (all types)
  const { data: entities } = useQuery({
    queryKey: ["admin-entities-timeline"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("entities")
        .select("id, name, slug, type")
        .order("name");
      if (error) throw error;
      return data || [];
    },
  });

  // Populate form when editing
  useEffect(() => {
    if (existingEvent) {
      setEntityId(existingEvent.entity_id);
      setEventText(existingEvent.title);
      setVisibility(existingEvent.visibility as TimelineVisibility);
      setDate(existingEvent.date || "");
      setYear(existingEvent.year || "");
      setLocationName(existingEvent.location_name || "");
      setCity(existingEvent.city || "");
      setCountry(existingEvent.country || "");
      setDescription(existingEvent.description || "");
      if (existingEvent.media && existingEvent.media.length > 0) {
        setMediaUrl(existingEvent.media[0].url);
      }
      // Phase value is now directly the event_type
      if (existingEvent.event_type) {
        setPhase(existingEvent.event_type as TimelineEventType);
      }
      // Open details if there's existing data
      if (existingEvent.date || existingEvent.location_name || existingEvent.city || existingEvent.description) {
        setDetailsOpen(true);
      }
    }
  }, [existingEvent]);

  // Set default visibility when phase changes
  const handlePhaseChange = (newPhase: TimelineEventType) => {
    setPhase(newPhase);
    const phaseConfig = PHASES.find((p) => p.value === newPhase);
    if (phaseConfig && isNew) {
      setVisibility(phaseConfig.defaultVisibility);
    }
  };

  const handleSave = async () => {
    if (!entityId) {
      toast.error("Velg en entity");
      return;
    }
    if (!eventText.trim()) {
      toast.error("Beskriv hendelsen");
      return;
    }
    if (!date && !year) {
      toast.error("År er påkrevd");
      return;
    }

    const eventData = {
      entity_id: entityId,
      title: eventText.trim(),
      event_type: phase, // Phase value is now directly the event_type
      visibility,
      date: date || null,
      year: year ? Number(year) : null,
      location_name: locationName.trim() || null,
      city: city.trim() || null,
      country: country.trim() || null,
      description: description.trim() || null,
      media: mediaUrl ? [{ type: "image" as const, url: mediaUrl }] : null,
    };

    try {
      if (isNew) {
        await createMutation.mutateAsync(eventData);
        toast.success("Hendelse opprettet");
      } else {
        await updateMutation.mutateAsync({ id: id!, ...eventData });
        toast.success("Hendelse oppdatert");
      }
      navigate("/admin/timeline");
    } catch (err: any) {
      toast.error("Feil: " + err.message);
    }
  };

  const selectedEntity = entities?.find((e) => e.id === entityId);
  const selectedPhase = PHASES.find((p) => p.value === phase);

  if (!isNew && loadingEvent) {
    return <div className="p-6">Laster hendelse...</div>;
  }

  return (
    <TooltipProvider>
      <div className="space-y-6 max-w-2xl">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/admin/timeline")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Tilbake
          </Button>
          <h1 className="text-2xl font-bold">
            {isNew ? "Ny timeline-hendelse" : "Rediger hendelse"}
          </h1>
        </div>

        {/* Visibility buttons with tooltips */}
        <div className="flex gap-2 items-center">
          {VISIBILITY_OPTIONS.map((opt) => (
            <Tooltip key={opt.value}>
              <TooltipTrigger asChild>
                <Button
                  variant={visibility === opt.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setVisibility(opt.value)}
                  className="flex items-center gap-2"
                >
                  {opt.icon}
                  {opt.label}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <p>{opt.tooltip}</p>
              </TooltipContent>
            </Tooltip>
          ))}
          <Tooltip>
            <TooltipTrigger asChild>
              <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-xs">
              <p>Velg hvem som kan se denne hendelsen i tidslinjen</p>
            </TooltipContent>
          </Tooltip>
        </div>

        <div className="space-y-4">
          {/* Entity picker */}
          <div className="space-y-2">
            <Label>Entity *</Label>
            <Popover open={entityOpen} onOpenChange={setEntityOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={entityOpen}
                  className="w-full justify-between"
                >
                  {selectedEntity ? (
                    <span className="flex items-center gap-2">
                      {TYPE_ICONS[selectedEntity.type as EntityType]}
                      {selectedEntity.name}
                    </span>
                  ) : (
                    "Velg entity..."
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <Command>
                  <CommandInput placeholder="Søk entity..." />
                  <CommandList>
                    <CommandEmpty>Ingen entities funnet.</CommandEmpty>
                    <CommandGroup>
                      {entities?.map((entity) => (
                        <CommandItem
                          key={entity.id}
                          value={entity.name}
                          onSelect={() => {
                            setEntityId(entity.id);
                            setEntityOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              entityId === entity.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <span className="flex items-center gap-2">
                            {TYPE_ICONS[entity.type as EntityType]}
                            {entity.name}
                          </span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Phase selector (replaces event type) */}
          <div className="space-y-2">
            <Label>Fase i reisen</Label>
            <Select value={phase} onValueChange={handlePhaseChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PHASES.map((p) => {
                  const PhaseIcon = p.icon;
                  return (
                    <SelectItem key={p.value} value={p.value}>
                      <span className="flex items-center gap-2">
                        <PhaseIcon className="w-4 h-4" />
                        {p.label}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Event text (replaces title) */}
          <div className="space-y-2">
            <Label htmlFor="eventText">Hva skjedde? *</Label>
            <Textarea
              id="eventText"
              value={eventText}
              onChange={(e) => setEventText(e.target.value)}
              placeholder={selectedPhase?.placeholders.join(" · ")}
              rows={2}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Eksempler: {selectedPhase?.placeholders.join(", ")}
            </p>
          </div>

          {/* Year (required, moved up) */}
          <div className="space-y-2">
            <Label htmlFor="year">År *</Label>
            <Input
              id="year"
              type="number"
              min={1900}
              max={2100}
              value={year}
              onChange={(e) => setYear(e.target.value ? parseInt(e.target.value) : "")}
              placeholder="F.eks. 2019"
              className="w-32"
            />
          </div>

          {/* Media section (moved up, before details) */}
          <div className="space-y-2">
            <Label>Bilde (valgfritt)</Label>
            <div className="flex gap-2">
              <Input
                value={mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
                placeholder="Bilde-URL"
                className="flex-1"
              />
              <Button variant="outline" onClick={() => setMediaPickerOpen(true)}>
                Velg fra bibliotek
              </Button>
            </div>
            {mediaUrl && (
              <div className="mt-2 relative inline-block">
                <img
                  src={mediaUrl}
                  alt="Preview"
                  className="w-32 h-32 object-cover rounded border"
                />
                <Button
                  variant="destructive"
                  size="sm"
                  className="absolute -top-2 -right-2 h-6 w-6 p-0"
                  onClick={() => setMediaUrl("")}
                >
                  ×
                </Button>
              </div>
            )}
          </div>

          {/* Collapsible details section */}
          <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between p-2 h-auto">
                <span className="text-sm text-muted-foreground">
                  Flere detaljer (dato, sted, beskrivelse)
                </span>
                {detailsOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-4">
              {/* Exact date */}
              <div className="space-y-2">
                <Label htmlFor="date">Eksakt dato (valgfritt)</Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-48"
                />
              </div>

              {/* Location */}
              <div className="space-y-2">
                <Label>Sted (valgfritt)</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Input
                    placeholder="Stednavn"
                    value={locationName}
                    onChange={(e) => setLocationName(e.target.value)}
                  />
                  <Input
                    placeholder="By"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                  <Input
                    placeholder="Land"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Utdypende beskrivelse (valgfritt)</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Fortell mer om hendelsen..."
                />
              </div>
            </CollapsibleContent>
          </Collapsible>

          <MediaPicker
            open={mediaPickerOpen}
            onOpenChange={setMediaPickerOpen}
            onSelect={(url) => {
              setMediaUrl(url);
              setMediaPickerOpen(false);
            }}
            fileType="image"
          />

          {/* Save button */}
          <div className="flex gap-4 pt-4">
            <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
              {createMutation.isPending || updateMutation.isPending ? "Lagrer..." : "Lagre"}
            </Button>
            <Button variant="outline" onClick={() => navigate("/admin/timeline")}>
              Avbryt
            </Button>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
