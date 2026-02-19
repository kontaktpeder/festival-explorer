import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useCreatePersona } from "@/hooks/usePersona";
import { getPersonaTypeLabel } from "@/lib/role-model-helpers";
import { InlineMediaPickerWithCrop } from "@/components/admin/InlineMediaPickerWithCrop";
import { getCroppedImageStyles } from "@/lib/image-crop-helpers";
import type { ImageSettings } from "@/types/database";
import { Music, Camera, Wrench, Building2, Check, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import welcomeBg from "@/assets/giggen-welcome-bg.png";

const PERSONA_CHANGE_EVENT = "personaChanged";

const WIZARD_ROLES = [
  { type: "musician", label: "Musiker / Artist", icon: Music, desc: "Spiller i band, solo eller DJ" },
  { type: "photographer", label: "Fotograf / Video", icon: Camera, desc: "Foto, video eller innhold" },
  { type: "technician", label: "Teknisk / Crew", icon: Wrench, desc: "Lyd, lys eller scene" },
  { type: "organizer", label: "Arrangør", icon: Building2, desc: "Venue, booking eller arrangør" },
] as const;

function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = ((current + 1) / total) * 100;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-muted-foreground tabular-nums">{current + 1}/{total}</span>
      <div className="w-20 h-1 rounded-full bg-border/30 overflow-hidden">
        <div
          className="h-full rounded-full bg-accent transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function CreateProfileWizard() {
  const navigate = useNavigate();
  const createPersona = useCreatePersona();
  const [step, setStep] = useState(0);
  const [type, setType] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
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
        bio: bio.trim() || undefined,
        avatar_url: avatarUrl || undefined,
        avatar_image_settings: avatarImageSettings,
        is_public: isPublic,
        type: type || undefined,
      });
      try {
        await supabase.rpc('add_pending_festival_teams_for_persona' as any, { p_persona_id: persona.id });
      } catch (_) {}
      localStorage.setItem("selectedPersonaId", persona.id);
      window.dispatchEvent(new Event(PERSONA_CHANGE_EVENT));
      navigate("/dashboard?from=onboarding");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Kunne ikke opprette profil");
    }
  };

  const stepCount = 5;

  return (
    <div className="min-h-[100svh] bg-background flex flex-col">
      {/* Top bar */}
      <header
        className="relative z-20 w-full border-b border-border/10"
        style={{ paddingTop: "max(env(safe-area-inset-top, 0px), 0px)" }}
      >
        <div className="w-full max-w-xl mx-auto px-6 sm:px-8 py-4 flex items-center justify-between">
          <Link to="/" className="text-sm font-semibold text-foreground tracking-tight">
            GIGGEN <span className="text-muted-foreground/40 font-normal text-[10px] tracking-[0.2em] ml-1">BACKSTAGE</span>
          </Link>
          <ProgressBar current={step} total={stepCount} />
        </div>
      </header>

      {/* Content area */}
      <div className="relative z-10 flex-1 flex flex-col justify-center w-full max-w-xl mx-auto px-6 sm:px-8">
        {step === 0 && <StepIntro onNext={() => setStep(1)} onCancel={() => navigate("/dashboard")} />}
        {step === 1 && <StepRole type={type} setType={setType} onNext={() => setStep(2)} onBack={() => setStep(0)} />}
        {step === 2 && (
          <StepName
            name={name}
            setName={setName}
            onNext={() => setStep(3)}
            onBack={() => setStep(1)}
          />
        )}
        {step === 3 && (
          <StepProfile
            type={type}
            name={name}
            bio={bio}
            setBio={setBio}
            avatarUrl={avatarUrl}
            setAvatarUrl={setAvatarUrl}
            avatarImageSettings={avatarImageSettings}
            setAvatarImageSettings={setAvatarImageSettings}
            onNext={() => setStep(4)}
            onBack={() => setStep(2)}
          />
        )}
        {step === 4 && (
          <StepVisibility
            name={name}
            type={type}
            avatarUrl={avatarUrl}
            avatarImageSettings={avatarImageSettings}
            isPublic={isPublic}
            setIsPublic={setIsPublic}
            onFinish={handleCreate}
            onBack={() => setStep(3)}
            isPending={createPersona.isPending}
          />
        )}
      </div>
    </div>
  );
}

/* ── Step 0: Intro ── */
function StepIntro({ onNext, onCancel }: { onNext: () => void; onCancel: () => void }) {
  return (
    <StepLayout
      title="Velkommen til Backstage"
      primary={{ label: "Kom i gang", onClick: onNext }}
      secondary={{ label: "Avbryt", onClick: onCancel }}
      icon={<img src={welcomeBg} alt="" className="h-14 w-14 object-contain opacity-70" />}
    >
      <p className="text-lg text-muted-foreground leading-relaxed">
        Her lager du din profesjonelle profil.
        Arrangører, musikere og tilskuere bruker den for å finne deg.
      </p>
      <p className="text-base text-muted-foreground/50 mt-3">
        Det tar ca. 1 minutt. Du kan endre alt senere.
      </p>
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
      subtitle="Velg rollen som best beskriver deg. Du kan lage flere profiler senere."
      primary={{ label: "Neste", onClick: onNext, disabled: !type }}
      secondary={{ label: "Tilbake", onClick: onBack }}
    >
      <div className="space-y-3">
        {WIZARD_ROLES.map(({ type: t, label, icon: Icon, desc }) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={`group w-full flex items-center gap-4 py-5 px-1 text-left transition-all duration-200 border-b ${
              type === t
                ? "border-accent/30"
                : "border-border/10 hover:border-border/30"
            }`}
          >
            <div className={`h-11 w-11 rounded-lg flex items-center justify-center shrink-0 transition-colors duration-200 ${
              type === t ? "bg-accent/15" : "bg-muted/30 group-hover:bg-muted/50"
            }`}>
              <Icon className={`h-5 w-5 transition-colors duration-200 ${
                type === t ? "text-accent" : "text-muted-foreground/60 group-hover:text-muted-foreground"
              }`} />
            </div>
            <div className="flex-1 min-w-0">
              <span className={`text-lg font-medium transition-colors ${
                type === t ? "text-foreground" : "text-foreground/80"
              }`}>{label}</span>
              <p className="text-base text-muted-foreground/50 mt-0.5">{desc}</p>
            </div>
            {type === t && <Check className="h-6 w-6 text-accent shrink-0" />}
          </button>
        ))}
      </div>
    </StepLayout>
  );
}

/* ── Step 2: Navn (only) ── */
function StepName({
  name,
  setName,
  onNext,
  onBack,
}: {
  name: string;
  setName: (v: string) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <StepLayout
      title="Hva heter du?"
      subtitle="Skriv navnet du bruker profesjonelt, for rollen du har satt."
      primary={{ label: "Neste", onClick: onNext, disabled: !name.trim() }}
      secondary={{ label: "Tilbake", onClick: onBack }}
    >
      <div className="space-y-3">
        <Label htmlFor="name" className="text-base text-muted-foreground">Navn</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Fullt navn"
          className="text-xl h-14 bg-transparent border-border/20 focus:border-accent/40"
        />
        <p className="text-base text-muted-foreground/40 pt-1">
          Band og prosjekter legger du til senere.
        </p>
      </div>
    </StepLayout>
  );
}

/* ── Step 3: Profilbilde + Bio ── */
function StepProfile({
  name,
  type,
  bio,
  setBio,
  avatarUrl,
  setAvatarUrl,
  avatarImageSettings,
  setAvatarImageSettings,
  onNext,
  onBack,
}: {
  name: string;
  type: string | null;
  bio: string;
  setBio: (v: string) => void;
  avatarUrl: string;
  setAvatarUrl: (v: string) => void;
  avatarImageSettings: ImageSettings | null;
  setAvatarImageSettings: (v: ImageSettings | null) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const roleLabel = type ? getPersonaTypeLabel(type) : null;
  return (
    <StepLayout
      title="Skriv litt om deg"
      subtitle={`Beskriv din tilknytning til musikkbransjen – knyttet til rollen din som ${roleLabel ?? "…"}.`}
      primary={{ label: "Neste", onClick: onNext }}
      secondary={{ label: "Tilbake", onClick: onBack }}
    >
      <div className="space-y-8">
        {/* Role indicator */}
        {roleLabel && (
          <div className="flex items-center gap-2">
            <span className="text-base text-muted-foreground/50">Du vises som</span>
            <span className="text-base font-medium text-accent">{roleLabel}</span>
          </div>
        )}

        {/* Avatar */}
        <div className="flex items-center gap-5">
          <Avatar className="h-20 w-20 ring-2 ring-border/20 shrink-0">
            {avatarUrl ? (
              <AvatarImage src={avatarUrl} style={getCroppedImageStyles(avatarImageSettings)} className="object-cover" />
            ) : null}
            <AvatarFallback className="text-2xl bg-muted/30 text-muted-foreground/50">
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
            <p className="text-xs text-muted-foreground/40 mt-1">Valgfritt</p>
          </div>
        </div>

        {/* Bio */}
        <div className="space-y-3">
          <Label htmlFor="bio" className="text-base text-muted-foreground">Om deg</Label>
          <Textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="F.eks. «Trommis i Kråkesølv, freelance lydtekniker i Bergen»"
            rows={3}
            className="text-lg bg-transparent border-border/20 focus:border-accent/40 resize-none"
          />
          <p className="text-base text-muted-foreground/40">
            Valgfritt – du kan legge til dette senere.
          </p>
        </div>
      </div>
    </StepLayout>
  );
}

/* ── Step 4: Synlighet ── */
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
      <div className="space-y-6">
        {/* Preview */}
        <div className="flex items-center gap-3 py-4 border-b border-border/10">
          <Avatar className="h-11 w-11 ring-2 ring-border/20 shrink-0">
            {avatarUrl ? <AvatarImage src={avatarUrl} style={getCroppedImageStyles(avatarImageSettings)} className="object-cover" /> : null}
            <AvatarFallback className="text-sm bg-muted/30 text-muted-foreground/50">
              {name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-lg font-semibold text-foreground truncate">{name}</p>
            <p className="text-base text-muted-foreground/60">{type ? getPersonaTypeLabel(type) : "—"}</p>
          </div>
        </div>

        {/* Visibility options */}
        <div className="space-y-3">
          <button
            onClick={() => setIsPublic(true)}
            className={`group w-full text-left py-4 px-1 border-b transition-all duration-200 ${
              isPublic
                ? "border-accent/30"
                : "border-border/10 hover:border-border/30"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-lg font-medium text-foreground">Offentlig</span>
              {isPublic && <Check className="h-6 w-6 text-accent shrink-0" />}
            </div>
            <p className="text-base text-muted-foreground/50 mt-1">
              Synlig gjennom søk for alle i GIGGEN.
            </p>
          </button>

          <button
            onClick={() => setIsPublic(false)}
            className={`group w-full text-left py-4 px-1 border-b transition-all duration-200 ${
              !isPublic
                ? "border-accent/30"
                : "border-border/10 hover:border-border/30"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-lg font-medium text-foreground">Kontrollert</span>
              {!isPublic && <Check className="h-6 w-6 text-accent shrink-0" />}
            </div>
            <p className="text-base text-muted-foreground/50 mt-1">
              Kun synlig for medlemmer i team og prosjekter du er en del av.
            </p>
          </button>
        </div>
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
  icon,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  primary: { label: string; onClick: () => void; disabled?: boolean };
  secondary?: { label: string; onClick: () => void };
  showLegal?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-10 py-10 sm:py-16 animate-fade-in">
      {/* Header */}
      <div>
        {icon && <div className="mb-5">{icon}</div>}
        <h1 className="text-4xl sm:text-5xl font-bold text-foreground tracking-tight leading-[1.05]">{title}</h1>
        {subtitle && (
          <p className="text-lg text-muted-foreground/60 mt-4 leading-relaxed max-w-md">{subtitle}</p>
        )}
      </div>

      {/* Content */}
      <div>{children}</div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4">
        <div>
          {secondary && (
            <button onClick={secondary.onClick} className="text-base text-muted-foreground/40 hover:text-muted-foreground transition-colors">
              {secondary.label}
            </button>
          )}
        </div>
        <Button
          onClick={primary.onClick}
          disabled={primary.disabled}
          className="h-12 px-8 text-base font-semibold group"
        >
          {primary.label}
          <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-0.5 transition-transform duration-200" />
        </Button>
      </div>

      {showLegal && (
        <p className="text-xs text-muted-foreground/30 text-center -mt-6">
          Ved å fortsette godtar du våre{" "}
          <Link to="/vilkar" className="underline hover:text-muted-foreground/50">vilkår</Link>
          {" "}og{" "}
          <Link to="/personvern" className="underline hover:text-muted-foreground/50">personvern</Link>.
        </p>
      )}
    </div>
  );
}
