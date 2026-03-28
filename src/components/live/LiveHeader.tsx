import { useEffect, useState } from "react";
import type { LiveRolePreset } from "@/types/live-role";
import type { SoundMode } from "@/hooks/useLiveSoundAlerts";
import { Volume2, VolumeX, Bell } from "lucide-react";

type Props = {
  title: string;
  role: LiveRolePreset;
  showAdminBadge?: boolean;
  soundMode: SoundMode;
  onSoundModeChange: (m: SoundMode) => void;
  soundUnlocked: boolean;
  onUnlock: () => void;
};

const ROLE_LABELS: Record<string, string> = {
  viewer: "LESER",
  crew: "CREW",
  editor: "EDITOR",
  admin: "ADMIN",
};

function hhmmss(d: Date) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
}

export function LiveHeader({ title, role, showAdminBadge, soundMode, onSoundModeChange, soundUnlocked, onUnlock }: Props) {
  const MODES: { key: SoundMode; label: string }[] = [
    { key: "off", label: "Av" },
    { key: "critical", label: "Kritisk" },
    { key: "all", label: "Alle" },
  ];
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <header className="flex items-center justify-between py-3 md:py-4 mb-2">
      <div className="flex items-center gap-3 md:gap-4">
        <span className="inline-flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-60" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.7)]" />
          </span>
          <span className="text-red-500 text-xs font-bold uppercase tracking-[0.2em]">
            Live
          </span>
        </span>

        <span className="font-mono text-3xl md:text-4xl font-bold text-white/90 tabular-nums tracking-tight">
          {hhmmss(now)}
        </span>
      </div>

      <p className="hidden md:block text-sm text-white/30 truncate px-4 max-w-xs font-medium">
        {title}
      </p>

      <div className="flex items-center gap-2">
        {!soundUnlocked ? (
          <button
            onClick={onUnlock}
            className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-400/70 border border-amber-500/25 rounded px-2 py-1 hover:border-amber-500/50 active:bg-amber-500/10 transition-colors"
          >
            <VolumeX className="h-3 w-3" />
            Aktiver lyd
          </button>
        ) : (
          <div className="flex items-center rounded border border-white/10 overflow-hidden">
            {MODES.map((m) => (
              <button
                key={m.key}
                onClick={() => onSoundModeChange(m.key)}
                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 transition-colors ${
                  soundMode === m.key
                    ? "bg-white/10 text-white/80"
                    : "text-white/30 hover:text-white/50"
                }`}
              >
                {m.key === "off" ? <VolumeX className="h-3 w-3" /> : m.key === "all" ? <Volume2 className="h-3 w-3" /> : <Bell className="h-3 w-3" />}
              </button>
            ))}
          </div>
        )}

        {showAdminBadge && (
          <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-red-400 border border-red-500/30 rounded px-2 py-0.5">
            Admin
          </span>
        )}
        <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/40 border border-white/10 rounded px-2 py-0.5">
          {ROLE_LABELS[role] ?? role}
        </span>
      </div>
    </header>
  );
}
