import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChevronDown, User, Plus, Settings, LogOut, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMyPersonas } from "@/hooks/usePersona";

// Custom event for persona changes (same-tab communication)
const PERSONA_CHANGE_EVENT = "personaChanged";

export function useSelectedPersonaId() {
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(() => 
    localStorage.getItem("selectedPersonaId")
  );

  useEffect(() => {
    const handleChange = () => {
      setSelectedPersonaId(localStorage.getItem("selectedPersonaId"));
    };
    window.addEventListener(PERSONA_CHANGE_EVENT, handleChange);
    window.addEventListener("storage", handleChange);
    return () => {
      window.removeEventListener(PERSONA_CHANGE_EVENT, handleChange);
      window.removeEventListener("storage", handleChange);
    };
  }, []);

  return selectedPersonaId;
}

export function PersonaSelector() {
  const { data: personas, isLoading } = useMyPersonas();
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(null);
  
  // Load from localStorage and auto-select first persona if none selected
  useEffect(() => {
    const saved = localStorage.getItem("selectedPersonaId");
    
    if (saved && personas?.some(p => p.id === saved)) {
      // Use saved persona if valid
      setSelectedPersonaId(saved);
    } else if (personas && personas.length > 0) {
      // Auto-select first persona if none saved or invalid
      const firstPersona = personas[0];
      setSelectedPersonaId(firstPersona.id);
      localStorage.setItem("selectedPersonaId", firstPersona.id);
      window.dispatchEvent(new Event(PERSONA_CHANGE_EVENT));
    } else {
      // No personas available, clear selection
      setSelectedPersonaId(null);
      if (saved) {
        localStorage.removeItem("selectedPersonaId");
        window.dispatchEvent(new Event(PERSONA_CHANGE_EVENT));
      }
    }
  }, [personas]);

  const handleSelect = useCallback((id: string | null) => {
    setSelectedPersonaId(id);
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

  const selectedPersona = personas?.find(p => p.id === selectedPersonaId);
  const hasPersonas = personas && personas.length > 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2">
          {selectedPersona ? (
            <>
              <Avatar className="h-5 w-5">
                <AvatarImage src={selectedPersona.avatar_url || undefined} />
                <AvatarFallback className="text-[10px]">
                  {selectedPersona.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="max-w-[120px] truncate">{selectedPersona.name}</span>
            </>
          ) : (
            <>
              <User className="h-4 w-4" />
              <span>Min profil</span>
            </>
          )}
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Du handler som
        </DropdownMenuLabel>
        
        <DropdownMenuItem onClick={() => handleSelect(null)}>
          <User className="h-4 w-4 mr-2" />
          Min profil (privat)
          {!selectedPersonaId && (
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
                {selectedPersonaId === persona.id && (
                  <Badge variant="secondary" className="ml-auto text-xs">Aktiv</Badge>
                )}
              </DropdownMenuItem>
            ))}
          </>
        )}

        <DropdownMenuSeparator />
        
        {/* CTA for personas - enten opprett første eller administrer */}
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
        
        <DropdownMenuItem asChild>
          <Link to="/admin">
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
  );
}
