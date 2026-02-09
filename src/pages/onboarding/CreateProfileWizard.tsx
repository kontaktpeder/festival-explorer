import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CreateEditShell } from "@/components/layout/CreateEditShell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useCreatePersona } from "@/hooks/usePersona";
import { getPersonaTypeLabel } from "@/lib/role-model-helpers";
import { InlineMediaPickerWithCrop } from "@/components/admin/InlineMediaPickerWithCrop";
import { getCroppedImageStyles } from "@/lib/image-crop-helpers";
import type { ImageSettings } from "@/types/database";
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
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarImageSettings, setAvatarImageSettings] = useState<ImageSettings | null>(null);
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
        avatar_image_settings: avatarImageSettings,
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

  // — Step 0: Rolle —
  if (step === 0) {
    return (
      <div className="min-h-[100svh] bg-background flex flex-col">
        <div className="max-w-lg mx-auto px-4 pt-4">
          <Link to="/" className="text-sm font-bold text-foreground tracking-tight">
            GIGGEN <span className="text-muted-foreground/70 font-normal text-[10px]">BACKSTAGE</span>
          </Link>
        </div>
        <CreateEditShell
          title="Velg din rolle"
          subtitle="Hva beskriver deg best?"
          stepIndex={0}
          stepCount={3}
          primaryAction={{ label: "Neste", onClick: () => setStep(1), disabled: !type }}
          secondaryAction={{ label: "Avbryt", onClick: () => navigate("/dashboard") }}
        >
          <div className="space-y-2.5">
            {WIZARD_ROLES.map(({ type: t, label, icon: Icon }) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`w-full flex items-center gap-3 p-3.5 rounded-lg border text-left transition-all ${
                  type === t ? "border-accent bg-accent/10" : "border-border/30 hover:border-border/50"
                }`}
              >
                <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm font-medium text-foreground">{label}</span>
                {type === t && <span className="ml-auto text-xs text-accent">Valgt</span>}
              </button>
            ))}
          </div>
        </CreateEditShell>
      </div>
    );
  }

  // — Step 1: Navn + bilde —
  if (step === 1) {
    return (
      <div className="min-h-[100svh] bg-background flex flex-col">
        <div className="max-w-lg mx-auto px-4 pt-4">
          <Link to="/" className="text-sm font-bold text-foreground tracking-tight">
            GIGGEN <span className="text-muted-foreground/70 font-normal text-[10px]">BACKSTAGE</span>
          </Link>
        </div>
        <CreateEditShell
          title="Hva heter du?"
          subtitle="Bruk navnet du presenterer deg med profesjonelt."
          stepIndex={1}
          stepCount={3}
          primaryAction={{ label: "Neste", onClick: () => setStep(2), disabled: !name.trim() }}
          secondaryAction={{ label: "Tilbake", onClick: () => setStep(0) }}
        >
          {/* Two-column on desktop, stacked on mobile */}
          <div className="flex flex-col sm:flex-row sm:items-start gap-5">
            {/* Name input */}
            <div className="flex-1">
              <Label htmlFor="name" className="text-xs">Navn</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Fullt navn"
                className="mt-1 text-base"
              />
            </div>

            {/* Compact avatar picker */}
            <div className="flex items-center gap-3 sm:pt-5">
              <Avatar className="h-14 w-14 ring-2 ring-border/50 shrink-0">
                {avatarUrl ? (
                  <AvatarImage src={avatarUrl} style={getCroppedImageStyles(avatarImageSettings)} className="object-cover" />
                ) : null}
                <AvatarFallback className="text-sm bg-muted text-muted-foreground">
                  {name ? name.charAt(0).toUpperCase() : "?"}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <InlineMediaPickerWithCrop
                  value={avatarUrl}
                  imageSettings={avatarImageSettings}
                  onChange={setAvatarUrl}
                  onSettingsChange={setAvatarImageSettings}
                  cropMode="avatar"
                  placeholder="Bilde"
                />
                <p className="text-[10px] text-muted-foreground/50 mt-0.5">Valgfritt</p>
              </div>
            </div>
          </div>
        </CreateEditShell>
      </div>
    );
  }

  // — Step 2: Synlighet —
  return (
    <div className="min-h-[100svh] bg-background flex flex-col">
      <div className="max-w-lg mx-auto px-4 pt-4">
        <Link to="/" className="text-sm font-bold text-foreground tracking-tight">
          GIGGEN <span className="text-muted-foreground/70 font-normal text-[10px]">BACKSTAGE</span>
        </Link>
      </div>
      <CreateEditShell
        title="Synlighet"
        subtitle="Bestem hvem som kan se profilen din."
        stepIndex={2}
        stepCount={3}
        primaryAction={{ label: "Opprett profil", onClick: handleCreate, disabled: createPersona.isPending }}
        secondaryAction={{ label: "Tilbake", onClick: () => setStep(1) }}
        showLegal
      >
        <div className="space-y-4">
          {/* Preview card */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-card/60 border border-border/30">
            <Avatar className="h-10 w-10 ring-2 ring-border/50 shrink-0">
              {avatarUrl ? <AvatarImage src={avatarUrl} style={getCroppedImageStyles(avatarImageSettings)} className="object-cover" /> : null}
              <AvatarFallback className="text-xs bg-muted text-muted-foreground">
                {name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{name}</p>
              <p className="text-xs text-muted-foreground">{type ? getPersonaTypeLabel(type) : "—"}</p>
            </div>
          </div>

          {/* Toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-card/60 border border-border/30">
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
