import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LoadingState } from "@/components/ui/LoadingState";
import { PersonaSelector } from "@/components/dashboard/PersonaSelector";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { User, Mail, Lock, ArrowLeft } from "lucide-react";
import { InlineMediaPicker } from "@/components/admin/InlineMediaPicker";

export default function Settings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [displayName, setDisplayName] = useState("");
  const [handle, setHandle] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  // Get current user profile
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
    }
  }, [profile]);

  // Update profile mutation
  const updateProfile = useMutation({
    mutationFn: async (updates: { display_name?: string | null; handle?: string | null; avatar_url?: string | null }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("profiles")
        .update(updates)
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
    });
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
          <Link to="/dashboard" className="text-xl font-bold text-primary hover:opacity-80 transition-opacity">
            GIGGEN
          </Link>
          <PersonaSelector />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Innstillinger</h1>

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
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={avatarUrl || undefined} />
                <AvatarFallback className="text-lg">
                  {(displayName || profile?.email || "U").charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-foreground">{displayName || "Ingen navn"}</p>
                <p className="text-sm text-muted-foreground">{profile?.email}</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Profilbilde</Label>
              <InlineMediaPicker
                value={avatarUrl}
                onChange={setAvatarUrl}
                accept="image/*"
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

            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline">
                <Link to="/dashboard/settings/change-password">
                  <Lock className="h-4 w-4 mr-2" />
                  Endre passord
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/dashboard/account">
                  <User className="h-4 w-4 mr-2" />
                  Kontosenter
                </Link>
              </Button>
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
