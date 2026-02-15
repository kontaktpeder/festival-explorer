import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2, Eye, EyeOff, User, ChevronsUpDown, UserPlus, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PersonaSearchList } from "@/components/persona/PersonaSearchList";
import { toast } from "sonner";
import { useMyPersonas } from "@/hooks/usePersona";
import { getPersonaTypeLabel } from "@/lib/role-model-helpers";
import {
  useEntityPersonaBindings,
  useCreatePersonaBinding,
  useUpdatePersonaBinding,
  useDeletePersonaBinding,
  type PersonaBinding,
} from "@/hooks/usePersonaBindings";

interface EntityPersonaBindingsEditorProps {
  entityId: string;
  entityName: string;
}

export function EntityPersonaBindingsEditor({
  entityId,
  entityName,
}: EntityPersonaBindingsEditorProps) {
  const navigate = useNavigate();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>("");
  
  const [isPublic, setIsPublic] = useState(true);
  const [personaPopoverOpen, setPersonaPopoverOpen] = useState(false);

  const { data: myPersonas } = useMyPersonas();
  const { data: bindings, isLoading } = useEntityPersonaBindings(entityId);
  const createBinding = useCreatePersonaBinding();
  const updateBinding = useUpdatePersonaBinding();
  const deleteBinding = useDeletePersonaBinding();

  // Filter out personas that are already bound
  const availablePersonas = (myPersonas || []).filter(
    (persona) => !bindings?.some((b) => b.persona_id === persona.id)
  );

  // Get role from persona's type (primary) or category_tags (fallback)
  const getPersonaRole = (personaId: string): string | undefined => {
    const persona = myPersonas?.find((p) => p.id === personaId);
    return getPersonaTypeLabel(persona?.type) ?? 
      (persona?.category_tags && persona.category_tags.length > 0 ? persona.category_tags[0] : undefined);
  };

  const handleAdd = async () => {
    if (!selectedPersonaId) {
      toast.error("Velg en profil");
      return;
    }

    // Get role from persona's category_tags
    const roleFromPersona = getPersonaRole(selectedPersonaId);

    try {
      await createBinding.mutateAsync({
        entity_id: entityId,
        persona_id: selectedPersonaId,
        is_public: isPublic,
        role_label: roleFromPersona,
      });
      toast.success("Profil lagt til");
      setIsAddDialogOpen(false);
      setSelectedPersonaId("");
      setIsPublic(true);
    } catch (error: any) {
      toast.error(error.message || "Kunne ikke legge til profil");
    }
  };

  const handleTogglePublic = async (binding: PersonaBinding) => {
    try {
      await updateBinding.mutateAsync({
        id: binding.id,
        is_public: !binding.is_public,
      });
      toast.success(binding.is_public ? "Skjult fra offentlig visning" : "Synlig offentlig");
    } catch (error: any) {
      toast.error(error.message || "Kunne ikke oppdatere");
    }
  };

  const handleDelete = async (binding: PersonaBinding) => {
    try {
      await deleteBinding.mutateAsync({
        id: binding.id,
        entityId: binding.entity_id,
        personaId: binding.persona_id,
      });
      toast.success("Profil fjernet");
    } catch (error: any) {
      toast.error(error.message || "Kunne ikke fjerne profil");
    }
  };

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Laster...</div>;
  }

  // Quick "Add myself" if user has exactly one persona
  const singlePersona = myPersonas && myPersonas.length === 1 ? myPersonas[0] : null;
  const canAddSelf = singlePersona && !bindings?.some(b => b.persona_id === singlePersona.id);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
          <div>
            <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
              <User className="h-4 w-4 sm:h-5 sm:w-5" />
              Personer bak prosjektet
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Legg til deg selv eller andre som er med bak prosjektet.
            </p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1 w-full sm:w-auto">
                <Plus className="h-4 w-4" />
                Legg meg eller andre til
              </Button>
            </DialogTrigger>
          <DialogContent className="w-[calc(100vw-2rem)] max-w-md max-h-[calc(100vh-2rem)] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-base sm:text-lg">Legg til profil</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Velg profil</Label>
                {availablePersonas.length === 0 ? (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Du har ingen ledige profiler knyttet til denne kontoen ennå.
                    </p>
                    <div className="flex flex-col gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsAddDialogOpen(false);
                          navigate("/dashboard/personas/new");
                        }}
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        Opprett ny profil
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          setIsAddDialogOpen(false);
                          navigate(`/admin/access-generator?mode=entity&entityId=${entityId}`);
                        }}
                      >
                        <Link2 className="h-4 w-4 mr-2" />
                        Inviter ny person (tilgangslenke)
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Popover open={personaPopoverOpen} onOpenChange={setPersonaPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={personaPopoverOpen}
                        className="w-full justify-between"
                      >
                        {selectedPersonaId ? (
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={availablePersonas.find(p => p.id === selectedPersonaId)?.avatar_url || undefined} />
                              <AvatarFallback className="text-xs">
                                {availablePersonas.find(p => p.id === selectedPersonaId)?.name?.charAt(0) || "?"}
                              </AvatarFallback>
                            </Avatar>
                            <span>{availablePersonas.find(p => p.id === selectedPersonaId)?.name}</span>
                          </div>
                        ) : (
                          "Velg profil..."
                        )}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start">
                      <PersonaSearchList
                        personas={availablePersonas}
                        selectedPersonaId={selectedPersonaId}
                        onSelect={(id) => {
                          setSelectedPersonaId(id);
                          setPersonaPopoverOpen(false);
                        }}
                        placeholder="Søk etter profil..."
                        emptyMessage="Ingen profiler funnet"
                      />
                    </PopoverContent>
                  </Popover>
                )}
                
                {/* Always show invite link option */}
                {availablePersonas.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Mangler noen?{" "}
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddDialogOpen(false);
                        navigate(`/admin/access-generator?mode=entity&entityId=${entityId}`);
                      }}
                      className="text-primary hover:underline"
                    >
                      Inviter ny person med tilgangslenke
                    </button>
                  </p>
                )}
              </div>

              {/* Role info - auto-filled from persona category_tags */}
              {selectedPersonaId && (() => {
                const roleFromPersona = getPersonaRole(selectedPersonaId);
                return (
                  <div className="space-y-2">
                    <Label>Rolle</Label>
                    {roleFromPersona ? (
                      <p className="text-sm text-muted-foreground">
                        Hentes automatisk fra profil: <span className="font-medium capitalize">{roleFromPersona}</span>
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">
                        Ingen rolle – profilen har ingen kategori satt
                      </p>
                    )}
                  </div>
                );
              })()}

              <div className="flex items-center justify-between">
                <div>
                  <Label>Synlig offentlig</Label>
                  <p className="text-xs text-muted-foreground">
                    Vises i "Bak prosjektet" for alle
                  </p>
                </div>
                <Switch checked={isPublic} onCheckedChange={setIsPublic} />
              </div>

              <div className="flex flex-col-reverse sm:flex-row gap-2 justify-end pt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsAddDialogOpen(false)}
                  className="w-full sm:w-auto"
                >
                  Avbryt
                </Button>
                <Button
                  onClick={handleAdd}
                  disabled={!selectedPersonaId || createBinding.isPending}
                  className="w-full sm:w-auto"
                >
                  {createBinding.isPending ? "Legger til..." : "Legg til"}
                </Button>
              </div>
            </div>
          </DialogContent>
          </Dialog>
        </div>
      </div>
      {/* Quick "Add myself" button */}
      {canAddSelf && (
        <Button
          variant="secondary"
          size="sm"
          className="w-full bg-accent/10 hover:bg-accent/20 text-accent border-accent/20"
          onClick={async () => {
            try {
              // Get role from persona's category_tags
              const roleFromPersona = getPersonaTypeLabel(singlePersona?.type) ?? 
                (singlePersona?.category_tags && singlePersona.category_tags.length > 0 ? singlePersona.category_tags[0] : undefined);
              await createBinding.mutateAsync({
                entity_id: entityId,
                persona_id: singlePersona!.id,
                is_public: true,
                role_label: roleFromPersona,
              });
              toast.success("Du er lagt til bak prosjektet");
            } catch (error: any) {
              toast.error(error.message || "Kunne ikke legge deg til");
            }
          }}
          disabled={createBinding.isPending}
        >
          {createBinding.isPending ? "Legger til..." : "Legg meg til bak prosjektet"}
        </Button>
      )}

      {!bindings || bindings.length === 0 ? (
        <div className="text-sm text-muted-foreground py-4 space-y-1">
          <p>Ingen er lagt til bak prosjektet ennå.</p>
          <p className="text-xs">Tips: Legg til deg selv først, så kan du invitere andre senere.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {bindings.map((binding) => (
            <div
              key={binding.id}
              className="flex items-center justify-between p-2.5 sm:p-3 bg-muted/50 rounded-lg gap-2"
            >
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-secondary flex items-center justify-center overflow-hidden flex-shrink-0">
                  {binding.persona?.avatar_url ? (
                    <img
                      src={binding.persona.avatar_url}
                      alt={binding.persona.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-xs sm:text-sm font-bold text-muted-foreground">
                      {binding.persona?.name?.charAt(0) || "?"}
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-xs sm:text-sm truncate">{binding.persona?.name}</p>
                  {binding.role_label && (
                    <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                      {binding.role_label}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                <Badge variant={binding.is_public ? "default" : "secondary"} className="text-[10px] sm:text-xs hidden sm:flex">
                  {binding.is_public ? "Offentlig" : "Skjult"}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 sm:h-8 sm:w-8"
                  onClick={() => handleTogglePublic(binding)}
                  title={binding.is_public ? "Skjul fra offentlig" : "Gjør synlig"}
                >
                  {binding.is_public ? (
                    <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  ) : (
                    <EyeOff className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(binding)}
                  className="text-destructive hover:text-destructive h-7 w-7 sm:h-8 sm:w-8"
                  title="Fjern"
                >
                  <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
