import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
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
import { Music, Camera, Building2, Wrench } from "lucide-react";
import { toast } from "sonner";

const PERSONA_CHANGE_EVENT = "personaChanged";

const WIZARD_ROLES = [
  { type: "musician", label: "Musiker / Artist", icon: Music, desc: "Musiker, band, soloartist eller DJ" },
  { type: "photographer", label: "Fotograf / Video", icon: Camera, desc: "Foto, video eller innholdsproduksjon" },
  { type: "technician", label: "Teknisk / Crew", icon: Wrench, desc: "Lyd, lys, scenearbeid eller crew" },
  { type: "organizer", label: "Arrangør", icon: Building2, desc: "Festival, klubb eller arrangør" },
] as const;

function WizardWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100svh] bg-background flex flex-col">
      <div className="max-w-lg sm:max-w-xl mx-auto w-full px-4 sm:px-8 pt-4 sm:pt-6">
        <Link to="/" className="text-sm sm:text-base font-bold text-foreground tracking-tight">
          GIGGEN <span className="text-muted-foreground/70 font-normal text-[10px] sm:text-xs">BACKSTAGE</span>
        </Link>
      </div>
      {children}
    </div>
  );
}

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
      navigate("/dashboard?from=onboarding");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Kunne ikke opprette profil");
    }
  };

  const stepCount = 4;

  // — Step 0: Velkommen —
  if (step === 0) {
    return (
      <WizardWrapper>
        <CreateEditShell
          title="Velkommen til GIGGEN Backstage"
          subtitle="Rommet bak scenen – her viser du hvem du er, ikke hva du eier."
          stepIndex={0}
          stepCount={stepCount}
          primaryAction={{ label: "Kom i gang", onClick: () => setStep(1) }}
          secondaryAction={{ label: "Avbryt", onClick: () => navigate("/dashboard") }}
        >
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Festivaler og arrangører setter sammen programmet.
              Du fyller inn profilen din, så kan de finne deg.
            </p>
            <p className="text-xs text-muted-foreground/70">
              Dette tar ca. 1 minutt. Du kan endre alt senere.
            </p>
          </div>
        </CreateEditShell>
      </WizardWrapper>
    );
  }

  // — Step 1: Rolle —
  if (step === 1) {
    return (
      <WizardWrapper>
        <CreateEditShell
          title="Hva gjør du?"
          subtitle="Velg rollen som beskriver deg best. Du kan legge til flere senere."
          stepIndex={1}
          stepCount={stepCount}
          primaryAction={{ label: "Neste", onClick: () => setStep(2), disabled: !type }}
          secondaryAction={{ label: "Tilbake", onClick: () => setStep(0) }}
        >
          <div className="space-y-2.5 sm:space-y-3">
            {WIZARD_ROLES.map(({ type: t, label, icon: Icon, desc }) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`w-full flex items-center gap-3 sm:gap-4 p-3.5 sm:p-4 rounded-lg border text-left transition-all ${
                  type === t ? "border-accent bg-accent/10" : "border-border/30 hover:border-border/50"
                }`}
              >
                <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-sm sm:text-base font-medium text-foreground">{label}</span>
                  <p className="text-[11px] sm:text-xs text-muted-foreground/70">{desc}</p>
                </div>
                {type === t && <span className="ml-auto text-xs text-accent shrink-0">Valgt</span>}
              </button>
            ))}
          </div>
        </CreateEditShell>
      </WizardWrapper>
    );
  }

  // — Step 2: Navn + bilde —
  if (step === 2) {
    return (
      <WizardWrapper>
        <CreateEditShell
          title="Hva heter du?"
          subtitle="Bruk navnet du ønsker å bli kreditert med profesjonelt. Dette er deg som person – ikke band- eller prosjektnavn."
          stepIndex={2}
          stepCount={stepCount}
          primaryAction={{ label: "Neste", onClick: () => setStep(3), disabled: !name.trim() }}
          secondaryAction={{ label: "Tilbake", onClick: () => setStep(1) }}
        >
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
              <p className="text-[10px] text-muted-foreground/50 mt-1">
                Eksempel: Peder August Halvorsen – band og prosjekter legger du til separat.
              </p>
            </div>

            {/* Compact avatar picker */}
            <div className="flex items-center gap-2.5 sm:pt-5">
              <Avatar className="h-12 w-12 sm:h-14 sm:w-14 ring-2 ring-border/50 shrink-0">
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
                <p className="text-[9px] text-muted-foreground/40 mt-0.5">Valgfritt</p>
              </div>
            </div>
          </div>
        </CreateEditShell>
      </WizardWrapper>
    );
  }

  // — Step 3: Synlighet + bekreftelse —
  return (
    <WizardWrapper>
      <CreateEditShell
        title="Synlighet"
        subtitle="Bestem hvem som kan se profilen din."
        stepIndex={3}
        stepCount={stepCount}
        primaryAction={{ label: "Opprett profil", onClick: handleCreate, disabled: createPersona.isPending }}
        secondaryAction={{ label: "Tilbake", onClick: () => setStep(2) }}
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
            <div className="flex-1 min-w-0 mr-3">
              <Label htmlFor="public-switch" className="text-sm font-medium cursor-pointer">
                Offentlig profil (anbefalt)
              </Label>
              <p className="text-[11px] text-muted-foreground/70 mt-0.5">
                Offentlige profiler kan vises i lineup, credits og søk.
              </p>
            </div>
            <Switch
              id="public-switch"
              checked={isPublic}
              onCheckedChange={(v) => setIsPublic(v)}
            />
          </div>

          {!isPublic && (
            <p className="text-[10px] text-muted-foreground/50 text-center">
              Privat profil er kun synlig for arrangører du jobber med.
            </p>
          )}
        </div>
      </CreateEditShell>
    </WizardWrapper>
  );
}