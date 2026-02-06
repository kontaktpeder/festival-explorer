import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { LoadingState } from "@/components/ui/LoadingState";
import { PersonaSelector } from "@/components/dashboard/PersonaSelector";
import { useToast } from "@/hooks/use-toast";
import { useContactInfo, useUpsertContactInfo } from "@/hooks/useContactInfo";
import { toast as sonnerToast } from "sonner";
import { Link } from "react-router-dom";
import { User, Mail, Lock, ArrowLeft, Contact, Pencil, Save, X } from "lucide-react";
import { InlineMediaPickerWithCrop } from "@/components/admin/InlineMediaPickerWithCrop";
import type { ImageSettings } from "@/types/database";
import { parseImageSettings } from "@/types/database";
import { getCroppedImageStyles } from "@/lib/image-crop-helpers";

export default function Settings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [displayName, setDisplayName] = useState("");
  const [handle, setHandle] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarImageSettings, setAvatarImageSettings] = useState<ImageSettings | null>(null);

  // Contact info
  const { data: contactInfo } = useContactInfo();
  const upsertContactInfo = useUpsertContactInfo();
  const [editingContact, setEditingContact] = useState(false);
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("")
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

  // Populate form when profile loads
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
      toast({ title: "Profil oppdatert" });
    },
    onError: (error: Error) => {
      toast({ title: "Feil", description: error.message, variant: "destructive" });
    },
  });

  const handleSave = () => {
    updateProfile.mutate({
      display_name: displayName || null,
      handle: handle || null,
      avatar_url: avatarUrl || null,
      avatar_image_settings: avatarImageSettings,
    });
  };

  const handleSaveContact = async () => {
    if (useAsDefault) {
      if (!contactName.trim() || contactName.trim().length < 2) {
        sonnerToast.error("Navn må være minst 2 tegn");
        return;
      }
      if (!contactEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail.trim())) {
        sonnerToast.error("Ugyldig e-postadresse");
        return;
      }
    }
    try {
      await upsertContactInfo.mutateAsync({
        contact_name: contactName.trim() || null,
        contact_email: contactEmail.trim() || null,
        contact_phone: contactPhone.trim() || null,
        use_as_default: useAsDefault,
      });
      sonnerToast.success("Kontaktinfo lagret");
      setEditingContact(false);
    } catch (err: any) {
      sonnerToast.error(err.message || "Kunne ikke lagre");
    }
  };

  const handleCancelContact = () => {
    setContactName(contactInfo?.contact_name || "");
    setContactEmail(contactInfo?.contact_email || profile?.email || "");
    setContactPhone(contactInfo?.contact_phone || "");
    setUseAsDefault(contactInfo?.use_as_default ?? true);
    setEditingContact(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <LoadingState />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <Link to="/dashboard" className="text-lg sm:text-xl font-bold text-primary hover:opacity-80 transition-opacity">
            GIGGEN
          </Link>
          <PersonaSelector />
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 sm:py-8 max-w-2xl space-y-4 sm:space-y-6">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Innstillinger</h1>

        {/* Profile Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profil
            </CardTitle>
            <CardDescription>
              Administrer din profilinformasjon. Dette brukes for å identifisere deg i team-medlemmer.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 sm:space-y-6">
            <div className="flex items-center gap-3 sm:gap-4">
              <Avatar className="h-12 w-12 sm:h-16 sm:w-16">
                <AvatarImage 
                  src={avatarUrl || undefined} 
                  style={getCroppedImageStyles(avatarImageSettings)}
                />
                <AvatarFallback className="text-base sm:text-lg">
                  {(displayName || profile?.email || "U").charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="font-medium text-foreground truncate">{displayName || "Ingen navn"}</p>
                <p className="text-xs sm:text-sm text-muted-foreground truncate">{profile?.email}</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Profilbilde</Label>
              <InlineMediaPickerWithCrop
                value={avatarUrl}
                imageSettings={avatarImageSettings}
                onChange={setAvatarUrl}
                onSettingsChange={setAvatarImageSettings}
                cropMode="avatar"
                placeholder="Velg profilbilde"
              />
              <p className="text-xs text-muted-foreground">
                Velg et bilde fra filbank som ditt profilbilde
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="displayName">Visningsnavn</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Ditt navn"
              />
              <p className="text-xs text-muted-foreground">
                Dette navnet vises i team-medlemmer
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="handle">Handle</Label>
              <Input
                id="handle"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                placeholder="@brukernavn"
              />
              <p className="text-xs text-muted-foreground">
                Valgfritt brukernavn
              </p>
            </div>

            <Button onClick={handleSave} disabled={updateProfile.isPending}>
              {updateProfile.isPending ? "Lagrer..." : "Lagre endringer"}
            </Button>
          </CardContent>
        </Card>

        {/* Account Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Konto
            </CardTitle>
            <CardDescription>
              Din kontoinformasjon
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>E-post</Label>
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Lock className="h-4 w-4" />
                {profile?.email} · Kan ikke endres
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <Button asChild variant="outline" size="sm" className="justify-start sm:justify-center">
                <Link to="/dashboard/settings/change-password">
                  <Lock className="h-4 w-4 mr-2" />
                  Endre passord
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="justify-start sm:justify-center">
                <Link to="/dashboard/account">
                  <User className="h-4 w-4 mr-2" />
                  Kontosenter
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Contact Info – inline */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Contact className="h-5 w-5" />
                  Kontaktinfo
                </CardTitle>
                <CardDescription>
                  Brukes når du sender forespørsler via GIGGEN. Ikke synlig for andre.
                </CardDescription>
              </div>
              {!editingContact ? (
                <Button variant="ghost" size="sm" onClick={() => setEditingContact(true)}>
                  <Pencil className="h-4 w-4 mr-1" />
                  Rediger
                </Button>
              ) : (
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={handleCancelContact}>
                    <X className="h-4 w-4 mr-1" />
                    Avbryt
                  </Button>
                  <Button size="sm" onClick={handleSaveContact} disabled={upsertContactInfo.isPending}>
                    <Save className="h-4 w-4 mr-1" />
                    {upsertContactInfo.isPending ? "Lagrer..." : "Lagre"}
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Navn {useAsDefault && "*"}</Label>
              {editingContact ? (
                <Input
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="Ditt fulle navn"
                />
              ) : (
                <p className="text-sm text-foreground">{contactName || <span className="text-muted-foreground italic">Ikke satt</span>}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">E-post {useAsDefault && "*"}</Label>
                {editingContact ? (
                  <Input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder={profile?.email || "din@epost.no"}
                  />
                ) : (
                  <p className="text-sm text-foreground">{contactEmail || <span className="text-muted-foreground italic">Ikke satt</span>}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Telefon</Label>
                {editingContact ? (
                  <Input
                    type="tel"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="+47 000 00 000"
                  />
                ) : (
                  <p className="text-sm text-foreground">{contactPhone || <span className="text-muted-foreground italic">Ikke satt</span>}</p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border/30">
              <div>
                <p className="text-sm font-medium">Bruk som standard</p>
                <p className="text-xs text-muted-foreground">Fyll inn automatisk i kontaktskjemaer</p>
              </div>
              {editingContact ? (
                <Switch checked={useAsDefault} onCheckedChange={setUseAsDefault} />
              ) : (
                <span className="text-sm text-muted-foreground">{useAsDefault ? "Ja" : "Nei"}</span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Back to dashboard */}
        <div className="pt-4">
          <Button asChild variant="outline">
            <Link to="/dashboard">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Tilbake til backstage
            </Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
