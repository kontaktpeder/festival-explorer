import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useCreatePersona } from "@/hooks/usePersona";
import { getPersonaTypeLabel } from "@/lib/role-model-helpers";
import { InlineMediaPickerWithCrop } from "@/components/admin/InlineMediaPickerWithCrop";
import { getCroppedImageStyles } from "@/lib/image-crop-helpers";
import type { ImageSettings } from "@/types/database";
import { Music, Camera, Wrench, Building2, Check } from "lucide-react";
import { toast } from "sonner";
import welcomeBg from "@/assets/giggen-welcome-bg.png";

const PERSONA_CHANGE_EVENT = "personaChanged";

const WIZARD_ROLES = [
  { type: "musician", label: "Musiker / Artist", icon: Music, desc: "Spiller i band, solo eller DJ" },
  { type: "photographer", label: "Fotograf / Video", icon: Camera, desc: "Foto, video eller innhold" },
  { type: "technician", label: "Teknisk / Crew", icon: Wrench, desc: "Lyd, lys eller scene" },
  { type: "organizer", label: "Arrangør", icon: Building2, desc: "Venue, booking eller arrangør" },
] as const;

function ProgressDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2.5">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1.5 rounded-full transition-all duration-300 ${
            i === current
              ? "w-8 bg-accent"
              : i < current
                ? "w-2 bg-accent/50"
                : "w-2 bg-border/30"
          }`}
        />
      ))}
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
      // Auto-add to any pending festival teams from invitation
      try {
        await supabase.rpc('add_pending_festival_teams_for_persona' as any, { p_persona_id: persona.id });
      } catch (_) {
        // Ignore – no pending invites is fine
      }
      localStorage.setItem("selectedPersonaId", persona.id);
      window.dispatchEvent(new Event(PERSONA_CHANGE_EVENT));
      navigate("/dashboard?from=onboarding");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Kunne ikke opprette profil");
    }
  };

  const stepCount = 4;

  return (
    <div className="min-h-[100svh] bg-background flex flex-col relative overflow-hidden">
      {/* Background welcome image – only visible on intro step */}
      {step === 0 && <WelcomeBackground />}
      {/* Top bar */}
      <div className="relative z-10 w-full max-w-2xl mx-auto px-6 sm:px-10 pt-6 sm:pt-10 flex items-center justify-between">
        <Link to="/" className="text-sm font-bold text-foreground tracking-tight">
          GIGGEN <span className="text-muted-foreground/60 font-normal text-[10px]">BACKSTAGE</span>
        </Link>
        <ProgressDots current={step} total={stepCount} />
      </div>

      {/* Content area */}
      <div className="relative z-10 flex-1 flex flex-col justify-center w-full max-w-2xl mx-auto px-6 sm:px-10">
        {step === 0 && <StepIntro onNext={() => setStep(1)} onCancel={() => navigate("/dashboard")} />}
        {step === 1 && <StepRole type={type} setType={setType} onNext={() => setStep(2)} onBack={() => setStep(0)} />}
        {step === 2 && (
          <StepName
            name={name}
            setName={setName}
            avatarUrl={avatarUrl}
            setAvatarUrl={setAvatarUrl}
            avatarImageSettings={avatarImageSettings}
            setAvatarImageSettings={setAvatarImageSettings}
            onNext={() => setStep(3)}
            onBack={() => setStep(1)}
          />
        )}
        {step === 3 && (
          <StepVisibility
            name={name}
            type={type}
            avatarUrl={avatarUrl}
            avatarImageSettings={avatarImageSettings}
            isPublic={isPublic}
            setIsPublic={setIsPublic}
            onFinish={handleCreate}
            onBack={() => setStep(2)}
            isPending={createPersona.isPending}
          />
        )}
      </div>
    </div>
  );
}

/* ── Welcome Background ── */
function WelcomeBackground() {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const img = new Image();
    img.src = welcomeBg;
    img.onload = () => setLoaded(true);
  }, []);

  return (
    <div
      className="absolute inset-0 z-0 transition-opacity duration-1000 ease-out"
      style={{ opacity: loaded ? 0.12 : 0 }}
    >
      <img
        src={welcomeBg}
        alt=""
        className="w-full h-full object-cover scale-110 animate-[scale-in_1.5s_ease-out_forwards]"
      />
    </div>
  );
}

/* ── Step 0: Intro ── */
function StepIntro({ onNext, onCancel }: { onNext: () => void; onCancel: () => void }) {
  return (
    <StepLayout
      title="Velkommen til GIGGEN Backstage"
      primary={{ label: "Kom i gang", onClick: onNext }}
      secondary={{ label: "Avbryt", onClick: onCancel }}
    >
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground leading-relaxed">
          Her lager du din profesjonelle profil.<br />
          Arrangører og festivaler bruker den for å finne og kreditere deg.
        </p>
        <p className="text-xs text-muted-foreground/60">
          Det tar ca. 1 minutt. Du kan endre alt senere.
        </p>
      </div>
    </StepLayout>
  );
}

/* ── Step 1: Rolle ── */
function StepRole({
  type,
  setType,
  onNext,
  onBack,
}: {
  type: string | null;
  setType: (t: string) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <StepLayout
      title="Hva gjør du?"
      subtitle="Velg det som passer best nå. Du kan legge til flere senere."
      primary={{ label: "Neste", onClick: onNext, disabled: !type }}
      secondary={{ label: "Tilbake", onClick: onBack }}
    >
      <div className="space-y-2.5">
        {WIZARD_ROLES.map(({ type: t, label, icon: Icon, desc }) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={`w-full flex items-center gap-4 p-4 rounded-lg border text-left transition-all ${
              type === t
                ? "border-accent bg-accent/10"
                : "border-border/20 hover:border-border/40"
            }`}
          >
            <Icon className="h-5 w-5 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium text-foreground">{label}</span>
              <p className="text-xs text-muted-foreground/70">{desc}</p>
            </div>
            {type === t && <Check className="h-4 w-4 text-accent shrink-0" />}
          </button>
        ))}
      </div>
    </StepLayout>
  );
}

/* ── Step 2: Navn ── */
function StepName({
  name,
  setName,
  avatarUrl,
  setAvatarUrl,
  avatarImageSettings,
  setAvatarImageSettings,
  onNext,
  onBack,
}: {
  name: string;
  setName: (v: string) => void;
  avatarUrl: string;
  setAvatarUrl: (v: string) => void;
  avatarImageSettings: ImageSettings | null;
  setAvatarImageSettings: (v: ImageSettings | null) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <StepLayout
      title="Hva heter du?"
      subtitle="Skriv navnet du bruker profesjonelt. Dette er deg som person."
      primary={{ label: "Neste", onClick: onNext, disabled: !name.trim() }}
      secondary={{ label: "Tilbake", onClick: onBack }}
    >
      <div className="space-y-6">
        <div>
          <Label htmlFor="name" className="text-xs text-muted-foreground">Navn</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Fullt navn"
            className="mt-1.5 text-base"
          />
          <p className="text-[10px] text-muted-foreground/50 mt-1.5">
            Band og prosjekter legger du til senere.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12 ring-2 ring-border/30 shrink-0">
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
              placeholder="Profilbilde"
            />
            <p className="text-[9px] text-muted-foreground/40 mt-0.5">Valgfritt</p>
          </div>
        </div>
      </div>
    </StepLayout>
  );
}

/* ── Step 3: Synlighet ── */
function StepVisibility({
  name,
  type,
  avatarUrl,
  avatarImageSettings,
  isPublic,
  setIsPublic,
  onFinish,
  onBack,
  isPending,
}: {
  name: string;
  type: string | null;
  avatarUrl: string;
  avatarImageSettings: ImageSettings | null;
  isPublic: boolean;
  setIsPublic: (v: boolean) => void;
  onFinish: () => void;
  onBack: () => void;
  isPending: boolean;
}) {
  return (
    <StepLayout
      title="Hvem kan se profilen din?"
      primary={{ label: "Fullfør", onClick: onFinish, disabled: isPending }}
      secondary={{ label: "Tilbake", onClick: onBack }}
      showLegal
    >
      <div className="space-y-4">
        {/* Preview */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-card/60 border border-border/20">
          <Avatar className="h-10 w-10 ring-2 ring-border/30 shrink-0">
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

        {/* Visibility options */}
        <button
          onClick={() => setIsPublic(true)}
          className={`w-full text-left p-3.5 rounded-lg border transition-all ${
            isPublic ? "border-accent bg-accent/10" : "border-border/20 hover:border-border/40"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">Offentlig</span>
            {isPublic && <Check className="h-4 w-4 text-accent shrink-0" />}
          </div>
          <p className="text-xs text-muted-foreground/70 mt-0.5">
            Synlig for arrangører og andre brukere.
          </p>
        </button>

        <button
          onClick={() => setIsPublic(false)}
          className={`w-full text-left p-3.5 rounded-lg border transition-all ${
            !isPublic ? "border-accent bg-accent/10" : "border-border/20 hover:border-border/40"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">Kun via invitasjon</span>
            {!isPublic && <Check className="h-4 w-4 text-accent shrink-0" />}
          </div>
          <p className="text-xs text-muted-foreground/70 mt-0.5">
            Kun synlig når du er lagt til i et prosjekt eller event.
          </p>
        </button>
      </div>
    </StepLayout>
  );
}

/* ── Shared layout shell ── */
function StepLayout({
  title,
  subtitle,
  children,
  primary,
  secondary,
  showLegal = false,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  primary: { label: string; onClick: () => void; disabled?: boolean };
  secondary?: { label: string; onClick: () => void };
  showLegal?: boolean;
}) {
  return (
    <div className="flex flex-col gap-8 py-8 sm:py-12">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">{title}</h1>
        {subtitle && (
          <p className="text-sm text-muted-foreground/70 mt-1.5 leading-relaxed">{subtitle}</p>
        )}
      </div>

      {/* Content */}
      <div>{children}</div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-2">
        <div>
          {secondary && (
            <Button variant="ghost" size="sm" onClick={secondary.onClick} className="text-muted-foreground/50 hover:text-muted-foreground">
              {secondary.label}
            </Button>
          )}
        </div>
        <Button
          size="sm"
          onClick={primary.onClick}
          disabled={primary.disabled}
          className="sm:h-10 sm:px-6 font-semibold"
        >
          {primary.label}
        </Button>
      </div>

      {showLegal && (
        <p className="text-[10px] text-muted-foreground/40 text-center -mt-4">
          Ved å fortsette godtar du våre{" "}
          <Link to="/vilkar" className="underline hover:text-muted-foreground">vilkår</Link>
          {" "}og{" "}
          <Link to="/personvern" className="underline hover:text-muted-foreground">personvern</Link>.
        </p>
      )}
    </div>
  );
}
