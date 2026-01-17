import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Check, ChevronsUpDown, Globe, Tag, Lock } from "lucide-react";
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

const EVENT_TYPES: { value: TimelineEventType; label: string; icon: string; defaultVisibility: TimelineVisibility }[] = [
  { value: "live_show", label: "Konsert", icon: "🎤", defaultVisibility: "public" },
  { value: "release", label: "Utgivelse", icon: "💿", defaultVisibility: "public" },
  { value: "milestone", label: "Milepæl", icon: "⭐", defaultVisibility: "public" },
  { value: "collaboration", label: "Samarbeid", icon: "🤝", defaultVisibility: "public" },
  { value: "media", label: "Media", icon: "📸", defaultVisibility: "public" },
  { value: "award", label: "Pris", icon: "🏆", defaultVisibility: "public" },
  { value: "personal_memory", label: "Personlig minne", icon: "💭", defaultVisibility: "private" },
];

const VISIBILITY_OPTIONS: { value: TimelineVisibility; label: string; icon: React.ReactNode }[] = [
  { value: "public", label: "Offentlig", icon: <Globe className="w-4 h-4" /> },
  { value: "pro", label: "Pro", icon: <Tag className="w-4 h-4" /> },
  { value: "private", label: "Privat", icon: <Lock className="w-4 h-4" /> },
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
  const [title, setTitle] = useState("");
  const [eventType, setEventType] = useState<TimelineEventType>("live_show");
  const [visibility, setVisibility] = useState<TimelineVisibility>("public");
  const [date, setDate] = useState("");
  const [year, setYear] = useState<number | "">("");
  const [locationName, setLocationName] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [description, setDescription] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);

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
      setTitle(existingEvent.title);
      setEventType(existingEvent.event_type);
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
    }
  }, [existingEvent]);

  // Set default visibility when event type changes
  const handleEventTypeChange = (newType: TimelineEventType) => {
    setEventType(newType);
    const typeConfig = EVENT_TYPES.find((t) => t.value === newType);
    if (typeConfig && isNew) {
      setVisibility(typeConfig.defaultVisibility);
    }
  };

  const handleSave = async () => {
    if (!projectId) {
      toast.error("Velg et prosjekt");
      return;
    }
    if (!title.trim()) {
      toast.error("Tittel er påkrevd");
      return;
    }
    if (!date && !year) {
      toast.error("Dato eller år er påkrevd");
      return;
    }

    const eventData = {
      project_id: projectId,
      title: title.trim(),
      event_type: eventType,
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

  if (!isNew && loadingEvent) {
    return <div className="p-6">Laster hendelse...</div>;
  }

  return (
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

      {/* Quick visibility selector for new events */}
      {isNew && (
        <div className="flex gap-2">
          {VISIBILITY_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              variant={visibility === opt.value ? "default" : "outline"}
              size="sm"
              onClick={() => setVisibility(opt.value)}
              className="flex items-center gap-2"
            >
              {opt.icon}
              {opt.label}
            </Button>
          ))}
        </div>
      )}

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

        {/* Title */}
        <div className="space-y-2">
          <Label htmlFor="title">Tittel *</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="F.eks. Konsert på Parkteatret"
          />
        </div>

        {/* Event type */}
        <div className="space-y-2">
          <Label>Hendelsestype</Label>
          <Select value={eventType} onValueChange={(v) => handleEventTypeChange(v as TimelineEventType)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EVENT_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.icon} {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Visibility */}
        <div className="space-y-2">
          <Label>Synlighet</Label>
          <Select value={visibility} onValueChange={(v) => setVisibility(v as TimelineVisibility)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VISIBILITY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  <span className="flex items-center gap-2">
                    {opt.icon}
                    {opt.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Date and Year */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="date">Dato</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="year">Eller kun år</Label>
            <Input
              id="year"
              type="number"
              min={1900}
              max={2100}
              value={year}
              onChange={(e) => setYear(e.target.value ? parseInt(e.target.value) : "")}
              placeholder="F.eks. 2019"
            />
          </div>
        </div>
        <p className="text-sm text-muted-foreground">Minst dato eller år må fylles ut.</p>

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
          <Label htmlFor="description">Beskrivelse (valgfritt)</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="Fortell mer om hendelsen..."
          />
        </div>

        {/* Media */}
        <div className="space-y-2">
          <Label>Media (valgfritt)</Label>
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
            <div className="mt-2">
              <img
                src={mediaUrl}
                alt="Preview"
                className="w-32 h-32 object-cover rounded border"
              />
            </div>
          )}
        </div>

        <MediaPicker
          open={mediaPickerOpen}
          onOpenChange={setMediaPickerOpen}
          onSelect={(mediaUrl) => {
            setMediaUrl(mediaUrl);
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
  );
}
