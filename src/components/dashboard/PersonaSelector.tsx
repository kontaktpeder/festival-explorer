import { useState, useEffect } from "react";
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
import { ChevronDown, User, Plus, Settings, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMyPersonas } from "@/hooks/usePersona";

export function PersonaSelector() {
  const { data: personas, isLoading } = useMyPersonas();
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(null);
  
  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("selectedPersonaId");
    if (saved && personas?.some(p => p.id === saved)) {
      setSelectedPersonaId(saved);
    } else if (saved && personas && !personas.some(p => p.id === saved)) {
      // Clear invalid selection
      localStorage.removeItem("selectedPersonaId");
      setSelectedPersonaId(null);
    }
  }, [personas]);

  const handleSelect = (id: string | null) => {
    setSelectedPersonaId(id);
    if (id) {
      localStorage.setItem("selectedPersonaId", id);
    } else {
      localStorage.removeItem("selectedPersonaId");
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const selectedPersona = personas?.find(p => p.id === selectedPersonaId);

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
      <DropdownMenuContent align="end" className="w-56">
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

        {!isLoading && personas && personas.length > 0 && (
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
        
        <DropdownMenuItem asChild>
          <Link to="/dashboard/personas/new">
            <Plus className="h-4 w-4 mr-2" />
            Opprett profil
          </Link>
        </DropdownMenuItem>
        
        <DropdownMenuItem asChild>
          <Link to="/admin">
            <Settings className="h-4 w-4 mr-2" />
            Admin panel
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
