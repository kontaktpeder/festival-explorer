import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CreateEditShell } from "@/components/layout/CreateEditShell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useCreatePersona } from "@/hooks/usePersona";
import { getPersonaTypeLabel } from "@/lib/role-model-helpers";
import { Music, Camera, Building2, Users } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

const PERSONA_CHANGE_EVENT = "personaChanged";

const WIZARD_ROLES = [
  { type: "musician", label: "Musiker / DJ", icon: Music },
  { type: "photographer", label: "Foto / Video", icon: Camera },
  { type: "organizer", label: "Arrangør", icon: Building2 },
  { type: "audience", label: "Publikum", icon: Users },
] as const;

export default function CreateProfileWizard() {
  const navigate = useNavigate();
  const createPersona = useCreatePersona();
  const [step, setStep] = useState(0);
  const [type, setType] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [avatarUrl] = useState("");
  const [isPublic, setIsPublic] = useState(true);

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("Skriv inn navn");
      return;
    }
    try {
      const persona = await createPersona.mutateAsync({
        name: name.trim(),
        avatar_url: avatarUrl || undefined,
        is_public: isPublic,
        type: type || undefined,
      });
      localStorage.setItem("selectedPersonaId", persona.id);
      window.dispatchEvent(new Event(PERSONA_CHANGE_EVENT));
      navigate("/dashboard");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Kunne ikke opprette profil");
    }
  };

  if (step === 0) {
    return (
      <div className="min-h-[100svh] bg-background">
        <div className="max-w-lg mx-auto px-4 pt-6">
          <Link to="/" className="text-sm font-bold text-foreground tracking-tight">
            GIGGEN <span className="text-muted-foreground/70 font-normal text-[10px]">BACKSTAGE</span>
          </Link>
        </div>
        <CreateEditShell
          title="Velg din rolle"
          subtitle="Hva beskriver deg best?"
          stepTitle="Rolle"
          stepIndex={0}
          stepCount={3}
          primaryAction={{ label: "Neste", onClick: () => setStep(1), disabled: !type }}
          secondaryAction={{ label: "Avbryt", onClick: () => navigate("/dashboard") }}
        >
          <div className="space-y-3">
            {WIZARD_ROLES.map(({ type: t, label, icon: Icon }) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`w-full flex items-center gap-4 p-4 rounded-lg border text-left transition-all ${
                  type === t ? "border-accent bg-accent/10" : "border-border/30 hover:border-border/50"
                }`}
              >
                <Icon className="h-5 w-5 text-muted-foreground shrink-0" />
                <span className="text-sm font-medium text-foreground">{label}</span>
                {type === t && <span className="ml-auto text-xs text-accent">Valgt</span>}
              </button>
            ))}
          </div>
        </CreateEditShell>
      </div>
    );
  }

  if (step === 1) {
    return (
      <div className="min-h-[100svh] bg-background">
        <div className="max-w-lg mx-auto px-4 pt-6">
          <Link to="/" className="text-sm font-bold text-foreground tracking-tight">
            GIGGEN <span className="text-muted-foreground/70 font-normal text-[10px]">BACKSTAGE</span>
          </Link>
        </div>
        <CreateEditShell
          title="Hva heter du?"
          subtitle="Bruk artistnavn, bandnavn eller ditt eget navn."
          stepTitle="Navn"
          stepIndex={1}
          stepCount={3}
          primaryAction={{ label: "Neste", onClick: () => setStep(2), disabled: !name.trim() }}
          secondaryAction={{ label: "Tilbake", onClick: () => setStep(0) }}
        >
          <div className="space-y-6">
            <div>
              <Label htmlFor="name">Navn</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Fullt navn"
                className="mt-1"
              />
            </div>

            <div>
              <Label>Profilbilde (valgfritt)</Label>
              <div className="flex items-center gap-4 mt-2">
                <Avatar className="h-14 w-14 ring-2 ring-border/50">
                  {avatarUrl ? (
                    <AvatarImage src={avatarUrl} />
                  ) : null}
                  <AvatarFallback className="text-base bg-muted text-muted-foreground">
                    {name ? name.charAt(0).toUpperCase() : "?"}
                  </AvatarFallback>
                </Avatar>
                <p className="text-xs text-muted-foreground">
                  Du kan legge til bilde senere i redigeringsmodus.
                </p>
              </div>
            </div>
          </div>
        </CreateEditShell>
      </div>
    );
  }

  // Step 2: Synlighet
  return (
    <div className="min-h-[100svh] bg-background">
      <div className="max-w-lg mx-auto px-4 pt-6">
        <Link to="/" className="text-sm font-bold text-foreground tracking-tight">
          GIGGEN <span className="text-muted-foreground/70 font-normal text-[10px]">BACKSTAGE</span>
        </Link>
      </div>
      <CreateEditShell
        title="Synlighet"
        subtitle="Bestem hvem som kan se profilen din."
        stepTitle="Synlighet"
        stepIndex={2}
        stepCount={3}
        primaryAction={{ label: "Opprett profil", onClick: handleCreate, disabled: createPersona.isPending }}
        secondaryAction={{ label: "Tilbake", onClick: () => setStep(1) }}
      >
        <div className="space-y-6">
          <div className="flex items-center gap-4 p-4 rounded-lg bg-card/60 border border-border/30">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">{name}</p>
              <p className="text-xs text-muted-foreground">{type ? getPersonaTypeLabel(type) : "—"}</p>
            </div>
            <Avatar className="h-10 w-10 ring-2 ring-border/50 shrink-0">
              {avatarUrl ? <AvatarImage src={avatarUrl} /> : null}
              <AvatarFallback className="text-sm bg-muted text-muted-foreground">
                {name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg bg-card/60 border border-border/30">
            <Label htmlFor="public-switch" className="text-sm font-medium">Offentlig profil</Label>
            <Switch
              id="public-switch"
              checked={isPublic}
              onCheckedChange={(v) => setIsPublic(v)}
            />
          </div>

          <p className="text-xs text-muted-foreground text-center">
            {isPublic ? "Profilen vises på GIGGEN." : "Kun du ser profilen."}
          </p>
        </div>
      </CreateEditShell>
    </div>
  );
}
