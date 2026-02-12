import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingState } from "@/components/ui/LoadingState";
import { PersonaSelector } from "@/components/dashboard/PersonaSelector";
import { PersonaModusBar } from "@/components/dashboard/PersonaModusBar";
import { USE_PERSONA_MODUS_BAR } from "@/lib/ui-features";
import { Link } from "react-router-dom";
import { User, Lock, ArrowLeft, Mail } from "lucide-react";

export default function Settings() {
  const { data: authUser, isLoading } = useQuery({
    queryKey: ["auth-user-settings"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      return user;
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <LoadingState />
      </div>
    );
  }

  return (
    <div className="min-h-[100svh] bg-background pb-[env(safe-area-inset-bottom)]">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-3 sm:px-4 py-2.5 sm:py-3 flex justify-between items-center">
          <Link to="/dashboard" className="text-base sm:text-xl font-bold text-primary hover:opacity-80 transition-opacity">
            GIGGEN
          </Link>
          {!USE_PERSONA_MODUS_BAR && <PersonaSelector />}
        </div>
      </header>
      {USE_PERSONA_MODUS_BAR && <PersonaModusBar />}

      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 max-w-2xl space-y-3 sm:space-y-6">
        <h1 className="text-lg sm:text-2xl font-bold text-foreground">Innstillinger</h1>

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
                <span className="truncate">{authUser?.email}</span>
                <span className="shrink-0">· Kan ikke endres</span>
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Button asChild variant="outline" size="sm" className="justify-start h-9">
                <Link to="/dashboard/account">
                  <User className="h-3.5 w-3.5 mr-2" />
                  Kontosenter
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="justify-start h-9">
                <Link to="/dashboard/settings/change-password">
                  <Lock className="h-3.5 w-3.5 mr-2" />
                  Endre passord
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

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
