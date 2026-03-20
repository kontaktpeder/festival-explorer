import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useEventFirstAccess } from "@/hooks/useEventFirstAccess";
import { LoadingState } from "@/components/ui/LoadingState";
import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";

interface EventFirstGuardProps {
  children: ReactNode;
}

/**
 * Wraps any route that requires Event-first access.
 * Shows loading → denied → or renders children.
 */
export function EventFirstGuard({ children }: EventFirstGuardProps) {
  const { isLoading, canAccess, reason } = useEventFirstAccess();
  const navigate = useNavigate();

  if (isLoading) {
    return <LoadingState message="Sjekker tilgang..." />;
  }

  if (!canAccess) {
    return (
      <div className="min-h-[60svh] flex flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="h-14 w-14 rounded-2xl bg-destructive/10 flex items-center justify-center">
          <ShieldAlert className="h-7 w-7 text-destructive" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">Ikke tilgjengelig</h2>
        <p className="text-sm text-muted-foreground max-w-xs">
          {reason === "not_admin"
            ? "Denne funksjonen er foreløpig kun tilgjengelig for administratorer."
            : reason === "not_authenticated"
            ? "Du må være innlogget for å se denne siden."
            : "Denne funksjonen er ikke aktivert ennå."}
        </p>
        <Button variant="outline" size="sm" onClick={() => navigate("/dashboard")}>
          Tilbake til dashbord
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}
