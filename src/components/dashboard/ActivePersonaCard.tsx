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
    <div className="flex items-center gap-4">
      <Avatar className="h-14 w-14 sm:h-16 sm:w-16 ring-2 ring-border/50 shrink-0">
        {imageUrl ? (
          <AvatarImage src={imageUrl} className="object-cover" />
        ) : null}
        <AvatarFallback className="text-base sm:text-lg bg-muted text-muted-foreground font-medium">
          {persona.name.substring(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-muted-foreground/60">Du handler som</p>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground tracking-tight truncate">
          {persona.name}
        </h1>
        <div className="flex items-center gap-2 mt-1">
          {typeLabel && (
            <Badge variant="secondary" className="text-[10px] font-normal px-1.5 py-0">
              {typeLabel}
            </Badge>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              Bytt
              <ChevronDown className="h-3 w-3 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-popover">
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Velg profil
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to={`/dashboard/personas/${persona.id}`}>
                <Pencil className="h-4 w-4 mr-2" />
                Rediger profil
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {personas?.map((p) => (
              <DropdownMenuItem key={p.id} onClick={() => handleSelect(p.id)}>
                <Avatar className="h-4 w-4 mr-2">
                  <AvatarImage src={p.avatar_url || undefined} />
                  <AvatarFallback className="text-[8px]">
                    {p.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
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
