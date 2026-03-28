import { useEffect, useMemo, useState } from "react";
import type { LiveCardItem } from "@/lib/runsheet-live-view-model";

export function useLivePlanNow(liveItems: LiveCardItem[]): Date {
  const [planNow, setPlanNow] = useState(() => new Date());

  const nearCriticalStart = useMemo(() => {
    const now = planNow.getTime();
    for (const item of liveItems) {
      const d = item.effectiveStartMs - now;
      if (d >= -120_000 && d <= 120_000) return true;
    }
    return false;
  }, [liveItems, planNow]);

  useEffect(() => {
    const ms = nearCriticalStart ? 5000 : 30000;
    const id = setInterval(() => setPlanNow(new Date()), ms);
    return () => clearInterval(id);
  }, [nearCriticalStart]);

  return planNow;
}
