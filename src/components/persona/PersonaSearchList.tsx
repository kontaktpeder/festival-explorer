import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Persona } from "@/types/database";

type PersonaSearchListProps = {
  personas: Persona[];
  selectedPersonaId?: string | null;
  onSelect: (id: string) => void;
  placeholder?: string;
  emptyMessage?: string;
};

export function PersonaSearchList({
  personas,
  selectedPersonaId,
  onSelect,
  placeholder = "Søk etter profil...",
  emptyMessage = "Ingen profiler funnet",
}: PersonaSearchListProps) {
  return (
    <Command>
      <CommandInput placeholder={placeholder} />
      <CommandList>
        <CommandEmpty>{emptyMessage}</CommandEmpty>
        <CommandGroup>
          {personas.map((persona) => (
            <CommandItem
              key={persona.id}
              value={persona.name}
              onSelect={() => onSelect(persona.id)}
            >
              <Check
                className={cn(
                  "mr-2 h-4 w-4",
                  selectedPersonaId === persona.id ? "opacity-100" : "opacity-0"
                )}
              />
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarImage src={persona.avatar_url || undefined} />
                  <AvatarFallback className="text-xs">
                    {persona.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col min-w-0">
                  <span className="font-medium truncate">{persona.name}</span>
                  {persona.category_tags && persona.category_tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {persona.category_tags.slice(0, 3).map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="text-[10px] px-1.5 py-0 capitalize"
                        >
                          {tag}
                        </Badge>
                      ))}
                      {persona.category_tags.length > 3 && (
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5 py-0"
                        >
                          +{persona.category_tags.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  );
}
