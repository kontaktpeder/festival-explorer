import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { LoadingState } from "@/components/ui/LoadingState";

const checkIsAdmin = async (): Promise<boolean> => {
  const { data } = await supabase.rpc("is_admin");
  return data || false;
};

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  // If already logged in, redirect away from login page
  useEffect(() => {
    let isMounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!isMounted) return;
        if (session) {
          setTimeout(async () => {
            if (!isMounted) return;
            const isAdmin = await checkIsAdmin();
            navigate(isAdmin ? "/admin" : "/dashboard", { replace: true });
          }, 0);
        } else {
          setChecking(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return;
      if (session) {
        checkIsAdmin().then((isAdmin) => {
          if (isMounted) navigate(isAdmin ? "/admin" : "/dashboard", { replace: true });
        });
      } else {
        setChecking(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast({
        title: "Feil",
        description: error.message,
        variant: "destructive",
      });
    } else if (data.user) {
      const isAdmin = await checkIsAdmin();

      if (isAdmin) {
        toast({
          title: "Logget inn",
          description: "Velkommen til admin!",
        });
        navigate("/admin");
      } else {
        toast({
          title: "Logget inn",
          description: "Velkommen til backstage!",
        });
        navigate("/dashboard");
      }
    }

    setLoading(false);
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingState message="Sjekker innlogging..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">GIGGEN Backstage</h1>
          <p className="text-muted-foreground mt-2">
            Logg inn for å fortsette
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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

          <div className="space-y-2">
            <Label htmlFor="password">Passord</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              minLength={6}
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Vennligst vent..." : "Logg inn"}
          </Button>
        </form>

        <div className="text-center">
          <Link
            to="/request-access"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Ingen konto? Be om tilgang
          </Link>
        </div>
      </div>
    </div>
  );
}
