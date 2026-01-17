import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Check, ChevronsUpDown, Globe, Tag, Lock, ChevronDown, ChevronUp, HelpCircle } from "lucide-react";
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
  useTimelineEvent,
  useCreateTimelineEvent,
  useUpdateTimelineEvent,
} from "@/hooks/useTimeline";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { TimelineEventType, TimelineVisibility } from "@/types/database";

// Phases based on the artist journey
const PHASES: { 
  value: string; 
  label: string; 
  icon: string; 
  defaultVisibility: TimelineVisibility;
  placeholders: string[];
}[] = [
  { 
    value: "origin", 
    label: "Opprinnelse & gnist", 
    icon: "✨", 
    defaultVisibility: "private",
    placeholders: ["Bandet fikk navnet sitt", "Første låt skrevet i kjelleren"]
  },
  { 
    value: "first_steps", 
    label: "De første stegene ut", 
    icon: "👣", 
    defaultVisibility: "public",
    placeholders: ["Første konsert på vennefest", "Første betalte spillejobb"]
  },
  { 
    value: "identity", 
    label: "Utforsking & identitet", 
    icon: "🔍", 
    defaultVisibility: "public",
    placeholders: ["Endring i besetning", "Første studioinnspilling"]
  },
  { 
    value: "releases", 
    label: "Utgivelser & synlighet", 
    icon: "💿", 
    defaultVisibility: "public",
    placeholders: ["Første singel sluppet", "Første radiospilling"]
  },
  { 
    value: "live_momentum", 
    label: "Live-liv & momentum", 
    icon: "🎤", 
    defaultVisibility: "public",
    placeholders: ["Første utsolgte konsert", "Første festivalopptreden"]
  },
  { 
    value: "recognition", 
    label: "Anerkjennelse & profesjonalisering", 
    icon: "🏆", 
    defaultVisibility: "public",
    placeholders: ["Første pris / nominasjon", "Signert av booking-agent"]
  },
  { 
    value: "maturity", 
    label: "Modning & valg", 
    icon: "🌱", 
    defaultVisibility: "public",
    placeholders: ["Ny kunstnerisk retning", "Album som markerer et skifte"]
  },
  { 
    value: "legacy", 
    label: "Forankring & arv", 
    icon: "🌳", 
    defaultVisibility: "public",
    placeholders: ["10-års jubileum", "Samarbeid med yngre artister"]
  },
];

// Map phases to event types for database storage
const PHASE_TO_EVENT_TYPE: Record<string, TimelineEventType> = {
  origin: "personal_memory",
  first_steps: "live_show",
  identity: "milestone",
  releases: "release",
  live_momentum: "live_show",
  recognition: "award",
  maturity: "milestone",
  legacy: "milestone",
};

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
    tooltip: "Kun synlig for deg og prosjekt-medlemmer"
  },
];

export default function AdminTimelineEventEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = id === "new";

  const { data: existingEvent, isLoading: loadingEvent } = useTimelineEvent(id);
  const createMutation = useCreateTimelineEvent();
  const updateMutation = useUpdateTimelineEvent();

  // Form state
  const [projectId, setProjectId] = useState("");
  const [projectOpen, setProjectOpen] = useState(false);
  const [phase, setPhase] = useState("first_steps");
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

  // Fetch projects for dropdown
  const { data: projects } = useQuery({
    queryKey: ["admin-projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, slug")
        .order("name");
      if (error) throw error;
      return data || [];
    },
  });

  // Populate form when editing
  useEffect(() => {
    if (existingEvent) {
      setProjectId(existingEvent.project_id);
      setEventText(existingEvent.title);
      setVisibility(existingEvent.visibility);
      setDate(existingEvent.date || "");
      setYear(existingEvent.year || "");
      setLocationName(existingEvent.location_name || "");
      setCity(existingEvent.city || "");
      setCountry(existingEvent.country || "");
      setDescription(existingEvent.description || "");
      if (existingEvent.media && existingEvent.media.length > 0) {
        setMediaUrl(existingEvent.media[0].url);
      }
      // Try to map existing event_type back to a phase
      const matchedPhase = Object.entries(PHASE_TO_EVENT_TYPE).find(
        ([, eventType]) => eventType === existingEvent.event_type
      );
      if (matchedPhase) {
        setPhase(matchedPhase[0]);
      }
      // Open details if there's existing data
      if (existingEvent.date || existingEvent.location_name || existingEvent.city || existingEvent.description) {
        setDetailsOpen(true);
      }
    }
  }, [existingEvent]);

  // Set default visibility when phase changes
  const handlePhaseChange = (newPhase: string) => {
    setPhase(newPhase);
    const phaseConfig = PHASES.find((p) => p.value === newPhase);
    if (phaseConfig && isNew) {
      setVisibility(phaseConfig.defaultVisibility);
    }
  };

  const handleSave = async () => {
    if (!projectId) {
      toast.error("Velg et prosjekt");
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
      project_id: projectId,
      title: eventText.trim(),
      event_type: PHASE_TO_EVENT_TYPE[phase] || "milestone",
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

  const selectedProject = projects?.find((p) => p.id === projectId);
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
          {/* Project picker */}
          <div className="space-y-2">
            <Label>Prosjekt *</Label>
            <Popover open={projectOpen} onOpenChange={setProjectOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={projectOpen}
                  className="w-full justify-between"
                >
                  {selectedProject ? selectedProject.name : "Velg prosjekt..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <Command>
                  <CommandInput placeholder="Søk prosjekt..." />
                  <CommandList>
                    <CommandEmpty>Ingen prosjekter funnet.</CommandEmpty>
                    <CommandGroup>
                      {projects?.map((project) => (
                        <CommandItem
                          key={project.id}
                          value={project.name}
                          onSelect={() => {
                            setProjectId(project.id);
                            setProjectOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              projectId === project.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {project.name}
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
                {PHASES.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.icon} {p.label}
                  </SelectItem>
                ))}
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
