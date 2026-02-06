import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
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

  // Delete account mutation - calls edge function that deletes profile data AND auth user
  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      if (!session?.user) throw new Error("Not authenticated");

      // Call the delete-account edge function which:
      // 1. Calls delete_user_safely RPC (transfers/deletes profile data)
      // 2. Deletes the auth.users entry using service role
      const { data, error } = await supabase.functions.invoke('delete-account');

      if (error) throw error;
      
      if (data?.error) {
        throw new Error(data.details || data.error);
      }

      // Sign out locally (session is now invalid anyway)
      await supabase.auth.signOut();
      
      return data as {
        success: boolean;
        warning?: string;
        deleted_personas: number;
        deleted_team_memberships: number;
        deleted_platform_access: number;
        affected_invitations: number;
        deleted_media: number;
        deleted_designs: number;
        deleted_staff_roles: number;
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
          ? `Din konto er permanent slettet. ${summary.join(', ')}.`
          : "Din konto og all tilknyttet data har blitt slettet."
      });
      window.location.href = "/";
    },
    onError: (error: Error) => {
      toast({ 
        title: "Feil ved sletting", 
        description: error.message || "Kunne ikke slette konto. Prøv igjen.", 
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

      <main className="container mx-auto px-4 py-6 sm:py-8 max-w-md space-y-4 sm:space-y-6">
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

        {/* Account & Actions */}
        <div className="space-y-1">
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm text-muted-foreground">E-post</p>
              <p className="text-foreground">{session.user.email}</p>
            </div>
          </div>

          <Separator />

          <button
            onClick={handleLogout}
            disabled={logoutMutation.isPending}
            className="flex items-center gap-3 w-full py-3 text-left text-foreground hover:text-accent transition-colors"
          >
            <LogOut className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{logoutMutation.isPending ? "Logger ut..." : "Logg ut"}</span>
          </button>

          <Separator />

          <Link
            to="/dashboard/privacy"
            className="flex items-center gap-3 w-full py-3 text-foreground hover:text-accent transition-colors"
          >
            <Shield className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">Personvernpolicy</span>
          </Link>

          <Link
            to="/dashboard/settings"
            className="flex items-center gap-3 w-full py-3 text-foreground hover:text-accent transition-colors"
          >
            <Lock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">Endre passord</span>
          </Link>
        </div>

        <Separator />

        {/* Delete Account – compact */}
        <div className="pt-2">
          <button
            onClick={() => setShowDeleteDialog(true)}
            className="flex items-center gap-3 w-full py-3 text-destructive/70 hover:text-destructive transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            <span className="text-sm">Slett konto</span>
          </button>
          <p className="text-xs text-muted-foreground pl-7">
            Permanent sletting av konto og personlige data.
          </p>
        </div>

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
