import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { LoadingState } from "@/components/ui/LoadingState";
import { Button } from "@/components/ui/button";

/**
 * Handles Supabase OAuth (PKCE `?code=...`) and email-link returns.
 *
 * Configure in Supabase Auth → URL Configuration → Redirect URLs:
 *   https://<your-domain>/auth/callback
 */
export default function AuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const next = searchParams.get("next") || "/join/artist";

    const run = async () => {
      try {
        const search = window.location.search;
        if (search.includes("code=")) {
          const { error: exErr } = await supabase.auth.exchangeCodeForSession(
            window.location.href,
          );
          if (exErr) {
            if (!cancelled) setError(exErr.message);
            return;
          }
        }
        await supabase.auth.getSession();
        if (!cancelled) {
          navigate(next.startsWith("/") ? next : `/${next}`, { replace: true });
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Innlogging feilet.");
        }
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [navigate, searchParams]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="max-w-md w-full text-center space-y-4">
          <h1 className="text-xl font-semibold">Innlogging feilet</h1>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button onClick={() => navigate("/join/artist", { replace: true })}>
            Tilbake til oppstart
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <LoadingState />
    </div>
  );
}