import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Shield } from "lucide-react";
import type { LiveRolePreset } from "@/types/live-role";

type Props = {
  title: string;
  role: LiveRolePreset;
  showAdminBadge: boolean;
};

const ROLE_LABELS: Record<string, string> = {
  viewer: "Leser",
  crew: "Crew",
  editor: "Editor",
  admin: "Admin",
};

function hhmmss(d: Date) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
}

export function LiveHeader({ title, role, showAdminBadge }: Props) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <header className="flex items-center justify-between border-b border-border/30 pb-4 mb-6">
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center gap-2 text-destructive text-xs font-bold uppercase tracking-wider">
          <span className="h-2.5 w-2.5 rounded-full bg-destructive animate-pulse" />
          Live
        </span>
        <span className="font-mono text-2xl md:text-3xl font-bold text-foreground tabular-nums">
          {hhmmss(now)}
        </span>
      </div>

      <p className="hidden md:block text-sm text-muted-foreground truncate px-4 max-w-xs">
        {title}
      </p>

      <div className="flex items-center gap-2">
        {showAdminBadge && (
          <Badge variant="destructive" className="text-[10px]">
            <Shield className="h-3 w-3 mr-1" />
            Admin
          </Badge>
        )}
        <Badge variant="outline" className="text-[10px]">
          {ROLE_LABELS[role] ?? role}
        </Badge>
      </div>
    </header>
  );
}
