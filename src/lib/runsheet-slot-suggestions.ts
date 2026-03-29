const MAX = 20;

export interface SlotSuggestionBucket {
  titles: string[];
  areas: string[];
}

function uniqCap(arr: string[], max: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of arr) {
    const s = raw.trim();
    if (!s || seen.has(s)) continue;
    seen.add(s);
    out.push(s);
    if (out.length >= max) break;
  }
  return out;
}

export function suggestionsStorageKey(
  eventId: string | null | undefined,
  festivalId: string | null | undefined
): string | null {
  if (eventId) return `giggen_slot_suggestions_${eventId}`;
  if (festivalId) return `giggen_slot_suggestions_festival_${festivalId}`;
  return null;
}

export function loadSlotSuggestions(key: string): SlotSuggestionBucket {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return { titles: [], areas: [] };
    const j = JSON.parse(raw) as SlotSuggestionBucket;
    return {
      titles: Array.isArray(j.titles) ? j.titles : [],
      areas: Array.isArray(j.areas) ? j.areas : [],
    };
  } catch {
    return { titles: [], areas: [] };
  }
}

export function saveSlotSuggestions(
  key: string,
  bucket: SlotSuggestionBucket
): void {
  try {
    localStorage.setItem(
      key,
      JSON.stringify({
        titles: uniqCap(bucket.titles, MAX),
        areas: uniqCap(bucket.areas, MAX),
      })
    );
  } catch {
    /* ignore */
  }
}

export function mergeFromSlots(
  key: string,
  slots: { title_override?: string | null; stage_label?: string | null }[]
): SlotSuggestionBucket {
  const prev = loadSlotSuggestions(key);
  const titles = [...prev.titles];
  const areas = [...prev.areas];
  for (const s of slots) {
    if (s.title_override?.trim()) titles.push(s.title_override.trim());
    if (s.stage_label?.trim()) areas.push(s.stage_label.trim());
  }
  const next = {
    titles: uniqCap(titles, MAX),
    areas: uniqCap(areas, MAX),
  };
  saveSlotSuggestions(key, next);
  return next;
}

export function rememberSlotFields(
  key: string | null,
  title: string,
  area: string
): void {
  if (!key) return;
  const prev = loadSlotSuggestions(key);
  const titles = uniqCap([title.trim(), ...prev.titles], MAX);
  const areas = uniqCap([area.trim(), ...prev.areas], MAX);
  saveSlotSuggestions(key, { titles, areas });
}
