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
import type { EntityTimelineEvent, TimelineVisibility, TimelineEventType } from "@/types/database";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Clock, 
  ImageIcon, 
  X,
  Sparkles,        // Start & identitet
  Palette,         // Kunstnerisk utvikling
  Users2,          // Samarbeid
  Star,            // Milepæler
  Mic2,            // Live & opptreden
  GraduationCap,   // Utdanning
  BookOpen,        // Kurs & kompetanse
  Trophy,          // Anerkjennelse
  RefreshCw,       // Overganger & liv
  Target           // Nåtid & retning
} from "lucide-react";

interface EntityTimelineManagerProps {
  entityId: string;
  canEdit: boolean;
}

const EVENT_TYPE_OPTIONS: { value: TimelineEventType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
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

const VISIBILITY_LABELS: Record<TimelineVisibility, string> = {
  public: "Offentlig",
  pro: "Pro",
  private: "Privat",
};

const getTypeConfig = (eventType: TimelineEventType | string) =>
  EVENT_TYPE_OPTIONS.find((o) => o.value === eventType) || EVENT_TYPE_OPTIONS[2]; // fallback = milestone

export function EntityTimelineManager({ entityId, canEdit }: EntityTimelineManagerProps) {
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
        Viktige hendelser i reisen til prosjektet.
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
            const typeConfig = getTypeConfig(event.event_type as TimelineEventType);
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
                        {/* Show time if not midnight */}
                        {new Date(event.date).getHours() !== 0 || new Date(event.date).getMinutes() !== 0 ? (
                          <span className="ml-1">
                            kl. {format(new Date(event.date), "HH:mm", { locale: nb })}
                          </span>
                        ) : null}
                      </span>
                    ) : event.year ? (
                      <span>{event.year}</span>
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
}

function TimelineEventDialog({
  open,
  onOpenChange,
  entityId,
  existingEvent,
  createMutation,
  updateMutation,
}: TimelineEventDialogProps) {
  const isEditing = !!existingEvent;

  // Form state
  const [eventType, setEventType] = useState<TimelineEventType>("milestone");
  const [title, setTitle] = useState("");
  const [year, setYear] = useState<number | "">("");
  const [dateStr, setDateStr] = useState("");
  const [timeStr, setTimeStr] = useState("");
  const [visibility, setVisibility] = useState<TimelineVisibility>("public");
  const [description, setDescription] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);

  // Reset form when dialog opens/closes or event changes
  useEffect(() => {
    if (open) {
      setEventType((existingEvent?.event_type as TimelineEventType) ?? "milestone");
      setTitle(existingEvent?.title ?? "");
      setYear(existingEvent?.year ?? "");
      setVisibility((existingEvent?.visibility as TimelineVisibility) ?? "public");
      setDescription(existingEvent?.description ?? "");
      
      // Parse existing date/time
      if (existingEvent?.date) {
        const d = new Date(existingEvent.date);
        setDateStr(d.toISOString().slice(0, 10)); // YYYY-MM-DD
        // Only set time if it's not midnight
        if (d.getHours() !== 0 || d.getMinutes() !== 0) {
          setTimeStr(d.toISOString().slice(11, 16)); // HH:MM
        } else {
          setTimeStr("");
        }
      } else {
        setDateStr("");
        setTimeStr("");
      }
      
      // Parse existing media
      if (existingEvent?.media && existingEvent.media.length > 0) {
        setMediaUrl(existingEvent.media[0].url);
      } else {
        setMediaUrl("");
      }
    }
  }, [open, existingEvent]);

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

    const payload = {
      entity_id: entityId,
      title: title.trim(),
      event_type: eventType,
      visibility,
      date: fullDate,
      year: Number(year),
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Rediger hendelse" : "Ny hendelse"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Category */}
          <div className="space-y-2">
            <Label>Kategori</Label>
            <Select value={eventType} onValueChange={(v) => setEventType(v as TimelineEventType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EVENT_TYPE_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  return (
                    <SelectItem key={opt.value} value={opt.value}>
                      <span className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        {opt.label}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="timeline-title">Tittel *</Label>
            <Input
              id="timeline-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="F.eks. Første festivalopptreden"
            />
          </div>

          {/* Year */}
          <div className="space-y-2">
            <Label htmlFor="timeline-year">År *</Label>
            <Input
              id="timeline-year"
              type="number"
              value={year}
              onChange={(e) => setYear(e.target.value ? parseInt(e.target.value, 10) : "")}
              placeholder="2024"
              min={1900}
              max={2100}
              className="w-32"
            />
          </div>

          {/* Optional date + time */}
          <div className="space-y-2">
            <Label>Eksakt dato og klokkeslett (valgfritt)</Label>
            <div className="flex gap-2">
              <Input
                type="date"
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
                className="w-40"
              />
              <Input
                type="time"
                value={timeStr}
                onChange={(e) => setTimeStr(e.target.value)}
                className="w-32"
                disabled={!dateStr}
                placeholder="--:--"
              />
            </div>
          </div>

          {/* Visibility */}
          <div className="space-y-2">
            <Label>Synlighet</Label>
            <Select value={visibility} onValueChange={(v) => setVisibility(v as TimelineVisibility)}>
              <SelectTrigger>
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
          <div className="space-y-2">
            <Label htmlFor="timeline-description">Detaljer (valgfritt)</Label>
            <Textarea
              id="timeline-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Fortell litt mer om hendelsen..."
            />
          </div>

          {/* Image (optional) */}
          <div className="space-y-2">
            <Label>Bilde (valgfritt)</Label>
            <div className="flex gap-3 items-center">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setMediaPickerOpen(true)}
                className="flex items-center gap-2"
              >
                <ImageIcon className="w-4 h-4" />
                Velg fra filbank
              </Button>
              {mediaUrl && (
                <div className="relative inline-block">
                  <img
                    src={mediaUrl}
                    alt="Preview"
                    className="w-16 h-16 object-cover rounded-lg border border-border"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-5 w-5 rounded-full"
                    onClick={() => setMediaUrl("")}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              Avbryt
            </Button>
            <Button onClick={handleSave} disabled={isPending || !title.trim() || !year}>
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
