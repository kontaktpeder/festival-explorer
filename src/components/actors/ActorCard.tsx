import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  MoreHorizontal,
  Check,
  Clock,
  Wifi,
  WifiOff,
  X,
  Send,
  Trash2,
  ArrowRightLeft,
  Shield,
} from "lucide-react";
import { useSignedMediaUrl } from "@/hooks/useSignedMediaUrl";
import type { ActorItem, ActorZoneKey } from "@/hooks/useEventActors";
import { ACTOR_ZONES } from "@/hooks/useEventActors";

interface ActorCardProps {
  item: ActorItem;
  currentZone: ActorZoneKey;
  onResend?: (id: string) => void;
  onRevoke?: (id: string) => void;
  onRemove?: (id: string) => void;
  onChangeZone?: (id: string, zone: ActorZoneKey) => void;
  onChangeLiveRole?: (id: string, role: string) => void;
}

const STATUS_CONFIG = {
  active: {
    label: "Aktiv",
    icon: Check,
    className: "bg-emerald-500/15 text-emerald-500 border-emerald-500/20",
  },
  invited: {
    label: "Invitert",
    icon: Clock,
    className: "bg-amber-500/15 text-amber-500 border-amber-500/20",
  },
  offline: {
    label: "Offline",
    icon: WifiOff,
    className: "bg-muted text-muted-foreground border-border/30",
  },
  declined: {
    label: "Avslått",
    icon: X,
    className: "bg-destructive/15 text-destructive border-destructive/20 opacity-60",
  },
  revoked: {
    label: "Trukket",
    icon: X,
    className: "bg-muted text-muted-foreground border-border/30 opacity-40",
  },
} as const;

const LIVE_ROLES = [
  { value: "viewer", label: "Leser" },
  { value: "crew", label: "Crew" },
  { value: "editor", label: "Editor" },
  { value: "admin", label: "Admin" },
];

function ActorAvatar({ url, name }: { url: string | null; name: string }) {
  const signedUrl = useSignedMediaUrl(url, "public");
  return (
    <Avatar className="h-9 w-9">
      {signedUrl && <AvatarImage src={signedUrl} alt={name} />}
      <AvatarFallback className="text-xs bg-muted text-muted-foreground">
        {name.charAt(0).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  );
}

export function ActorCard({
  item,
  currentZone,
  onResend,
  onRevoke,
  onRemove,
  onChangeZone,
  onChangeLiveRole,
}: ActorCardProps) {
  const isParticipant = item.type === "participant";
  const isInvitation = item.type === "invitation";

  const name = isParticipant
    ? item.data.name || item.data.role_label || "Ukjent"
    : item.data.name || item.data.entity?.name || item.data.email || "Ukjent";

  const subtitle = isParticipant
    ? item.data.role_label || item.data.type || null
    : isInvitation && item.data.email
    ? item.data.email
    : null;

  const avatarUrl = isParticipant ? item.data.avatar_url || null : null;
  const statusCfg = STATUS_CONFIG[item.status];
  const StatusIcon = statusCfg.icon;

  const itemId = isParticipant ? item.data.id : item.data.id;
  const liveRole = isParticipant ? item.data.live_role : null;

  return (
    <div className={`flex items-center gap-3 py-2.5 px-3 rounded-lg group hover:bg-muted/10 transition-colors ${item.status === "declined" ? "opacity-50" : ""}`}>
      <ActorAvatar url={avatarUrl} name={name} />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{name}</p>
        {subtitle && (
          <p className="text-[11px] text-muted-foreground truncate">{subtitle}</p>
        )}
      </div>

      <Badge variant="outline" className={`text-[10px] shrink-0 ${statusCfg.className}`}>
        <StatusIcon className="h-2.5 w-2.5 mr-1" />
        {statusCfg.label}
      </Badge>

      {/* Inline action for invitations */}
      {isInvitation && item.status === "invited" && onResend && (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-[11px] text-muted-foreground hover:text-foreground shrink-0"
          onClick={() => onResend(itemId)}
        >
          <Send className="h-3 w-3 mr-1" />
          Send på nytt
        </Button>
      )}

      {/* 3-dot menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {/* Change zone */}
          {isParticipant && onChangeZone && (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="text-xs">
                <ArrowRightLeft className="h-3.5 w-3.5 mr-2" />
                Endre sone
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {ACTOR_ZONES.map(z => (
                  <DropdownMenuItem
                    key={z.key}
                    className="text-xs"
                    disabled={z.key === currentZone}
                    onClick={() => onChangeZone(itemId, z.key)}
                  >
                    {z.label}
                    {z.key === currentZone && <Check className="h-3 w-3 ml-auto" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          )}

          {/* Change live role */}
          {isParticipant && onChangeLiveRole && (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="text-xs">
                <Shield className="h-3.5 w-3.5 mr-2" />
                Tilgang
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {LIVE_ROLES.map(r => (
                  <DropdownMenuItem
                    key={r.value}
                    className="text-xs"
                    onClick={() => onChangeLiveRole(itemId, r.value)}
                  >
                    {r.label}
                    {liveRole === r.value && <Check className="h-3 w-3 ml-auto" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          )}

          {(isParticipant && onChangeZone) && <DropdownMenuSeparator />}

          {/* Resend (invitation only) */}
          {isInvitation && item.status === "invited" && onResend && (
            <DropdownMenuItem className="text-xs" onClick={() => onResend(itemId)}>
              <Send className="h-3.5 w-3.5 mr-2" />
              Send på nytt
            </DropdownMenuItem>
          )}

          {/* Revoke invitation */}
          {isInvitation && item.status === "invited" && onRevoke && (
            <DropdownMenuItem className="text-xs text-destructive" onClick={() => onRevoke(itemId)}>
              <X className="h-3.5 w-3.5 mr-2" />
              Trekk tilbake
            </DropdownMenuItem>
          )}

          {/* Remove */}
          {onRemove && (
            <DropdownMenuItem className="text-xs text-destructive" onClick={() => onRemove(itemId)}>
              <Trash2 className="h-3.5 w-3.5 mr-2" />
              Fjern
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
