import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { MediaPicker } from "@/components/admin/MediaPicker";
import { useEntityTimelineEventsForEntity, useCreateEntityTimelineEvent, useUpdateEntityTimelineEvent, useDeleteEntityTimelineEvent } from "@/hooks/useEntityTimeline";
import { useEntityById } from "@/hooks/useEntity";
import type { EntityTimelineEvent, TimelineVisibility, TimelineEventType, EntityType } from "@/types/database";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Clock, 
  ImageIcon, 
  X,
  // Persona/Artist icons
  Sparkles,        // Start & identitet
  Palette,         // Kunstnerisk utvikling
  Users2,          // Samarbeid
  Star,            // Milepæler
  Mic2,            // Live & opptreden
  GraduationCap,   // Utdanning
  BookOpen,        // Kurs & kompetanse
  Trophy,          // Anerkjennelse
  RefreshCw,       // Overganger & liv
  Target,          // Nåtid & retning
  // Venue icons
  Building2,       // Etablering & identitet
  Lightbulb,       // Konsept & retning
  Calendar,        // Program & innhold
  Music,           // Kunstnere & øyeblikk
  Wrench,          // Ombygging & utvikling
  AlertCircle,     // Utfordringer & pauser
  RotateCw,        // Gjenåpning & nye kapitler
  Compass          // Nåtid & fokus
} from "lucide-react";

interface EntityTimelineManagerProps {
  entityId: string;
  entityType?: EntityType; // Optional - if provided, skips entity fetch
  canEdit: boolean;
}

type EventTypeOption = { value: TimelineEventType; label: string; icon: React.ComponentType<{ className?: string }> };

// Persona/Artist event type options
const PERSONA_EVENT_TYPE_OPTIONS: EventTypeOption[] = [
  { value: "start_identity", label: "Start & identitet", icon: Sparkles },
  { value: "artistic_development", label: "Kunstnerisk utvikling", icon: Palette },
  { value: "collaboration", label: "Samarbeid", icon: Users2 },
  { value: "milestone", label: "Milepæler", icon: Star },
  { value: "live_performance", label: "Live & opptreden", icon: Mic2 },
  { value: "education", label: "Utdanning", icon: GraduationCap },
  { value: "course_competence", label: "Kurs & kompetanse", icon: BookOpen },
  { value: "recognition", label: "Anerkjennelse", icon: Trophy },
  { value: "transitions_life", label: "Overganger & liv", icon: RefreshCw },
  { value: "present_direction", label: "Nåtid & retning", icon: Target },
];

// Venue event type options
const VENUE_EVENT_TYPE_OPTIONS: EventTypeOption[] = [
  { value: "establishment", label: "Etablering & identitet", icon: Building2 },
  { value: "concept", label: "Konsept & retning", icon: Lightbulb },
  { value: "program", label: "Program & innhold", icon: Calendar },
  { value: "collaboration", label: "Samarbeid", icon: Users2 },
  { value: "milestone", label: "Milepæler", icon: Star },
  { value: "artists", label: "Kunstnere & øyeblikk", icon: Music },
  { value: "development", label: "Ombygging & utvikling", icon: Wrench },
  { value: "recognition", label: "Anerkjennelse & omtale", icon: Trophy },
  { value: "pause", label: "Utfordringer & pauser", icon: AlertCircle },
  { value: "relaunch", label: "Gjenåpning & nye kapitler", icon: RotateCw },
  { value: "focus_now", label: "Nåtid & fokus", icon: Compass },
];

const VISIBILITY_LABELS: Record<TimelineVisibility, string> = {
  public: "Offentlig",
  pro: "Pro",
  private: "Privat",
};

const getTypeConfig = (eventType: TimelineEventType | string, isVenue: boolean): EventTypeOption => {
  const options = isVenue ? VENUE_EVENT_TYPE_OPTIONS : PERSONA_EVENT_TYPE_OPTIONS;
  return options.find((o) => o.value === eventType) || (isVenue ? VENUE_EVENT_TYPE_OPTIONS[0] : PERSONA_EVENT_TYPE_OPTIONS[3]);
};

export function EntityTimelineManager({ entityId, entityType, canEdit }: EntityTimelineManagerProps) {
  // Only fetch entity if entityType is not provided
  const { data: entity } = useEntityById(entityType ? undefined : entityId);
  const isVenue = entityType === "venue" || entity?.type === "venue";
  const eventTypeOptions = isVenue ? VENUE_EVENT_TYPE_OPTIONS : PERSONA_EVENT_TYPE_OPTIONS;
  
  const { data: events, isLoading } = useEntityTimelineEventsForEntity(entityId);
  const createMutation = useCreateEntityTimelineEvent();
  const updateMutation = useUpdateEntityTimelineEvent();
  const deleteMutation = useDeleteEntityTimelineEvent();

  const [editingEvent, setEditingEvent] = useState<EntityTimelineEvent | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleEdit = (event: EntityTimelineEvent | null) => {
    setEditingEvent(event);
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Er du sikker på at du vil slette denne hendelsen?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingEvent(null);
  };

  return (
    <div className="space-y-4 pt-6 border-t border-border">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-semibold text-foreground">Tidslinje</h2>
        </div>
        {canEdit && (
          <Button variant="outline" size="sm" onClick={() => handleEdit(null)}>
            <Plus className="h-4 w-4 mr-1" />
            Legg til
          </Button>
        )}
      </div>

      <p className="text-sm text-muted-foreground">
        {isVenue 
          ? "Viktige hendelser i stedets historie."
          : "Viktige hendelser i reisen til prosjektet."
        }
      </p>

      {isLoading ? (
        <p className="text-sm text-muted-foreground py-4">Laster hendelser...</p>
      ) : !events || events.length === 0 ? (
        <div className="py-6 text-center">
          <p className="text-sm text-muted-foreground">
            Ingen hendelser ennå.{" "}
            {canEdit && "Legg til den første for å fortelle historien."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((event) => {
            const typeConfig = getTypeConfig(event.event_type as TimelineEventType, isVenue);
            const TypeIcon = typeConfig.icon;
            const mediaUrl = event.media && event.media.length > 0 ? event.media[0].url : null;

            return (
              <div
                key={event.id}
                className="p-4 bg-muted/30 rounded-xl border border-border/50 flex items-start gap-4"
              >
                {/* Category icon */}
                <div className="flex-shrink-0 w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                  <TypeIcon className="h-4 w-4 text-primary" />
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                    {event.date ? (
                      <span>
                        {format(new Date(event.date), "d. MMM yyyy", { locale: nb })}
                        {new Date(event.date).getHours() !== 0 || new Date(event.date).getMinutes() !== 0 ? (
                          <span className="ml-1">
                            kl. {format(new Date(event.date), "HH:mm", { locale: nb })}
                          </span>
                        ) : null}
                      </span>
                    ) : event.year ? (
                      <span>
                        {event.year}
                        {event.year_to && event.year_to !== event.year ? `–${event.year_to}` : ''}
                      </span>
                    ) : null}
                    <span>·</span>
                    <Badge variant="outline" className="text-xs">
                      {VISIBILITY_LABELS[event.visibility as TimelineVisibility] || event.visibility}
                    </Badge>
                    <span>·</span>
                    <span>{typeConfig.label}</span>
                  </div>
                  <p className="font-medium text-foreground">{event.title}</p>
                  {event.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {event.description}
                    </p>
                  )}
                </div>

                {/* Thumbnail preview if image exists */}
                {mediaUrl && (
                  <div className="flex-shrink-0">
                    <img
                      src={mediaUrl}
                      alt=""
                      className="w-14 h-14 object-cover rounded-lg border border-border/50"
                    />
                  </div>
                )}

                {canEdit && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(event)}
                      className="h-8 w-8 p-0"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(event.id)}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {canEdit && (
        <TimelineEventDialog
          open={dialogOpen}
          onOpenChange={(open) => {
            if (!open) handleDialogClose();
          }}
          entityId={entityId}
          existingEvent={editingEvent}
          createMutation={createMutation}
          updateMutation={updateMutation}
          isVenue={isVenue}
          eventTypeOptions={eventTypeOptions}
        />
      )}
    </div>
  );
}

interface TimelineEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityId: string;
  existingEvent: EntityTimelineEvent | null;
  createMutation: ReturnType<typeof useCreateEntityTimelineEvent>;
  updateMutation: ReturnType<typeof useUpdateEntityTimelineEvent>;
  isVenue: boolean;
  eventTypeOptions: EventTypeOption[];
}

function TimelineEventDialog({
  open,
  onOpenChange,
  entityId,
  existingEvent,
  createMutation,
  updateMutation,
  isVenue,
  eventTypeOptions,
}: TimelineEventDialogProps) {
  const isEditing = !!existingEvent;
  const defaultEventType = isVenue ? "establishment" : "milestone";

  // Form state
  const [eventType, setEventType] = useState<TimelineEventType>(defaultEventType);
  const [title, setTitle] = useState("");
  const [year, setYear] = useState<number | "">("");
  const [yearTo, setYearTo] = useState<number | "">("");
  const [dateStr, setDateStr] = useState("");
  const [dateToStr, setDateToStr] = useState("");
  const [timeStr, setTimeStr] = useState("");
  const [visibility, setVisibility] = useState<TimelineVisibility>("public");
  const [description, setDescription] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);

  // Reset form when dialog opens/closes or event changes
  useEffect(() => {
    if (open) {
      setEventType((existingEvent?.event_type as TimelineEventType) ?? defaultEventType);
      setTitle(existingEvent?.title ?? "");
      setYear(existingEvent?.year ?? "");
      setYearTo(existingEvent?.year_to ?? "");
      setVisibility((existingEvent?.visibility as TimelineVisibility) ?? "public");
      setDescription(existingEvent?.description ?? "");
      
      // Parse existing date/time
      if (existingEvent?.date) {
        const d = new Date(existingEvent.date);
        setDateStr(d.toISOString().slice(0, 10));
        if (d.getHours() !== 0 || d.getMinutes() !== 0) {
          setTimeStr(d.toISOString().slice(11, 16));
        } else {
          setTimeStr("");
        }
      } else {
        setDateStr("");
        setTimeStr("");
      }
      
      if (existingEvent?.date_to) {
        const d = new Date(existingEvent.date_to);
        setDateToStr(d.toISOString().slice(0, 10));
      } else {
        setDateToStr("");
      }
      
      // Parse existing media
      if (existingEvent?.media && existingEvent.media.length > 0) {
        setMediaUrl(existingEvent.media[0].url);
      } else {
        setMediaUrl("");
      }
    }
  }, [open, existingEvent, defaultEventType]);

  const handleSave = async () => {
    if (!title.trim()) return;
    if (!year) return;

    // Combine date + time to ISO string (optional)
    let fullDate: string | null = null;
    if (dateStr) {
      if (timeStr) {
        fullDate = new Date(`${dateStr}T${timeStr}:00`).toISOString();
      } else {
        fullDate = new Date(`${dateStr}T00:00:00`).toISOString();
      }
    }

    let fullDateTo: string | null = null;
    if (dateToStr) {
      fullDateTo = new Date(`${dateToStr}T00:00:00`).toISOString();
    }

    const payload = {
      entity_id: entityId,
      title: title.trim(),
      event_type: eventType,
      visibility,
      date: fullDate,
      date_to: fullDateTo,
      year: Number(year),
      year_to: yearTo ? Number(yearTo) : null,
      location_name: existingEvent?.location_name ?? null,
      city: existingEvent?.city ?? null,
      country: existingEvent?.country ?? null,
      description: description.trim() || null,
      media: mediaUrl ? [{ type: "image" as const, url: mediaUrl }] : null,
    };

    try {
      if (isEditing && existingEvent) {
        await updateMutation.mutateAsync({ id: existingEvent.id, ...payload });
      } else {
        await createMutation.mutateAsync(payload as Parameters<typeof createMutation.mutateAsync>[0]);
      }
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to save timeline event:", error);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-lg max-h-[calc(100vh-2rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg">{isEditing ? "Rediger hendelse" : "Ny hendelse"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 sm:space-y-4 pt-2">
          {/* Category */}
          <div className="space-y-1.5 sm:space-y-2">
            <Label className="text-xs sm:text-sm">Kategori</Label>
            <Select value={eventType} onValueChange={(v) => setEventType(v as TimelineEventType)}>
              <SelectTrigger className="h-9 sm:h-10 text-xs sm:text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {eventTypeOptions.map((opt) => {
                  const Icon = opt.icon;
                  return (
                    <SelectItem key={opt.value} value={opt.value}>
                      <span className="flex items-center gap-2">
                        <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                        <span className="text-xs sm:text-sm">{opt.label}</span>
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="timeline-title" className="text-xs sm:text-sm">Tittel *</Label>
            <Input
              id="timeline-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={isVenue ? "F.eks. Åpnet dørene første gang" : "F.eks. Første festivalopptreden"}
              className="h-9 sm:h-10 text-sm"
            />
          </div>

          {/* Year with optional range */}
          <div className="space-y-1.5 sm:space-y-2">
            <Label className="text-xs sm:text-sm">År *</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={year}
                onChange={(e) => setYear(e.target.value ? parseInt(e.target.value, 10) : "")}
                placeholder="2024"
                min={1900}
                max={2100}
                className="w-24 h-9 sm:h-10 text-sm"
              />
              <span className="text-muted-foreground">–</span>
              <Input
                type="number"
                value={yearTo}
                onChange={(e) => setYearTo(e.target.value ? parseInt(e.target.value, 10) : "")}
                placeholder="(til)"
                min={1900}
                max={2100}
                className="w-24 h-9 sm:h-10 text-sm"
              />
              <span className="text-xs text-muted-foreground hidden sm:inline">(valgfritt)</span>
            </div>
          </div>

          {/* Optional date + time */}
          <div className="space-y-1.5 sm:space-y-2">
            <Label className="text-xs sm:text-sm">Eksakt dato (valgfritt)</Label>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Fra</span>
                <Input
                  type="date"
                  value={dateStr}
                  onChange={(e) => setDateStr(e.target.value)}
                  className="w-full h-9 sm:h-10 text-sm"
                />
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Til</span>
                <Input
                  type="date"
                  value={dateToStr}
                  onChange={(e) => setDateToStr(e.target.value)}
                  className="w-full h-9 sm:h-10 text-sm"
                />
              </div>
            </div>
            {dateStr && (
              <Input
                type="time"
                value={timeStr}
                onChange={(e) => setTimeStr(e.target.value)}
                className="w-32 h-9 sm:h-10 text-sm"
                placeholder="--:--"
              />
            )}
          </div>

          {/* Visibility */}
          <div className="space-y-1.5 sm:space-y-2">
            <Label className="text-xs sm:text-sm">Synlighet</Label>
            <Select value={visibility} onValueChange={(v) => setVisibility(v as TimelineVisibility)}>
              <SelectTrigger className="h-9 sm:h-10 text-xs sm:text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">Offentlig</SelectItem>
                <SelectItem value="pro">Pro (kun arrangører / bransje)</SelectItem>
                <SelectItem value="private">Privat (kun teamet)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="timeline-description" className="text-xs sm:text-sm">Detaljer (valgfritt)</Label>
            <Textarea
              id="timeline-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Fortell litt mer om hendelsen..."
              className="text-sm"
            />
          </div>

          {/* Image (optional) */}
          <div className="space-y-1.5 sm:space-y-2">
            <Label className="text-xs sm:text-sm">Bilde (valgfritt)</Label>
            <div className="flex gap-2 sm:gap-3 items-center">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setMediaPickerOpen(true)}
                className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm h-8 sm:h-9"
              >
                <ImageIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Velg fra filbank</span>
                <span className="sm:hidden">Velg bilde</span>
              </Button>
              {mediaUrl && (
                <div className="relative inline-block">
                  <img
                    src={mediaUrl}
                    alt="Preview"
                    className="w-12 h-12 sm:w-16 sm:h-16 object-cover rounded-lg border border-border"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute -top-1.5 -right-1.5 sm:-top-2 sm:-right-2 h-5 w-5 rounded-full"
                    onClick={() => setMediaUrl("")}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending} className="w-full sm:w-auto" size="sm">
              Avbryt
            </Button>
            <Button onClick={handleSave} disabled={isPending || !title.trim() || !year} className="w-full sm:w-auto" size="sm">
              {isPending ? "Lagrer..." : "Lagre"}
            </Button>
          </div>
        </div>

        {/* MediaPicker dialog */}
        <MediaPicker
          open={mediaPickerOpen}
          onOpenChange={setMediaPickerOpen}
          onSelect={(_id, url) => {
            setMediaUrl(url);
            setMediaPickerOpen(false);
          }}
          fileType="image"
        />
      </DialogContent>
    </Dialog>
  );
}
