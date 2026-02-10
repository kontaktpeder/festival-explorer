import {
  Sparkles, Palette, Users2, Star, Mic2,
  GraduationCap, BookOpen, Trophy, RefreshCw, Target,
  Building2, Lightbulb, Calendar, Music, Wrench, AlertCircle, RotateCw, Compass,
} from "lucide-react";
import type { EventTypeOption } from "@/types/timeline";
import type { TimelineEventType, TimelineVisibility } from "@/types/database";

// Persona/Artist event type options
export const PERSONA_EVENT_TYPE_OPTIONS: EventTypeOption[] = [
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
export const VENUE_EVENT_TYPE_OPTIONS: EventTypeOption[] = [
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

// Combined lookup map for icon resolution (used by public timeline display)
export const ALL_EVENT_TYPE_OPTIONS: EventTypeOption[] = [
  ...PERSONA_EVENT_TYPE_OPTIONS,
  ...VENUE_EVENT_TYPE_OPTIONS.filter(
    (v) => !PERSONA_EVENT_TYPE_OPTIONS.some((p) => p.value === v.value)
  ),
];

export const VISIBILITY_LABELS: Record<TimelineVisibility, string> = {
  public: "Offentlig",
  pro: "Pro",
  private: "Privat",
};

export function getEventTypeConfig(
  eventType: string,
  options?: EventTypeOption[]
): EventTypeOption {
  const list = options ?? ALL_EVENT_TYPE_OPTIONS;
  return list.find((o) => o.value === eventType) ?? { value: "milestone" as TimelineEventType, label: "Milepæler", icon: Star };
}
