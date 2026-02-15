import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, Users, Plus } from "lucide-react";
import { InlineMediaPickerWithCrop } from "@/components/admin/InlineMediaPickerWithCrop";
import { LoadingState } from "@/components/ui/LoadingState";
import { getAuthenticatedUser } from "@/lib/admin-helpers";
import { cleanupSignedUrlCache } from "@/lib/media-helpers";
import { generateSlug } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useUpdateTeamMember } from "@/hooks/useEntityMutations";
import { ProjectCreditFlow } from "@/components/dashboard/ProjectCreditFlow";
import type { EntityType, AccessLevel, ImageSettings } from "@/types/database";
import { parseImageSettings } from "@/types/database";

const TYPE_OPTIONS: { value: EntityType; label: string }[] = [
  { value: "venue", label: "Scene" },
  { value: "solo", label: "Soloartist" },
  { value: "band", label: "Band" },
];

const ACCESS_LABELS: Record<AccessLevel, string> = {
  owner: "Eier",
  admin: "Administrer",
  editor: "Rediger",
  viewer: "Se",
};

// TeamPublicToggle replaced by ProjectCreditFlow

export default function AdminEntityEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const isNew = id === "new";

  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    tagline: "",
    description: "",
    type: "solo" as EntityType,
    hero_image_url: "",
    address: "",
    city: "",
    is_published: false,
  });
  const [heroImageSettings, setHeroImageSettings] = useState<ImageSettings | null>(null);

  // Fetch entity data
  const { data: entity, isLoading } = useQuery({
    queryKey: ["admin-entity", id],
    queryFn: async () => {
      if (isNew) return null;
      const { data, error } = await supabase
        .from("entities")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !isNew,
    retry: 1,
  });

  // Fetch team members with personas
  const { data: team } = useQuery({
    queryKey: ["admin-entity-team", id],
    queryFn: async () => {
      if (isNew) return [];
      const { data: teamData, error } = await supabase
        .from("entity_team")
        .select("*")
        .eq("entity_id", id)
        .is("left_at", null)
        .order("access", { ascending: true });
      if (error) throw error;
      
      const userIds = (teamData || []).map(m => m.user_id);
      if (userIds.length === 0) return [];

      // Fetch persona bindings for this entity
      const { data: bindings } = await supabase
        .from("entity_persona_bindings")
        .select("persona_id, role_label")
        .eq("entity_id", id!);

      // Fetch personas for all team members (and any bound personas + team persona_ids)
      const bindingPersonaIds = (bindings || []).map(b => b.persona_id);
      const teamPersonaIds = (teamData || []).map(m => m.persona_id).filter(Boolean) as string[];
      const allPersonaIds = [...new Set([...bindingPersonaIds, ...teamPersonaIds])];
      
      const orClauses = [`user_id.in.(${userIds.join(",")})`];
      if (allPersonaIds.length > 0) {
        orClauses.push(`id.in.(${allPersonaIds.join(",")})`);
      }

      const { data: personas } = await supabase
        .from("personas")
        .select("id, user_id, name, avatar_url, slug")
        .or(orClauses.join(","));

      return (teamData || []).map(member => {
        // Prefer persona bound to this entity
        const boundBinding = (bindings || []).find(b => {
          const p = (personas || []).find(p => p.id === b.persona_id);
          return p?.user_id === member.user_id;
        });
        const boundPersona = boundBinding 
          ? (personas || []).find(p => p.id === boundBinding.persona_id) 
          : null;
        const fallbackPersona = (personas || []).find(p => p.user_id === member.user_id);
        const persona = boundPersona || fallbackPersona || null;
        const bindingRoleLabel = boundBinding?.role_label || null;
        // Persona linked via entity_team.persona_id
        const representationPersona = member.persona_id
          ? (personas || []).find(p => p.id === member.persona_id)
          : null;
        
        return { ...member, persona, bindingRoleLabel, representationPersona };
      });
    },
    enabled: !isNew,
  });

  // Populate form when entity data loads
  useEffect(() => {
    if (entity) {
      setFormData({
        name: entity.name || "",
        slug: entity.slug || "",
        tagline: entity.tagline || "",
        description: entity.description || "",
        type: entity.type || "solo",
        hero_image_url: entity.hero_image_url || "",
        address: entity.address || "",
        city: entity.city || "",
        is_published: entity.is_published || false,
      });
      // Parse hero_image_settings from JSONB
      setHeroImageSettings(parseImageSettings(entity.hero_image_settings) || null);
    }
  }, [entity]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const user = await getAuthenticatedUser();

      const payload = {
        name: formData.name,
        slug: formData.slug,
        type: formData.type,
        tagline: formData.tagline || null,
        description: formData.description || null,
        hero_image_url: formData.hero_image_url || null,
        hero_image_settings: heroImageSettings,
        address: formData.address || null,
        city: formData.city || null,
        is_published: formData.is_published,
      };

      if (isNew) {
        const insertPayload = { ...payload, created_by: user.id };
        const { data, error } = await supabase
          .from("entities")
          .insert(insertPayload as never)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from("entities")
          .update(payload as never)
          .eq("id", id)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-entities"] });
      queryClient.invalidateQueries({ queryKey: ["admin-entity", id] });
      
      // Invalider ALLE entity queries som kan referere til dette entity
      if (data?.slug) {
        queryClient.invalidateQueries({ queryKey: ["entity", data.slug] });
      }
      if (data?.id) {
        queryClient.invalidateQueries({ queryKey: ["entity-by-id", data.id] });
        queryClient.invalidateQueries({ queryKey: ["entity-edit", data.id] });
      }
      // Invalider alle entity queries generelt (for å være sikker)
      queryClient.invalidateQueries({ queryKey: ["entity"] });
      
      // Hvis dette er en venue, invalider også venue queries
      if (data?.type === "venue") {
        if (data.slug) {
          queryClient.invalidateQueries({ queryKey: ["venue", data.slug] });
        }
        if (data.id) {
          queryClient.invalidateQueries({ queryKey: ["venue", data.id] });
        }
        queryClient.invalidateQueries({ queryKey: ["venue"] });
      }
      
      // Rydd signed URL cache når bildet endres
      cleanupSignedUrlCache(true);
      toast({ title: isNew ? "Entity opprettet" : "Entity oppdatert" });
      if (isNew && data) {
        navigate(`/admin/entities/${data.id}`);
      }
    },
    onError: (error: Error) => {
      toast({ title: "Feil", description: error.message, variant: "destructive" });
    },
  });

  // Auto-generate slug from name
  const handleNameChange = (name: string) => {
    setFormData((prev) => ({
      ...prev,
      name,
      slug: generateSlug(name),
    }));
  };

  if (isLoading) {
    return <LoadingState message="Laster entity..." />;
  }

  const isVenue = formData.type === "venue";

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="sm">
          <Link to="/admin/entities">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Tilbake
          </Link>
        </Button>
        <h1 className="text-3xl font-bold text-foreground">
          {isNew ? "Ny entity" : "Rediger entity"}
        </h1>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          saveMutation.mutate();
        }}
        className="space-y-6"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="type">Type</Label>
            <Select
              value={formData.type}
              onValueChange={(value: EntityType) => setFormData((prev) => ({ ...prev, type: value }))}
              disabled={!isNew}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!isNew && (
              <p className="text-xs text-muted-foreground">Type kan ikke endres etter opprettelse</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Navn</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder={isVenue ? "Venue navn" : "Artist/band navn"}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">URL-slug</Label>
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-2 rounded-md">
              <span>{isVenue ? "/venue/" : "/project/"}</span>
              <span className="text-foreground font-mono">{formData.slug || "..."}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Genereres automatisk fra navn
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tagline">Tagline</Label>
            <Input
              id="tagline"
              value={formData.tagline}
              onChange={(e) => setFormData((prev) => ({ ...prev, tagline: e.target.value }))}
              placeholder="Kort beskrivelse (én linje)"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Beskrivelse</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Full beskrivelse..."
              rows={4}
            />
          </div>

          {/* Venue-specific fields */}
          {isVenue && (
            <>
              <div className="space-y-2">
                <Label htmlFor="address">Adresse</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
                  placeholder="Gateadresse"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">By</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData((prev) => ({ ...prev, city: e.target.value }))}
                  placeholder="By"
                />
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label>Hero-bilde</Label>
            <InlineMediaPickerWithCrop
              value={formData.hero_image_url}
              imageSettings={heroImageSettings}
              onChange={(url) => setFormData((prev) => ({ ...prev, hero_image_url: url }))}
              onSettingsChange={setHeroImageSettings}
              cropMode="hero"
              placeholder="Velg hero-bilde"
              showAllForAdmin
              useNaturalAspect
            />
            <p className="text-xs text-muted-foreground">
              Velg bilde og juster fokuspunkt for beste visning
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="is_published">Publisert</Label>
            <Select
              value={formData.is_published ? "true" : "false"}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, is_published: value === "true" }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="false">Utkast</SelectItem>
                <SelectItem value="true">Publisert</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex gap-3 pt-4 border-t border-border">
          <Button type="submit" disabled={saveMutation.isPending}>
            <Save className="h-4 w-4 mr-2" />
            {saveMutation.isPending ? "Lagrer..." : "Lagre"}
          </Button>
        </div>
      </form>

      {/* Team section (only for existing entities) */}
      {!isNew && (
        <div className="mt-8 pt-6 border-t border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team {team && team.length > 0 && `(${team.length})`}
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/admin/access-generator?mode=entity&entityId=${id}`)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Inviter
            </Button>
          </div>
          {!team || team.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              Ingen team-medlemmer ennå. Bruk "Inviter" for å legge til noen.
            </p>
          ) : (
            <div className="space-y-2">
              {team.map((member) => {
                const persona = member.persona as { id: string; name: string; avatar_url?: string; slug?: string } | null;
                const displayName = persona?.name || "Persona ikke satt";
                const avatarUrl = persona?.avatar_url;
                const roleLabel = member.bindingRoleLabel || (member.role_labels?.length > 0 ? member.role_labels.join(", ") : null);
                const repPersona = member.representationPersona as { id: string; name: string } | null;

                return (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                        {avatarUrl ? (
                          <img
                            src={avatarUrl}
                            alt=""
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-xs font-bold text-muted-foreground">
                            {displayName.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm">{displayName}</p>
                        {roleLabel ? (
                          <p className="text-xs text-muted-foreground">{roleLabel}</p>
                        ) : (
                          <p className="text-xs text-muted-foreground italic">Ingen rolle satt</p>
                        )}
                        <p className="text-[10px] text-muted-foreground/60">
                          Representert som: {repPersona?.name ?? "—"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge variant={member.access === 'owner' ? 'default' : 'secondary'}>
                        {ACCESS_LABELS[member.access as AccessLevel] || member.access}
                      </Badge>
                      <ProjectCreditFlow
                        memberId={member.id}
                        entityId={id}
                        entityName={entity?.name ?? ""}
                        personaId={(member.persona as any)?.id}
                        personaSlug={(member.persona as any)?.slug}
                        isPublic={member.is_public}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
