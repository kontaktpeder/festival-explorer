import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Lock, Mail, Eye, EyeOff } from "lucide-react";

export default function ResetPassword() {
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sendingLink, setSendingLink] = useState(false);
  const [hasRecoverySession, setHasRecoverySession] = useState<boolean | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      const params = new URLSearchParams(hash.replace("#", ""));
      const errorDesc = params.get("error_description");
      if (errorDesc) {
        setLinkError(errorDesc.replace(/\+/g, " "));
        setHasRecoverySession(false);
        window.history.replaceState(null, "", window.location.pathname);
        return;
      }
    }

    let mounted = true;
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (mounted) setHasRecoverySession(!!session);
    };
    check();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) setHasRecoverySession(!!session);
    });
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleRequestLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSendingLink(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast({
        title: "Sjekk e-posten din",
        description: "Vi har sendt en lenke for å tilbakestille passord. Sjekk også spam.",
      });
    } catch (err: any) {
      toast({ title: "Feil", description: err.message ?? "Kunne ikke sende e-post", variant: "destructive" });
    } finally {
      setSendingLink(false);
    }
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast({ title: "Passordene matcher ikke", variant: "destructive" });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: "Passordet må være minst 6 tegn", variant: "destructive" });
      return;
    }
    setLoading(true);
    const TIMEOUT_MS = 15000;
    try {
      const updatePromise = supabase.auth.updateUser({ password: newPassword });
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Forespørselen tok for lang tid. Sjekk nettforbindelsen og prøv igjen.")), TIMEOUT_MS)
      );
      const { error } = await Promise.race([updatePromise, timeoutPromise]);
      if (error) throw error;
      toast({ title: "Passord oppdatert", description: "Du kan nå logge inn med det nye passordet." });
      navigate("/admin/login", { replace: true });
    } catch (err: any) {
      toast({ title: "Feil", description: err?.message ?? "Kunne ikke oppdatere passord", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (hasRecoverySession === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (linkError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Lenken har utløpt
            </CardTitle>
            <CardDescription>
              {linkError}. Be om en ny tilbakestillingslenke nedenfor.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleRequestLink} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-post</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="din@epost.no"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={sendingLink}>
                {sendingLink ? "Sender..." : "Send ny tilbakestillingslenke"}
              </Button>
            </form>
            <div className="text-center">
              <Link
                to="/admin/login"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Tilbake til innlogging
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (hasRecoverySession) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Sett nytt passord
            </CardTitle>
            <CardDescription>
              Velg et nytt passord for kontoen din (minst 6 tegn).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">Nytt passord</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minst 6 tegn"
                    minLength={6}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Bekreft passord</Label>
                <Input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Skriv passordet igjen"
                  minLength={6}
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Oppdaterer..." : "Oppdater passord"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Glemt passord?
          </CardTitle>
          <CardDescription>
            Skriv inn e-postadressen din. Vi sender deg en lenke for å tilbakestille passordet.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleRequestLink} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-post</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="din@epost.no"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={sendingLink}>
              {sendingLink ? "Sender..." : "Send tilbakestillingslenke"}
            </Button>
          </form>
          <div className="text-center">
            <Link
              to="/admin/login"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Tilbake til innlogging
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
