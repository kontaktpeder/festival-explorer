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
import { ChevronDown, User, Building2, Users, Settings, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { EntityWithAccess, EntityType } from "@/types/database";

const TYPE_ICONS: Record<EntityType, typeof User> = {
  venue: Building2,
  solo: User,
  band: Users,
};

interface PersonaSelectorProps {
  entities: EntityWithAccess[];
}

export function PersonaSelector({ entities }: PersonaSelectorProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  
  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("selectedPersona");
    if (saved && entities.some(e => e.id === saved)) {
      setSelectedId(saved);
    }
  }, [entities]);

  const handleSelect = (id: string | null) => {
    setSelectedId(id);
    if (id) {
      localStorage.setItem("selectedPersona", id);
    } else {
      localStorage.removeItem("selectedPersona");
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const selectedEntity = entities.find(e => e.id === selectedId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2">
          {selectedEntity ? (
            <>
              {(() => {
                const Icon = TYPE_ICONS[selectedEntity.type];
                return <Icon className="h-4 w-4" />;
              })()}
              <span className="max-w-[120px] truncate">{selectedEntity.name}</span>
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
          Min profil
          {!selectedId && <Badge variant="secondary" className="ml-auto text-xs">Aktiv</Badge>}
        </DropdownMenuItem>

        {entities.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Mine entities
            </DropdownMenuLabel>
            {entities.map((entity) => {
              const Icon = TYPE_ICONS[entity.type];
              return (
                <DropdownMenuItem 
                  key={entity.id}
                  onClick={() => handleSelect(entity.id)}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  <span className="truncate flex-1">{entity.name}</span>
                  {selectedId === entity.id && (
                    <Badge variant="secondary" className="ml-auto text-xs">Aktiv</Badge>
                  )}
                </DropdownMenuItem>
              );
            })}
          </>
        )}

        <DropdownMenuSeparator />
        
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
