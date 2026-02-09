import { useState, useCallback, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ChevronDown, User, Plus, HelpCircle, Sparkles, Settings, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMyPersonas } from "@/hooks/usePersona";
import { useSelectedPersonaId } from "@/components/dashboard/PersonaSelector";
import { getPersonaTypeLabel, getPersonaTypeDescription } from "@/lib/role-model-helpers";

const PERSONA_CHANGE_EVENT = "personaChanged";

export function PersonaModusBar() {
  const { data: personas, isLoading } = useMyPersonas();
  const selectedPersonaId = useSelectedPersonaId();

  const [localSelectedId, setLocalSelectedId] = useState<string | null>(null);

  // Sync with global state
  useEffect(() => {
    setLocalSelectedId(selectedPersonaId);
  }, [selectedPersonaId]);

  // Auto-select first persona
  useEffect(() => {
    if (!isLoading && personas && personas.length > 0 && !localSelectedId) {
      const saved = localStorage.getItem("selectedPersonaId");
      if (saved && personas.some((p) => p.id === saved)) {
        setLocalSelectedId(saved);
      } else {
        const first = personas[0];
        setLocalSelectedId(first.id);
        localStorage.setItem("selectedPersonaId", first.id);
        window.dispatchEvent(new Event(PERSONA_CHANGE_EVENT));
      }
    }
  }, [isLoading, personas, localSelectedId]);

  const handleSelect = useCallback((id: string | null) => {
    setLocalSelectedId(id);
    if (id) {
      localStorage.setItem("selectedPersonaId", id);
    } else {
      localStorage.removeItem("selectedPersonaId");
    }
    window.dispatchEvent(new Event(PERSONA_CHANGE_EVENT));
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const selectedPersona = personas?.find((p) => p.id === localSelectedId);
  const hasPersonas = personas && personas.length > 0;
  const typeLabel = getPersonaTypeLabel(selectedPersona?.type);
  const typeDescription = getPersonaTypeDescription(selectedPersona?.type);

  return (
    <div className="border-b border-border/20 bg-background/60 backdrop-blur-md">
      <div className="max-w-3xl mx-auto px-3 sm:px-6 py-2.5 flex items-center justify-between gap-3">
        {/* Left: active persona chip */}
        <div className="flex items-center gap-2.5 min-w-0">
          <Avatar className="h-5 w-5 shrink-0">
            {selectedPersona?.avatar_url ? (
              <AvatarImage src={selectedPersona.avatar_url} alt={selectedPersona.name} />
            ) : null}
            <AvatarFallback className="text-[8px] bg-muted text-muted-foreground">
              {(selectedPersona?.name || "P").charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <span className="text-sm font-medium text-foreground truncate">
            {selectedPersona?.name ?? "Min profil"}
          </span>

          {typeLabel && (
            <Badge
              variant="outline"
              className="text-[10px] uppercase tracking-wider text-muted-foreground font-normal px-2 py-0 border-border/30 shrink-0"
            >
              {typeLabel}
            </Badge>
          )}
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Switch persona dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground h-8 px-2.5">
                <span className="text-xs hidden sm:inline">Bytt</span>
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Du handler som
              </DropdownMenuLabel>

              <DropdownMenuItem onClick={() => handleSelect(null)}>
                <User className="h-4 w-4 mr-2" />
                Min profil (privat)
                {!localSelectedId && (
                  <Badge variant="secondary" className="ml-auto text-xs">Aktiv</Badge>
                )}
              </DropdownMenuItem>

              {!isLoading && hasPersonas && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-xs text-muted-foreground">
                    Offentlige profiler
                  </DropdownMenuLabel>
                  {personas.map((persona) => (
                    <DropdownMenuItem
                      key={persona.id}
                      onClick={() => handleSelect(persona.id)}
                    >
                      <Avatar className="h-4 w-4 mr-2">
                        <AvatarImage src={persona.avatar_url || undefined} />
                        <AvatarFallback className="text-[8px]">
                          {persona.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="truncate flex-1">{persona.name}</span>
                      {!persona.is_public && (
                        <Badge variant="outline" className="ml-1 text-[10px]">Privat</Badge>
                      )}
                      {localSelectedId === persona.id && (
                        <Badge variant="secondary" className="ml-auto text-xs">Aktiv</Badge>
                      )}
                    </DropdownMenuItem>
                  ))}
                </>
              )}

              <DropdownMenuSeparator />

              {!hasPersonas && !isLoading && (
                <DropdownMenuItem asChild className="bg-accent/10 hover:bg-accent/20">
                  <Link to="/dashboard/personas/new" className="flex items-center">
                    <Sparkles className="h-4 w-4 mr-2 text-accent" />
                    <span className="font-medium">Opprett din første profil</span>
                  </Link>
                </DropdownMenuItem>
              )}

              {hasPersonas && (
                <>
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard/personas">
                      <User className="h-4 w-4 mr-2" />
                      Mine profiler
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard/personas/new">
                      <Plus className="h-4 w-4 mr-2" />
                      Opprett ny profil
                    </Link>
                  </DropdownMenuItem>
                </>
              )}

              <DropdownMenuSeparator />

              <DropdownMenuItem asChild>
                <Link to="/dashboard/settings">
                  <Settings className="h-4 w-4 mr-2" />
                  Innstillinger
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                <LogOut className="h-4 w-4 mr-2" />
                Logg ut
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Help popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground h-8 w-8 p-0">
                <HelpCircle className="h-3.5 w-3.5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-72 text-sm">
              <p className="font-medium text-foreground mb-2">
                {typeLabel ? `Du er ${typeLabel.toLowerCase()}` : "Hva kan jeg gjøre?"}
              </p>
              <p className="text-muted-foreground text-xs leading-relaxed">
                {typeDescription}
              </p>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
}
