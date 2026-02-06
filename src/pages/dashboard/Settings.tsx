import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { LoadingState } from "@/components/ui/LoadingState";
import { PersonaSelector } from "@/components/dashboard/PersonaSelector";
import { useToast } from "@/hooks/use-toast";
import { useContactInfo, useUpsertContactInfo } from "@/hooks/useContactInfo";
import { toast as sonnerToast } from "sonner";
import { Link } from "react-router-dom";
import { User, Mail, Lock, ArrowLeft, Pencil, Save, X } from "lucide-react";
import { InlineMediaPickerWithCrop } from "@/components/admin/InlineMediaPickerWithCrop";
import type { ImageSettings } from "@/types/database";
import { parseImageSettings } from "@/types/database";
import { getCroppedImageStyles } from "@/lib/image-crop-helpers";

export default function Settings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [editing, setEditing] = useState(false);

  // Profile state
  const [displayName, setDisplayName] = useState("");
  const [handle, setHandle] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarImageSettings, setAvatarImageSettings] = useState<ImageSettings | null>(null);

  // Contact info state
  const { data: contactInfo } = useContactInfo();
  const upsertContactInfo = useUpsertContactInfo();
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [useAsDefault, setUseAsDefault] = useState(true);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["my-profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      return { ...data, email: user.email };
    },
  });

  // Populate profile form
  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || "");
      setHandle(profile.handle || "");
      setAvatarUrl(profile.avatar_url || "");
      setAvatarImageSettings(parseImageSettings(profile.avatar_image_settings) || null);
    }
  }, [profile]);

  // Populate contact info
  useEffect(() => {
    if (contactInfo) {
      setContactName(contactInfo.contact_name || "");
      setContactEmail(contactInfo.contact_email || "");
      setContactPhone(contactInfo.contact_phone || "");
      setUseAsDefault(contactInfo.use_as_default);
    } else if (profile?.email && !contactInfo) {
      setContactEmail(profile.email);
    }
  }, [contactInfo, profile?.email]);

  // Update profile mutation
  const updateProfile = useMutation({
    mutationFn: async (updates: { display_name?: string | null; handle?: string | null; avatar_url?: string | null; avatar_image_settings?: ImageSettings | null }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("profiles")
        .update(updates as Record<string, unknown>)
        .eq("id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-profile"] });
      queryClient.invalidateQueries({ queryKey: ["entity-team"] });
    },
    onError: (error: Error) => {
      toast({ title: "Feil", description: error.message, variant: "destructive" });
    },
  });

  const isSaving = updateProfile.isPending || upsertContactInfo.isPending;

  const handleSave = async () => {
    if (useAsDefault) {
      if (!contactName.trim() || contactName.trim().length < 2) {
        sonnerToast.error("Kontaktnavn må være minst 2 tegn");
        return;
      }
      if (!contactEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail.trim())) {
        sonnerToast.error("Ugyldig kontakt-e-postadresse");
        return;
      }
    }

    try {
      await updateProfile.mutateAsync({
        display_name: displayName || null,
        handle: handle || null,
        avatar_url: avatarUrl || null,
        avatar_image_settings: avatarImageSettings,
      });

      await upsertContactInfo.mutateAsync({
        contact_name: contactName.trim() || null,
        contact_email: contactEmail.trim() || null,
        contact_phone: contactPhone.trim() || null,
        use_as_default: useAsDefault,
      });

      sonnerToast.success("Profil oppdatert");
      setEditing(false);
    } catch (err: any) {
      sonnerToast.error(err.message || "Kunne ikke lagre");
    }
  };

  const handleCancel = () => {
    setDisplayName(profile?.display_name || "");
    setHandle(profile?.handle || "");
    setAvatarUrl(profile?.avatar_url || "");
    setAvatarImageSettings(parseImageSettings(profile?.avatar_image_settings) || null);
    setContactName(contactInfo?.contact_name || "");
    setContactEmail(contactInfo?.contact_email || profile?.email || "");
    setContactPhone(contactInfo?.contact_phone || "");
    setUseAsDefault(contactInfo?.use_as_default ?? true);
    setEditing(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <LoadingState />
      </div>
    );
  }

  return (
    <div className="min-h-[100svh] bg-background pb-[env(safe-area-inset-bottom)]">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-3 sm:px-4 py-2.5 sm:py-3 flex justify-between items-center">
          <Link to="/dashboard" className="text-base sm:text-xl font-bold text-primary hover:opacity-80 transition-opacity">
            GIGGEN
          </Link>
          <PersonaSelector />
        </div>
      </header>

      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 max-w-2xl space-y-3 sm:space-y-6">
        <h1 className="text-lg sm:text-2xl font-bold text-foreground">Innstillinger</h1>

        {/* Profile + Contact Info */}
        <Card>
          <CardHeader className="px-4 py-3 sm:p-6">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <CardTitle className="flex items-center gap-2 text-base sm:text-2xl">
                  <User className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                  Profil
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm mt-0.5">
                  Profilinformasjon og kontaktinfo.
                </CardDescription>
              </div>
              {!editing ? (
                <Button variant="ghost" size="sm" className="shrink-0 h-8 px-2 sm:px-3" onClick={() => setEditing(true)}>
                  <Pencil className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />
                  <span className="text-xs sm:text-sm">Rediger</span>
                </Button>
              ) : (
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="sm" className="h-8 px-2 sm:px-3" onClick={handleCancel} disabled={isSaving}>
                    <X className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />
                    <span className="text-xs sm:text-sm">Avbryt</span>
                  </Button>
                  <Button size="sm" className="h-8 px-2 sm:px-3" onClick={handleSave} disabled={isSaving}>
                    <Save className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />
                    <span className="text-xs sm:text-sm">{isSaving ? "Lagrer..." : "Lagre"}</span>
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6 pt-0 space-y-3 sm:space-y-6">
            {/* Avatar + identity summary */}
            <div className="flex items-center gap-3">
              <Avatar className="h-11 w-11 sm:h-16 sm:w-16 shrink-0">
                <AvatarImage
                  src={avatarUrl || undefined}
                  style={getCroppedImageStyles(avatarImageSettings)}
                />
                <AvatarFallback className="text-sm sm:text-lg">
                  {(displayName || profile?.email || "U").charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="font-medium text-foreground truncate text-sm sm:text-base">{displayName || "Ingen navn"}</p>
                <p className="text-xs text-muted-foreground truncate">{profile?.email}</p>
              </div>
            </div>

            {/* Profile picture picker */}
            {editing && (
              <div className="space-y-1.5">
                <Label className="text-xs sm:text-sm">Profilbilde</Label>
                <InlineMediaPickerWithCrop
                  value={avatarUrl}
                  imageSettings={avatarImageSettings}
                  onChange={setAvatarUrl}
                  onSettingsChange={setAvatarImageSettings}
                  cropMode="avatar"
                  placeholder="Velg profilbilde"
                />
                <p className="text-[11px] sm:text-xs text-muted-foreground">
                  Velg et bilde fra filbank
                </p>
              </div>
            )}

            {/* Display name */}
            <div className="space-y-1 sm:space-y-2">
              <Label htmlFor="displayName" className="text-xs sm:text-sm">Visningsnavn</Label>
              {editing ? (
                <Input
                  id="displayName"
                  className="text-base sm:text-sm h-10"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Ditt navn"
                />
              ) : (
                <p className="text-sm text-foreground">{displayName || <span className="text-muted-foreground italic">Ikke satt</span>}</p>
              )}
              <p className="text-[11px] sm:text-xs text-muted-foreground">
                Vises i team-medlemmer
              </p>
            </div>

            {/* Handle */}
            <div className="space-y-1 sm:space-y-2">
              <Label htmlFor="handle" className="text-xs sm:text-sm">Handle</Label>
              {editing ? (
                <Input
                  id="handle"
                  className="text-base sm:text-sm h-10"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  placeholder="@brukernavn"
                />
              ) : (
                <p className="text-sm text-foreground">{handle || <span className="text-muted-foreground italic">Ikke satt</span>}</p>
              )}
              <p className="text-[11px] sm:text-xs text-muted-foreground">
                Valgfritt brukernavn
              </p>
            </div>

            {/* Separator */}
            <Separator />
            <p className="text-xs sm:text-sm font-medium text-muted-foreground">Kontakt (valgfritt)</p>

            {/* Contact name */}
            <div className="space-y-1 sm:space-y-2">
              <Label className="text-[11px] sm:text-xs text-muted-foreground">Navn {useAsDefault && "*"}</Label>
              {editing ? (
                <Input
                  className="text-base sm:text-sm h-10"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="Ditt fulle navn"
                />
              ) : (
                <p className="text-sm text-foreground">{contactName || <span className="text-muted-foreground italic">Ikke satt</span>}</p>
              )}
            </div>

            {/* Contact email + phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-1 sm:space-y-2">
                <Label className="text-[11px] sm:text-xs text-muted-foreground">E-post {useAsDefault && "*"}</Label>
                {editing ? (
                  <Input
                    type="email"
                    className="text-base sm:text-sm h-10"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder={profile?.email || "din@epost.no"}
                  />
                ) : (
                  <p className="text-sm text-foreground truncate">{contactEmail || <span className="text-muted-foreground italic">Ikke satt</span>}</p>
                )}
              </div>
              <div className="space-y-1 sm:space-y-2">
                <Label className="text-[11px] sm:text-xs text-muted-foreground">Telefon</Label>
                {editing ? (
                  <Input
                    type="tel"
                    className="text-base sm:text-sm h-10"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="+47 000 00 000"
                  />
                ) : (
                  <p className="text-sm text-foreground">{contactPhone || <span className="text-muted-foreground italic">Ikke satt</span>}</p>
                )}
              </div>
            </div>

            {/* Use as default */}
            <div className="flex items-center justify-between py-2 border-t border-border/30">
              <div className="min-w-0 mr-3">
                <p className="text-xs sm:text-sm font-medium">Bruk som standard</p>
                <p className="text-[11px] sm:text-xs text-muted-foreground">Automatisk i kontaktskjemaer</p>
              </div>
              {editing ? (
                <Switch checked={useAsDefault} onCheckedChange={setUseAsDefault} />
              ) : (
                <span className="text-xs sm:text-sm text-muted-foreground shrink-0">{useAsDefault ? "Ja" : "Nei"}</span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Account Settings */}
        <Card>
          <CardHeader className="px-4 py-3 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-2xl">
              <Mail className="h-4 w-4 sm:h-5 sm:w-5" />
              Konto
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Din kontoinformasjon
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6 pt-0 space-y-3 sm:space-y-4">
            <div className="space-y-1">
              <Label className="text-xs sm:text-sm">E-post</Label>
              <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1.5">
                <Lock className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                <span className="truncate">{profile?.email}</span>
                <span className="shrink-0">· Kan ikke endres</span>
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Button asChild variant="outline" size="sm" className="justify-start h-9">
                <Link to="/dashboard/settings/change-password">
                  <Lock className="h-3.5 w-3.5 mr-2" />
                  Endre passord
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="justify-start h-9">
                <Link to="/dashboard/account">
                  <User className="h-3.5 w-3.5 mr-2" />
                  Kontosenter
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Back to dashboard */}
        <div className="pt-2 pb-4">
          <Button asChild variant="outline" size="sm" className="h-9">
            <Link to="/dashboard">
              <ArrowLeft className="h-3.5 w-3.5 mr-2" />
              Tilbake til backstage
            </Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
