import { useState } from "react";
import { Plus, Trash2, Eye, EyeOff, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useMyPersonas } from "@/hooks/usePersona";
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
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>("");
  const [roleLabel, setRoleLabel] = useState("");
  const [isPublic, setIsPublic] = useState(true);

  const { data: myPersonas } = useMyPersonas();
  const { data: bindings, isLoading } = useEntityPersonaBindings(entityId);
  const createBinding = useCreatePersonaBinding();
  const updateBinding = useUpdatePersonaBinding();
  const deleteBinding = useDeletePersonaBinding();

  // Filter out personas that are already bound
  const availablePersonas = (myPersonas || []).filter(
    (persona) => !bindings?.some((b) => b.persona_id === persona.id)
  );

  const handleAdd = async () => {
    if (!selectedPersonaId) {
      toast.error("Velg en profil");
      return;
    }

    try {
      await createBinding.mutateAsync({
        entity_id: entityId,
        persona_id: selectedPersonaId,
        is_public: isPublic,
        role_label: roleLabel || undefined,
      });
      toast.success("Profil lagt til");
      setIsAddDialogOpen(false);
      setSelectedPersonaId("");
      setRoleLabel("");
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <User className="h-5 w-5" />
          Personer bak prosjektet
        </h3>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1">
              <Plus className="h-4 w-4" />
              Legg til profil
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Legg til profil</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Velg profil</Label>
                {availablePersonas.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Du har ingen ledige profiler. Opprett en ny profil først.
                  </p>
                ) : (
                  <Select value={selectedPersonaId} onValueChange={setSelectedPersonaId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Velg profil..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availablePersonas.map((persona) => (
                        <SelectItem key={persona.id} value={persona.id}>
                          {persona.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="roleLabel">Rolle (valgfritt)</Label>
                <Input
                  id="roleLabel"
                  value={roleLabel}
                  onChange={(e) => setRoleLabel(e.target.value)}
                  placeholder="F.eks. Bassist, Fotograf, Manager..."
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Synlig offentlig</Label>
                  <p className="text-xs text-muted-foreground">
                    Vises i "Bak prosjektet" for alle
                  </p>
                </div>
                <Switch checked={isPublic} onCheckedChange={setIsPublic} />
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsAddDialogOpen(false)}
                >
                  Avbryt
                </Button>
                <Button
                  onClick={handleAdd}
                  disabled={!selectedPersonaId || createBinding.isPending}
                >
                  {createBinding.isPending ? "Legger til..." : "Legg til"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {!bindings || bindings.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">
          Ingen profiler er lagt til ennå. Legg til profiler som skal vises i "Bak prosjektet".
        </p>
      ) : (
        <div className="space-y-2">
          {bindings.map((binding) => (
            <div
              key={binding.id}
              className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center overflow-hidden">
                  {binding.persona?.avatar_url ? (
                    <img
                      src={binding.persona.avatar_url}
                      alt={binding.persona.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-sm font-bold text-muted-foreground">
                      {binding.persona?.name?.charAt(0) || "?"}
                    </span>
                  )}
                </div>
                <div>
                  <p className="font-medium text-sm">{binding.persona?.name}</p>
                  {binding.role_label && (
                    <p className="text-xs text-muted-foreground">
                      {binding.role_label}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={binding.is_public ? "default" : "secondary"}>
                  {binding.is_public ? "Offentlig" : "Skjult"}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleTogglePublic(binding)}
                  title={binding.is_public ? "Skjul fra offentlig" : "Gjør synlig"}
                >
                  {binding.is_public ? (
                    <Eye className="h-4 w-4" />
                  ) : (
                    <EyeOff className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(binding)}
                  className="text-destructive hover:text-destructive"
                  title="Fjern"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
