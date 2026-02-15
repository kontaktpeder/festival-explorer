import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSignedMediaUrl } from "@/hooks/useSignedMediaUrl";
import { getPersonaTypeLabel } from "@/lib/role-model-helpers";
import { Pencil, ChevronDown, Plus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMyPersonas } from "@/hooks/usePersona";
import { useSelectedPersonaId } from "@/components/dashboard/PersonaSelector";

const PERSONA_CHANGE_EVENT = "personaChanged";

interface ActivePersonaCardProps {
  persona: {
    id: string;
    name: string;
    avatar_url?: string | null;
    type?: string | null;
  };
}

export function ActivePersonaCard({ persona }: ActivePersonaCardProps) {
  const imageUrl = useSignedMediaUrl(persona.avatar_url ?? null, "public");
  const typeLabel = getPersonaTypeLabel(persona.type);
  const { data: personas } = useMyPersonas();
  const selectedPersonaId = useSelectedPersonaId();

  const handleSelect = (id: string | null) => {
    if (id) localStorage.setItem("selectedPersonaId", id);
    else localStorage.removeItem("selectedPersonaId");
    window.dispatchEvent(new Event(PERSONA_CHANGE_EVENT));
  };

  return (
    <div className="p-4 rounded-lg bg-card/60 border border-border/30 space-y-3">
      <div className="flex items-center gap-3">
        <Avatar className="h-12 w-12 ring-2 ring-border/50 shrink-0">
          {imageUrl ? (
            <AvatarImage src={imageUrl} className="object-cover" />
          ) : null}
          <AvatarFallback className="text-sm bg-muted text-muted-foreground font-medium">
            {persona.name.substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] text-muted-foreground">Du handler som</p>
          <p className="text-sm font-semibold text-foreground truncate">{persona.name}</p>
          {typeLabel && (
            <Badge variant="secondary" className="text-[10px] font-normal px-1.5 py-0 mt-0.5">
              {typeLabel}
            </Badge>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button asChild variant="outline" size="sm" className="flex-1">
          <Link to={`/dashboard/personas/${persona.id}`}>
            <Pencil className="h-3 w-3 mr-1.5" />
            Rediger profil
          </Link>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              Bytt
              <ChevronDown className="h-3 w-3 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-popover">
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Velg profil
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {personas?.map((p) => (
              <DropdownMenuItem key={p.id} onClick={() => handleSelect(p.id)}>
                <span className="truncate flex-1">{p.name}</span>
                {selectedPersonaId === p.id && (
                  <Badge variant="secondary" className="ml-auto text-[10px]">Aktiv</Badge>
                )}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/dashboard/personas/new">
                <Plus className="h-4 w-4 mr-2" />
                Opprett ny profil
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
