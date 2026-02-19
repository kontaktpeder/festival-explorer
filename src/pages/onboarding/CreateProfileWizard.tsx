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
import { Music, Camera, Wrench, Building2, Check, ChevronRight } from "lucide-react";
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
    <div className="min-h-[100svh] bg-background flex flex-col relative overflow-hidden">
      {/* Ambient gradient glows */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-accent/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/4 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-accent-warm/5 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/4 pointer-events-none" />

      {/* Top bar – glassmorphism */}
      <header
        className="relative z-20 w-full bg-background/60 backdrop-blur-xl border-b border-border/20"
        style={{ paddingTop: "max(env(safe-area-inset-top, 0px), 0px)" }}
      >
        <div className="w-full max-w-2xl mx-auto px-6 sm:px-10 py-3 flex items-center justify-between">
          <Link to="/" className="text-sm font-semibold text-foreground tracking-tight">
            GIGGEN <span className="text-muted-foreground/50 font-normal text-[10px] tracking-[0.15em]">BACKSTAGE</span>
          </Link>
          <ProgressDots current={step} total={stepCount} />
        </div>
      </header>

      {/* Content area */}
      <div className="relative z-10 flex-1 flex flex-col justify-center w-full max-w-2xl mx-auto px-6 sm:px-10">
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
      title="Velkommen til GIGGEN Backstage"
      primary={{ label: "Kom i gang", onClick: onNext }}
      secondary={{ label: "Avbryt", onClick: onCancel }}
      icon={<img src={welcomeBg} alt="" className="h-16 w-16 sm:h-20 sm:w-20 object-contain opacity-80" />}
    >
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground leading-relaxed">
          Her lager du din profesjonelle profil.<br />
          Arrangører, musikere og tilskuere bruker den for å finne deg.
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
      subtitle="Rollen du velger, gir deg tilgang til relevante verktøy for ditt felt. Senere kan du lage flere profiler med ulike roller."
      primary={{ label: "Neste", onClick: onNext, disabled: !type }}
      secondary={{ label: "Tilbake", onClick: onBack }}
    >
      <div className="space-y-2.5">
        {WIZARD_ROLES.map(({ type: t, label, icon: Icon, desc }) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={`group w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-all duration-300 ${
              type === t
                ? "border-accent/50 bg-accent/10 shadow-lg shadow-accent/5"
                : "border-border/20 bg-card/40 backdrop-blur-sm hover:border-border/40 hover:bg-card/60"
            }`}
          >
            <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 transition-colors duration-300 ${
              type === t ? "bg-accent/20" : "bg-muted/50 group-hover:bg-accent/10"
            }`}>
              <Icon className={`h-5 w-5 transition-colors duration-300 ${
                type === t ? "text-accent" : "text-muted-foreground group-hover:text-accent/70"
              }`} />
            </div>
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
      <div className="rounded-xl border border-border/20 bg-card/40 backdrop-blur-sm p-5">
        <Label htmlFor="name" className="text-xs text-muted-foreground">Navn</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Fullt navn"
          className="mt-1.5 text-base bg-background/50 border-border/30"
        />
        <p className="text-[10px] text-muted-foreground/50 mt-1.5">
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
      <div className="space-y-6">
        {/* Role badge */}
        {roleLabel && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20">
            <span className="text-xs text-muted-foreground">Du vises som</span>
            <span className="text-xs font-semibold text-accent">{roleLabel}</span>
          </div>
        )}

        {/* Avatar */}
        <div className="flex items-center gap-3 rounded-xl border border-border/20 bg-card/40 backdrop-blur-sm p-4">
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

        {/* Bio */}
        <div className="rounded-xl border border-border/20 bg-card/40 backdrop-blur-sm p-5">
          <Label htmlFor="bio" className="text-xs text-muted-foreground">Om deg</Label>
          <Textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="F.eks. «Trommis i Kråkesølv, freelance lydtekniker i Bergen»"
            rows={3}
            className="mt-1.5 text-base bg-background/50 border-border/30 resize-none"
          />
          <p className="text-[10px] text-muted-foreground/50 mt-1.5">
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
      <div className="space-y-4">
        {/* Preview */}
        <div className="flex items-center gap-3 p-4 rounded-xl bg-card/60 backdrop-blur-sm border border-border/20">
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
          className={`group w-full text-left p-4 rounded-xl border transition-all duration-300 ${
            isPublic
              ? "border-accent/50 bg-accent/10 shadow-lg shadow-accent/5"
              : "border-border/20 bg-card/40 backdrop-blur-sm hover:border-border/40 hover:bg-card/60"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">Offentlig</span>
            {isPublic && <Check className="h-4 w-4 text-accent shrink-0" />}
          </div>
          <p className="text-xs text-muted-foreground/70 mt-0.5">
            Synlig gjennom søk for alle i GIGGEN.
          </p>
        </button>

        <button
          onClick={() => setIsPublic(false)}
          className={`group w-full text-left p-4 rounded-xl border transition-all duration-300 ${
            !isPublic
              ? "border-accent/50 bg-accent/10 shadow-lg shadow-accent/5"
              : "border-border/20 bg-card/40 backdrop-blur-sm hover:border-border/40 hover:bg-card/60"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">Kontrollert</span>
            {!isPublic && <Check className="h-4 w-4 text-accent shrink-0" />}
          </div>
          <p className="text-xs text-muted-foreground/70 mt-0.5">
            Kun synlig for medlemmer i team og prosjekter du er en del av.
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
    <div className="flex flex-col gap-8 py-8 sm:py-12 animate-fade-in">
      {/* Header */}
      <div>
        {icon && <div className="mb-4">{icon}</div>}
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground tracking-tight leading-[1.1]">{title}</h1>
        {subtitle && (
          <p className="text-sm text-muted-foreground/70 mt-2 leading-relaxed">{subtitle}</p>
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
          className="sm:h-10 sm:px-6 font-semibold group"
        >
          {primary.label}
          <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-0.5 transition-transform duration-300" />
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
