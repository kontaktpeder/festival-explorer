import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { PersonaModusBar } from "@/components/dashboard/PersonaModusBar";
import { USE_PERSONA_MODUS_BAR } from "@/lib/ui-features";
import { useToast } from "@/hooks/use-toast";
import { useContactInfo, useUpsertContactInfo } from "@/hooks/useContactInfo";
import { toast as sonnerToast } from "sonner";
import { Link, useNavigate } from "react-router-dom";
import { 
  LogOut, 
  Trash2, 
  Shield, 
  AlertTriangle, 
  ArrowLeft,
  Lock,
  Pencil,
  Save,
  X
} from "lucide-react";
import { Separator } from "@/components/ui/separator";

export default function AccountCenter() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [confirmDeleteText, setConfirmDeleteText] = useState("");

  // Contact info editing
  const { data: contactInfo, isLoading: isLoadingContact } = useContactInfo();
  const upsertContactInfo = useUpsertContactInfo();
  const [editingContact, setEditingContact] = useState(false);
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [useAsDefault, setUseAsDefault] = useState(true);

  // Get current user
  const { data: session, isLoading: isLoadingSession } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      return session;
    },
  });

  // Populate contact form
  useEffect(() => {
    if (contactInfo) {
      setContactName(contactInfo.contact_name || "");
      setContactEmail(contactInfo.contact_email || "");
      setContactPhone(contactInfo.contact_phone || "");
      setUseAsDefault(contactInfo.use_as_default);
    } else if (session?.user?.email && !contactInfo) {
      setContactEmail(session.user.email);
    }
  }, [contactInfo, session?.user?.email]);

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

      // Sync public_email for personas with use_account_contact = true
      if (session?.user?.id) {
        const { data: personas } = await supabase
          .from("personas")
          .select("id, use_account_contact")
          .eq("user_id", session.user.id);

        const accountPersonas = (personas || []).filter(
          (p) => (p as any).use_account_contact === true
        );

        for (const persona of accountPersonas) {
          await supabase
            .from("personas")
            .update({
              public_email: contactEmail.trim() || null,
              show_email: !!contactEmail.trim(),
            } as any)
            .eq("id", persona.id);
        }
      }

      sonnerToast.success("Kontaktinfo lagret");
      setEditingContact(false);
    } catch (err: any) {
      sonnerToast.error(err.message || "Kunne ikke lagre");
    }
  };

  const handleCancelContact = () => {
    setContactName(contactInfo?.contact_name || "");
    setContactEmail(contactInfo?.contact_email || session?.user?.email || "");
    setContactPhone(contactInfo?.contact_phone || "");
    setUseAsDefault(contactInfo?.use_as_default ?? true);
    setEditingContact(false);
  };

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
      toast({ title: "Feil", description: error.message, variant: "destructive" });
    },
  });

  // Delete account mutation
  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      if (!session?.user) throw new Error("Not authenticated");
      const { data, error } = await supabase.functions.invoke('delete-account');
      if (error) throw error;
      if (data?.error) throw new Error(data.details || data.error);
      await supabase.auth.signOut();
      return data;
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
      toast({ title: "Feil ved sletting", description: error.message || "Kunne ikke slette konto. Prøv igjen.", variant: "destructive" });
    },
  });

  const handleLogout = () => logoutMutation.mutate();

  const handleDeleteAccount = () => {
    if (confirmDeleteText.toLowerCase() !== "slett") {
      toast({ title: "Bekreftelse påkrevd", description: 'Skriv "slett" for å bekrefte', variant: "destructive" });
      return;
    }
    deleteAccountMutation.mutate();
  };

  if (isLoadingSession || isLoadingContact) {
    return <div className="min-h-screen bg-background"><LoadingState /></div>;
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
          {!USE_PERSONA_MODUS_BAR && <PersonaSelector />}
        </div>
      </header>
      {USE_PERSONA_MODUS_BAR && <PersonaModusBar />}

      <main className="container mx-auto px-4 py-6 sm:py-8 max-w-md space-y-4 sm:space-y-6">
        <div className="flex items-center gap-2 sm:gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9" onClick={() => navigate("/dashboard/settings")}>
            <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Kontosenter</h1>
        </div>

        {/* Contact Info Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Kontaktinfo</p>
              <p className="text-xs text-muted-foreground">
                Brukes som standard for dine personas og i kontaktskjemaer. Rediger per persona under Mine personer.
              </p>
            </div>
            {!editingContact ? (
              <Button variant="ghost" size="sm" onClick={() => setEditingContact(true)}>
                <Pencil className="h-3.5 w-3.5 mr-1" />
                Rediger
              </Button>
            ) : (
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={handleCancelContact} disabled={upsertContactInfo.isPending}>
                  <X className="h-3.5 w-3.5 mr-1" />
                  Avbryt
                </Button>
                <Button size="sm" onClick={handleSaveContact} disabled={upsertContactInfo.isPending}>
                  <Save className="h-3.5 w-3.5 mr-1" />
                  {upsertContactInfo.isPending ? "Lagrer..." : "Lagre"}
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-3 pl-0">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Navn {useAsDefault && "*"}</Label>
              {editingContact ? (
                <Input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Ditt fulle navn" className="bg-transparent border-border/50 focus:border-accent" />
              ) : (
                <p className="text-sm text-foreground">{contactName || <span className="text-muted-foreground/50 italic">Ikke satt</span>}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">E-post {useAsDefault && "*"}</Label>
              {editingContact ? (
                <Input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder={session.user.email || "din@epost.no"} className="bg-transparent border-border/50 focus:border-accent" />
              ) : (
                <p className="text-sm text-foreground truncate">{contactEmail || <span className="text-muted-foreground/50 italic">Ikke satt</span>}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Telefon</Label>
              {editingContact ? (
                <Input type="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="+47 000 00 000" className="bg-transparent border-border/50 focus:border-accent" />
              ) : (
                <p className="text-sm text-foreground">{contactPhone || <span className="text-muted-foreground/50 italic">Ikke satt</span>}</p>
              )}
            </div>
            <div className="flex items-center justify-between py-2 border-t border-border/30">
              <div>
                <p className="text-xs font-medium">Bruk som standard</p>
                <p className="text-[11px] text-muted-foreground">Automatisk i kontaktskjemaer</p>
              </div>
              {editingContact ? (
                <Switch checked={useAsDefault} onCheckedChange={setUseAsDefault} />
              ) : (
                <span className="text-xs text-muted-foreground">{useAsDefault ? "Ja" : "Nei"}</span>
              )}
            </div>
          </div>
        </div>

        <Separator />

        {/* Account & Actions */}
        <div className="space-y-1">
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm text-muted-foreground">E-post</p>
              <p className="text-foreground">{session.user.email}</p>
            </div>
          </div>

          <Separator />

          <button onClick={handleLogout} disabled={logoutMutation.isPending} className="flex items-center gap-3 w-full py-3 text-left text-foreground hover:text-accent transition-colors">
            <LogOut className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{logoutMutation.isPending ? "Logger ut..." : "Logg ut"}</span>
          </button>

          <Separator />

          <Link to="/dashboard/privacy" className="flex items-center gap-3 w-full py-3 text-foreground hover:text-accent transition-colors">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">Personvernpolicy</span>
          </Link>

          <Link to="/dashboard/settings/change-password" className="flex items-center gap-3 w-full py-3 text-foreground hover:text-accent transition-colors">
            <Lock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">Endre passord</span>
          </Link>
        </div>

        <Separator />

        {/* Delete Account */}
        <div className="pt-2">
          <button onClick={() => setShowDeleteDialog(true)} className="flex items-center gap-3 w-full py-3 text-destructive/70 hover:text-destructive transition-colors">
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
                  <Input value={confirmDeleteText} onChange={(e) => setConfirmDeleteText(e.target.value)} placeholder="slett" autoFocus />
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
              <AlertDialogCancel onClick={() => setConfirmDeleteText("")} className="w-full sm:w-auto">Avbryt</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteAccount} className="w-full sm:w-auto bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={deleteAccountMutation.isPending}>
                {deleteAccountMutation.isPending ? "Sletter..." : "Ja, slett kontoen min"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
}
