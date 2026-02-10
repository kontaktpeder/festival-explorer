import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { MediaPicker } from "@/components/admin/MediaPicker";
import {
  useUnifiedTimelineEvents,
  useCreateUnifiedTimelineEvent,
  useUpdateUnifiedTimelineEvent,
  useDeleteUnifiedTimelineEvent,
} from "@/hooks/useUnifiedTimeline";
import { getEventTypeConfig, VISIBILITY_LABELS, PERSONA_EVENT_TYPE_OPTIONS, VENUE_EVENT_TYPE_OPTIONS } from "@/lib/timeline-config";
import type { TimelineSource, EventTypeOption, UnifiedTimelineEvent } from "@/types/timeline";
import type { TimelineVisibility, TimelineEventType } from "@/types/database";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { Plus, Pencil, Trash2, Clock, ImageIcon, X } from "lucide-react";

interface UnifiedTimelineManagerProps {
  source: TimelineSource;
  canEdit: boolean;
  eventTypeOptions?: EventTypeOption[];
  /** Section title. Defaults to "Tidslinje" */
  title?: string;
  /** Helper text below title */
  helperText?: string;
}

export function UnifiedTimelineManager({
  source,
  canEdit,
  eventTypeOptions,
  title = "Tidslinje",
  helperText,
}: UnifiedTimelineManagerProps) {
  const resolvedOptions = eventTypeOptions ?? PERSONA_EVENT_TYPE_OPTIONS;
  const { data: events, isLoading } = useUnifiedTimelineEvents(source, { visibility: "all" });
  const deleteMutation = useDeleteUnifiedTimelineEvent(source);

  const [editingEvent, setEditingEvent] = useState<UnifiedTimelineEvent | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleEdit = (event: UnifiedTimelineEvent | null) => {
    setEditingEvent(event);
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Er du sikker på at du vil slette denne hendelsen?")) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-medium">{title}</h3>
        </div>
        {canEdit && (
          <Button type="button" variant="outline" size="sm" onClick={() => handleEdit(null)}>
            <Plus className="h-4 w-4 mr-1" />
            Legg til
          </Button>
        )}
      </div>

      {helperText && <p className="text-sm text-muted-foreground">{helperText}</p>}

      {isLoading ? (
        <p className="text-sm text-muted-foreground py-4">Laster hendelser...</p>
      ) : !events || events.length === 0 ? (
        <div className="py-6 text-center border border-dashed rounded-lg">
          <p className="text-sm text-muted-foreground">
            Ingen hendelser ennå.{" "}
            {canEdit && "Legg til den første for å fortelle historien."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((event) => {
            const typeConfig = getEventTypeConfig(event.event_type, resolvedOptions);
            const TypeIcon = typeConfig.icon;
            const mediaUrl = event.media?.[0]?.url ?? null;

            return (
              <div
                key={event.id}
                className="flex gap-3 p-3 rounded-lg border border-border/50 bg-card/50 hover:bg-card transition-colors"
              >
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <TypeIcon className="w-4 h-4 text-primary" />
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                    {event.date ? (
                      <span className="flex items-center gap-1">
                        {format(new Date(event.date), "d. MMM yyyy", { locale: nb })}
                        {event.date_to && (
                          <>
                            <span>–</span>
                            {format(new Date(event.date_to), "d. MMM yyyy", { locale: nb })}
                          </>
                        )}
                      </span>
                    ) : event.year ? (
                      <span>
                        {event.year}
                        {event.year_to && event.year_to !== event.year ? `–${event.year_to}` : ""}
                      </span>
                    ) : null}
                    <span>·</span>
                    <Badge variant="outline" className="text-[10px] py-0 h-4">
                      {VISIBILITY_LABELS[event.visibility as TimelineVisibility] || event.visibility}
                    </Badge>
                    <span>·</span>
                    <span>{typeConfig.label}</span>
                  </div>
                  <p className="font-medium text-sm truncate">{event.title}</p>
                  {event.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{event.description}</p>
                  )}
                </div>

                {mediaUrl && (
                  <div className="flex-shrink-0 w-12 h-12 rounded overflow-hidden border border-border/30">
                    <img src={mediaUrl} alt="" className="w-full h-full object-cover" />
                  </div>
                )}

                {canEdit && (
                  <div className="flex-shrink-0 flex flex-col gap-1">
                    <Button type="button" variant="ghost" size="icon" onClick={() => handleEdit(event)} className="h-8 w-8 p-0">
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
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
            if (!open) {
              setDialogOpen(false);
              setEditingEvent(null);
            }
          }}
          source={source}
          existingEvent={editingEvent}
          eventTypeOptions={resolvedOptions}
        />
      )}
    </div>
  );
}

// ─── Dialog ─────────────────────────────────────────────────

interface TimelineEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  source: TimelineSource;
  existingEvent: UnifiedTimelineEvent | null;
  eventTypeOptions: EventTypeOption[];
}

function TimelineEventDialog({
  open,
  onOpenChange,
  source,
  existingEvent,
  eventTypeOptions,
}: TimelineEventDialogProps) {
  const isEditing = !!existingEvent;
  const defaultEventType = eventTypeOptions[0]?.value ?? ("milestone" as TimelineEventType);
  const createMutation = useCreateUnifiedTimelineEvent(source);
  const updateMutation = useUpdateUnifiedTimelineEvent(source);

  const [eventType, setEventType] = useState<TimelineEventType>(defaultEventType);
  const [title, setTitle] = useState("");
  const [yearFrom, setYearFrom] = useState<number | "">("");
  const [monthFrom, setMonthFrom] = useState<number | "">("");
  const [dayFrom, setDayFrom] = useState<number | "">("");
  const [timeFrom, setTimeFrom] = useState("");
  const [yearTo, setYearTo] = useState<number | "">("");
  const [monthTo, setMonthTo] = useState<number | "">("");
  const [dayTo, setDayTo] = useState<number | "">("");
  const [timeTo, setTimeTo] = useState("");
  const [visibility, setVisibility] = useState<TimelineVisibility>("public");
  const [description, setDescription] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);

  function fromStoredDate(
    storedDate: string | null | undefined,
    storedYear: number | null | undefined
  ) {
    if (storedDate) {
      // Parse date string directly to avoid timezone shift
      const dateVal = typeof storedDate === "string" ? storedDate : "";
      const datePart = dateVal.slice(0, 10); // "YYYY-MM-DD"
      const match = datePart.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (match) {
        const y = parseInt(match[1], 10);
        const m = parseInt(match[2], 10);
        const d = parseInt(match[3], 10);
        // Extract time if present (e.g. "2024-06-15T14:30:00")
        const timeMatch = dateVal.match(/T(\d{2}):(\d{2})/);
        const hasTime = timeMatch && (timeMatch[1] !== "00" || timeMatch[2] !== "00");
        return {
          year: y as number | "",
          month: m as number | "",
          day: d as number | "",
          time: hasTime ? `${timeMatch![1]}:${timeMatch![2]}` : "",
        };
      }
    }
    if (storedYear != null) {
      return { year: storedYear as number | "", month: "" as number | "", day: "" as number | "", time: "" };
    }
    return { year: "" as number | "", month: "" as number | "", day: "" as number | "", time: "" };
  }

  // Build YYYY-MM-DD string directly – no timezone conversion
  function toDateStr(year: number | "", month: number | "", day: number | "", time: string): string | null {
    if (year === "" || year == null) return null;
    const y = Number(year);
    const m = month !== "" && month != null ? Number(month) : 1;
    const d = day !== "" && day != null ? Number(day) : 1;
    const dateStr = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    // DB column is DATE, so just send YYYY-MM-DD (time is ignored by date columns)
    return dateStr;
  }

  useEffect(() => {
    if (open) {
      setEventType((existingEvent?.event_type as TimelineEventType) ?? defaultEventType);
      setTitle(existingEvent?.title ?? "");
      setVisibility((existingEvent?.visibility as TimelineVisibility) ?? "public");
      setDescription(existingEvent?.description ?? "");
      setMediaUrl(existingEvent?.media?.[0]?.url ?? "");

      const from = fromStoredDate(existingEvent?.date, existingEvent?.year);
      setYearFrom(from.year);
      setMonthFrom(from.month);
      setDayFrom(from.day);
      setTimeFrom(from.time);

      const to = fromStoredDate(existingEvent?.date_to, existingEvent?.year_to ?? undefined);
      setYearTo(to.year);
      setMonthTo(to.month);
      setDayTo(to.day);
      setTimeTo(to.time);
    }
  }, [open, existingEvent, defaultEventType]);

  const handleSave = async () => {
    if (!title.trim() || yearFrom === "") return;

    const payload: Omit<UnifiedTimelineEvent, "id" | "created_at" | "updated_at"> = {
      title: title.trim(),
      event_type: eventType,
      visibility,
      date: (monthFrom !== "" || dayFrom !== "" || timeFrom) ? toDateStr(yearFrom, monthFrom, dayFrom, timeFrom) : null,
      date_to: (yearTo !== "" && (monthTo !== "" || dayTo !== "" || timeTo)) ? toDateStr(yearTo, monthTo, dayTo, timeTo) : null,
      year: typeof yearFrom === "number" ? yearFrom : null,
      year_to: typeof yearTo === "number" ? yearTo : null,
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
        await createMutation.mutateAsync(payload);
      }
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to save timeline event:", error);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-[calc(100vw-1rem)] sm:w-full max-h-[calc(100vh-2rem)] overflow-y-auto">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-base sm:text-lg">{isEditing ? "Rediger hendelse" : "Ny hendelse"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 sm:space-y-4 pt-1">
          {/* Category */}
          <div className="space-y-1.5">
            <Label className="text-sm">Kategori</Label>
            <Select value={eventType} onValueChange={(v) => setEventType(v as TimelineEventType)}>
              <SelectTrigger className="h-9 sm:h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-[40vh]">
                {eventTypeOptions.map((opt) => {
                  const Icon = opt.icon;
                  return (
                    <SelectItem key={opt.value} value={opt.value}>
                      <span className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        {opt.label}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <Label className="text-sm">Tittel *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="F.eks. Første festivalopptreden"
              className="h-9 sm:h-10"
            />
          </div>

          {/* Fra */}
          <div className="space-y-1.5">
            <Label className="text-sm">Fra *</Label>
            <div className="flex flex-wrap gap-2 items-center">
              <Input
                type="number"
                value={yearFrom === "" ? "" : yearFrom}
                onChange={(e) => {
                  const v = e.target.value ? parseInt(e.target.value, 10) : ("" as const);
                  setYearFrom(v);
                  if (v === "") { setMonthFrom(""); setDayFrom(""); setTimeFrom(""); }
                }}
                placeholder="År"
                min={1900}
                max={2100}
                className="w-20 h-9 sm:h-10"
              />
              {yearFrom !== "" && (
                <Select
                  value={monthFrom === "" ? "none" : String(monthFrom)}
                  onValueChange={(v) => {
                    const m = v === "none" ? ("" as const) : parseInt(v, 10);
                    setMonthFrom(m);
                    if (m === "") { setDayFrom(""); setTimeFrom(""); }
                  }}
                >
                  <SelectTrigger className="w-[120px] h-9 sm:h-10">
                    <SelectValue placeholder="Måned" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[40vh]">
                    <SelectItem value="none">Kun år</SelectItem>
                    {[1,2,3,4,5,6,7,8,9,10,11,12].map((m) => (
                      <SelectItem key={m} value={String(m)}>
                        {new Date(2000, m - 1, 1).toLocaleDateString("nb-NO", { month: "long" })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {monthFrom !== "" && (
                <Input
                  type="number"
                  value={dayFrom === "" ? "" : dayFrom}
                  onChange={(e) => {
                    const d = e.target.value ? parseInt(e.target.value, 10) : ("" as const);
                    setDayFrom(d);
                    if (d === "") setTimeFrom("");
                  }}
                  placeholder="Dag"
                  min={1}
                  max={31}
                  className="w-16 h-9 sm:h-10"
                />
              )}
              {monthFrom !== "" && dayFrom !== "" && (
                <Input
                  type="time"
                  value={timeFrom}
                  onChange={(e) => setTimeFrom(e.target.value)}
                  className="w-28 h-9 sm:h-10"
                />
              )}
            </div>
          </div>

          {/* Til */}
          {yearFrom !== "" && (
            <div className="space-y-1.5">
              <Label className="text-sm">Til (valgfritt)</Label>
              <div className="flex flex-wrap gap-2 items-center">
                <Input
                  type="number"
                  value={yearTo === "" ? "" : yearTo}
                  onChange={(e) => {
                    const v = e.target.value ? parseInt(e.target.value, 10) : ("" as const);
                    setYearTo(v);
                    if (v === "") { setMonthTo(""); setDayTo(""); setTimeTo(""); }
                  }}
                  placeholder="År"
                  min={1900}
                  max={2100}
                  className="w-20 h-9 sm:h-10"
                />
                {yearTo !== "" && (
                  <Select
                    value={monthTo === "" ? "none" : String(monthTo)}
                    onValueChange={(v) => {
                      const m = v === "none" ? ("" as const) : parseInt(v, 10);
                      setMonthTo(m);
                      if (m === "") { setDayTo(""); setTimeTo(""); }
                    }}
                  >
                    <SelectTrigger className="w-[120px] h-9 sm:h-10">
                      <SelectValue placeholder="Måned" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[40vh]">
                      <SelectItem value="none">Kun år</SelectItem>
                      {[1,2,3,4,5,6,7,8,9,10,11,12].map((m) => (
                        <SelectItem key={m} value={String(m)}>
                          {new Date(2000, m - 1, 1).toLocaleDateString("nb-NO", { month: "long" })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {monthTo !== "" && (
                  <Input
                    type="number"
                    value={dayTo === "" ? "" : dayTo}
                    onChange={(e) => {
                      const d = e.target.value ? parseInt(e.target.value, 10) : ("" as const);
                      setDayTo(d);
                      if (d === "") setTimeTo("");
                    }}
                    placeholder="Dag"
                    min={1}
                    max={31}
                    className="w-16 h-9 sm:h-10"
                  />
                )}
                {monthTo !== "" && dayTo !== "" && (
                  <Input
                    type="time"
                    value={timeTo}
                    onChange={(e) => setTimeTo(e.target.value)}
                    className="w-28 h-9 sm:h-10"
                  />
                )}
              </div>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Fyll kun år, år og måned, eller full dato. Klokkeslett kan settes når dag er valgt.
          </p>

          {/* Visibility */}
          <div className="space-y-1.5">
            <Label className="text-sm">Synlighet</Label>
            <Select value={visibility} onValueChange={(v) => setVisibility(v as TimelineVisibility)}>
              <SelectTrigger className="h-9 sm:h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">Offentlig</SelectItem>
                <SelectItem value="pro">Pro (kun bransje)</SelectItem>
                <SelectItem value="private">Privat (kun deg)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-sm">Detaljer (valgfritt)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="min-h-[60px] sm:min-h-[80px]"
              placeholder="Fortell litt mer om hendelsen..."
            />
          </div>

          {/* Image */}
          <div className="space-y-1.5">
            <Label className="text-sm">Bilde (valgfritt)</Label>
            <div className="flex gap-2 sm:gap-3 items-center flex-wrap">
              <Button type="button" variant="outline" size="sm" onClick={() => setMediaPickerOpen(true)} className="flex items-center gap-2 h-8 sm:h-9 text-xs sm:text-sm">
                <ImageIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                Velg fra filbank
              </Button>
              {mediaUrl && (
                <div className="relative inline-block">
                  <img src={mediaUrl} alt="Preview" className="w-12 h-12 sm:w-16 sm:h-16 object-cover rounded-lg border border-border" />
                  <Button type="button" variant="destructive" size="icon" className="absolute -top-1.5 -right-1.5 sm:-top-2 sm:-right-2 h-4 w-4 sm:h-5 sm:w-5 rounded-full" onClick={() => setMediaUrl("")}>
                    <X className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-3 border-t border-border/50">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending} className="w-full sm:w-auto h-9 sm:h-10">
              Avbryt
            </Button>
            <Button onClick={handleSave} disabled={isPending || !title.trim() || yearFrom === ""} className="w-full sm:w-auto h-9 sm:h-10">
              {isPending ? "Lagrer..." : "Lagre"}
            </Button>
          </div>
        </div>

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
