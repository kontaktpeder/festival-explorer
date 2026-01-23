import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import { LoadingState } from "@/components/ui/LoadingState";
import { PersonaSelector } from "@/components/dashboard/PersonaSelector";
import { useToast } from "@/hooks/use-toast";
import { Link, useNavigate } from "react-router-dom";
import { 
  LogOut, 
  Trash2, 
  Shield, 
  AlertTriangle, 
  ArrowLeft,
  Lock
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";

export default function AccountCenter() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [confirmDeleteText, setConfirmDeleteText] = useState("");

  // Get current user
  const { data: session, isLoading: isLoadingSession } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      return session;
    },
  });

  // Get profile
  const { data: profile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ["my-profile"],
    queryFn: async () => {
      if (!session?.user) return null;
      
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!session?.user,
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Logget ut" });
      window.location.href = "/";
    },
    onError: (error: Error) => {
      toast({ 
        title: "Feil", 
        description: error.message, 
        variant: "destructive" 
      });
    },
  });

  // Delete account mutation - uses safe RPC that preserves shared projects
  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      if (!session?.user) throw new Error("Not authenticated");

      // Call the safe deletion RPC that:
      // - Transfers ownership of shared entities/events/festivals to other team members
      // - Preserves media files that are in use by shared projects
      // - Deletes personal data: profile, personas, team memberships, platform access
      const { data, error } = await supabase.rpc('delete_user_safely', {
        p_user_id: session.user.id
      });

      if (error) throw error;

      // Sign out after successful deletion
      await supabase.auth.signOut();
      
      return data as {
        success: boolean;
        deleted_personas: number;
        deleted_team_memberships: number;
        deleted_platform_access: number;
        deleted_invitations: number;
        deleted_media: number;
        deleted_designs: number;
        transferred_media: number;
        transferred_entities: number;
        transferred_events: number;
        transferred_festivals: number;
      };
    },
    onSuccess: (data) => {
      const summary = [];
      if (data?.deleted_personas > 0) summary.push(`${data.deleted_personas} persona(er)`);
      if (data?.transferred_entities > 0) summary.push(`${data.transferred_entities} prosjekt(er) overført`);
      if (data?.transferred_media > 0) summary.push(`${data.transferred_media} mediefil(er) bevart`);
      
      toast({ 
        title: "Konto slettet", 
        description: summary.length > 0 
          ? `Din konto er slettet. ${summary.join(', ')}.`
          : "Din konto og profil har blitt slettet."
      });
      window.location.href = "/";
    },
    onError: (error: Error) => {
      toast({ 
        title: "Feil", 
        description: error.message || "Kunne ikke slette konto", 
        variant: "destructive" 
      });
    },
  });

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const handleDeleteAccount = () => {
    if (confirmDeleteText.toLowerCase() !== "slett") {
      toast({ 
        title: "Bekreftelse påkrevd", 
        description: 'Skriv "slett" for å bekrefte', 
        variant: "destructive" 
      });
      return;
    }
    deleteAccountMutation.mutate();
  };

  if (isLoadingSession || isLoadingProfile) {
    return (
      <div className="min-h-screen bg-background">
        <LoadingState />
      </div>
    );
  }

  if (!session) {
    navigate("/admin/login");
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <Link to="/dashboard" className="text-lg sm:text-xl font-bold text-primary hover:opacity-80 transition-opacity">
            GIGGEN <span className="text-muted-foreground font-normal text-xs sm:text-base">BACKSTAGE</span>
          </Link>
          <PersonaSelector />
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 sm:py-8 max-w-2xl space-y-4 sm:space-y-6">
        <div className="flex items-center gap-2 sm:gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 sm:h-9 sm:w-9"
            onClick={() => navigate("/dashboard/settings")}
          >
            <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Kontosenter</h1>
        </div>

        {/* Account Info */}
        <Card>
          <CardHeader>
            <CardTitle>Kontoinformasjon</CardTitle>
            <CardDescription>
              Administrer kontoen din
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">E-post</p>
              <p className="text-foreground">{session.user.email}</p>
            </div>
            <Separator />
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Bruker-ID</p>
              <p className="text-xs text-muted-foreground font-mono break-all">
                {session.user.id}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Logout */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LogOut className="h-5 w-5" />
              Logg ut
            </CardTitle>
            <CardDescription>
              Logg ut fra kontoen din på denne enheten
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleLogout} variant="outline" disabled={logoutMutation.isPending}>
              <LogOut className="h-4 w-4 mr-2" />
              {logoutMutation.isPending ? "Logger ut..." : "Logg ut"}
            </Button>
          </CardContent>
        </Card>

        {/* Privacy */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Personvern
            </CardTitle>
            <CardDescription>
              Les om hvordan vi håndterer dine personopplysninger
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Vi tar personvern på alvor. Her er informasjon om hvordan vi samler inn, 
                bruker og beskytter dine personopplysninger.
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Personopplysninger vi samler inn:</p>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>E-postadresse (brukes til autentisering og kommunikasjon)</li>
                <li>Visningsnavn og profilinformasjon (du bestemmer selv hva som deles)</li>
                <li>Prosjektdata og innhold du oppretter (ligger under din kontroll)</li>
              </ul>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Dine rettigheter:</p>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Du kan når som helst se, endre eller slette dine personopplysninger</li>
                <li>Du kan be om eksport av dine data</li>
                <li>Du kan når som helst slette kontoen din</li>
              </ul>
            </div>

            <Button asChild variant="outline" size="sm">
              <Link to="/dashboard/privacy">
                <Lock className="h-4 w-4 mr-2" />
                Les full personvernpolicy
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Delete Account */}
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Slett konto
            </CardTitle>
            <CardDescription>
              Dette er en permanent handling som ikke kan angres
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
              <div className="flex gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <p className="text-sm font-medium text-destructive">Advarsel: Permanent sletting</p>
                  <p className="text-sm text-muted-foreground">
                    Når du sletter kontoen din:
                  </p>
                  
                  <p className="text-xs font-medium text-foreground mt-2">Følgende slettes permanent:</p>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Din profil og all profilinformasjon</li>
                    <li>Alle dine personas (offentlige profiler)</li>
                    <li>Dine tilganger til prosjekter og scener</li>
                    <li>Mediefiler som kun du bruker</li>
                  </ul>
                  
                  <p className="text-xs font-medium text-foreground mt-2">Følgende bevares for delte prosjekter:</p>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Prosjekter du har opprettet (overføres til andre team-medlemmer)</li>
                    <li>Bilder og filer som er i bruk av prosjekter (eierskap overføres)</li>
                    <li>Arrangementer og festivaler (forblir tilgjengelige)</li>
                  </ul>
                  
                  <p className="text-sm text-destructive font-medium mt-2">
                    Du kan ikke angre denne handlingen.
                  </p>
                </div>
              </div>
            </div>

            <Button 
              variant="destructive"
              onClick={() => setShowDeleteDialog(true)}
              className="w-full"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Slett konto
            </Button>
          </CardContent>
        </Card>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Er du helt sikker?
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-4">
                <p className="text-sm">
                  Dette vil permanent slette kontoen din og all tilknyttet data. 
                  Denne handlingen kan ikke angres.
                </p>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Skriv "slett" for å bekrefte:
                  </label>
                  <Input
                    value={confirmDeleteText}
                    onChange={(e) => setConfirmDeleteText(e.target.value)}
                    placeholder="slett"
                    autoFocus
                  />
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
              <AlertDialogCancel onClick={() => setConfirmDeleteText("")} className="w-full sm:w-auto">
                Avbryt
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDeleteAccount}
                className="w-full sm:w-auto bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={deleteAccountMutation.isPending}
              >
                {deleteAccountMutation.isPending ? "Sletter..." : "Ja, slett kontoen min"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
}
