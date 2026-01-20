import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Plus, ExternalLink, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEntityTypes } from "@/hooks/useEntityTypes";
import { getEntityTypeConfig, getDefaultEntityTypeConfig } from "@/lib/entity-types";
import { EntityTypeIcon } from "@/components/ui/EntityTypeIcon";
import type { EntityType } from "@/types/database";

export default function AdminEntities() {
  const queryClient = useQueryClient();
  const [typeFilter, setTypeFilter] = useState<string>("all");
  
  // Load entity types from database
  const { data: entityTypes } = useEntityTypes();

  const { data: entities, isLoading } = useQuery({
    queryKey: ["admin-entities", typeFilter],
    queryFn: async () => {
      let query = supabase
        .from("entities")
        .select("*")
        .eq("is_system", false) // Exclude system entities from admin list
        .order("name");
      
      if (typeFilter !== "all") {
        query = query.eq("type", typeFilter as "venue" | "solo" | "band");
      }
      
      const { data } = await query;
      return data || [];
    },
  });

  const togglePublished = useMutation({
    mutationFn: async ({ id, is_published }: { id: string; is_published: boolean }) => {
      await supabase.from("entities").update({ is_published }).eq("id", id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-entities"] });
    },
  });

  // Get config for a type, falling back to defaults if not loaded
  const getConfig = (type: string) => {
    return entityTypes?.length
      ? getEntityTypeConfig(type, entityTypes) || getDefaultEntityTypeConfig(type)
      : getDefaultEntityTypeConfig(type);
  };

  if (isLoading) {
    return <div className="text-muted-foreground p-4">Laster entities...</div>;
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Entities</h1>
        <Button asChild size="sm">
          <Link to="/admin/entities/new">
            <Plus className="h-4 w-4 mr-2" />
            Ny entity
          </Link>
        </Button>
      </div>

      {/* Type filter - dynamic from entity_types */}
      <Tabs value={typeFilter} onValueChange={(v) => setTypeFilter(v as EntityType | "all")}>
        <TabsList>
          <TabsTrigger value="all">Alle</TabsTrigger>
          {entityTypes?.map((et) => (
            <TabsTrigger key={et.key} value={et.key}>
              <EntityTypeIcon iconKey={et.icon_key} className="h-4 w-4 mr-1" />
              {et.label_nb}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="space-y-3">
        {entities?.map((entity) => {
          const typeConfig = getConfig(entity.type);
          
          return (
            <div
              key={entity.id}
              className="bg-card border border-border rounded-lg p-4 md:p-6"
            >
              {/* Mobile layout */}
              <div className="flex flex-col gap-3 md:hidden">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <EntityTypeIcon iconKey={typeConfig.icon_key} />
                    <h2 className="text-base font-semibold text-foreground truncate">
                      {entity.name}
                    </h2>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <Button asChild variant="ghost" size="icon" className="h-8 w-8">
                      <Link to={`/admin/entities/${entity.id}`}>
                        <Settings className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button asChild variant="ghost" size="icon" className="h-8 w-8">
                      <Link to={`${typeConfig.public_route_base}/${entity.slug}`} target="_blank">
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {typeConfig.label_nb}
                  </Badge>
                  <Badge variant={entity.is_published ? "default" : "outline"} className="text-xs">
                    {entity.is_published ? "Publisert" : "Utkast"}
                  </Badge>
                </div>
                
                {entity.tagline && (
                  <p className="text-sm text-muted-foreground">{entity.tagline}</p>
                )}

                <Button
                  variant={entity.is_published ? "outline" : "default"}
                  size="sm"
                  onClick={() => togglePublished.mutate({
                    id: entity.id,
                    is_published: !entity.is_published
                  })}
                  className="w-full"
                >
                  {entity.is_published ? "Gjør til utkast" : "Publiser"}
                </Button>
              </div>

              {/* Desktop layout */}
              <div className="hidden md:block">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <EntityTypeIcon iconKey={typeConfig.icon_key} />
                      <h2 className="text-xl font-semibold text-foreground">
                        {entity.name}
                      </h2>
                      <Badge variant="secondary">
                        {typeConfig.label_nb}
                      </Badge>
                      <Badge variant={entity.is_published ? "default" : "outline"}>
                        {entity.is_published ? "Publisert" : "Utkast"}
                      </Badge>
                    </div>
                    
                    {entity.tagline && (
                      <p className="text-muted-foreground">{entity.tagline}</p>
                    )}
                    
                    {entity.city && (
                      <p className="text-sm text-muted-foreground">{entity.city}</p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button asChild variant="ghost" size="sm">
                      <Link to={`/admin/entities/${entity.id}`}>
                        <Settings className="h-4 w-4 mr-2" />
                        Rediger
                      </Link>
                    </Button>
                    <Button asChild variant="ghost" size="sm">
                      <Link to={`${typeConfig.public_route_base}/${entity.slug}`} target="_blank">
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-border flex gap-2">
                  <Button
                    variant={entity.is_published ? "outline" : "default"}
                    size="sm"
                    onClick={() => togglePublished.mutate({
                      id: entity.id,
                      is_published: !entity.is_published
                    })}
                  >
                    {entity.is_published ? "Gjør til utkast" : "Publiser"}
                  </Button>
                </div>
              </div>
            </div>
          );
        })}

        {entities?.length === 0 && (
          <div className="text-center py-8 md:py-12 text-muted-foreground">
            <p className="text-sm">Ingen entities funnet.</p>
            <Button asChild className="mt-4" size="sm">
              <Link to="/admin/entities/new">Opprett din første entity</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
