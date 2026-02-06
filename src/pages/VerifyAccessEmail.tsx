import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PageLayout } from "@/components/layout/PageLayout";
import { StaticLogo } from "@/components/ui/StaticLogo";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

export default function VerifyAccessEmail() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [name, setName] = useState("");

  const token = searchParams.get("token");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      return;
    }

    let cancelled = false;

    supabase.functions
      .invoke("verify-access-email", { body: { token } })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data?.success) {
          setStatus("error");
        } else {
          setStatus("success");
          setName(data.name || "");
        }
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <PageLayout>
      <div className="min-h-screen bg-black text-white">
        <StaticLogo />
        <div className="pt-20 md:pt-24" />

        <section className="px-4 md:px-8 py-20 max-w-md mx-auto text-center">
          {status === "loading" && (
            <>
              <Loader2 className="h-12 w-12 text-accent mx-auto animate-spin" />
              <h1 className="text-xl font-semibold mt-6">Bekrefter e-post…</h1>
            </>
          )}

          {status === "success" && (
            <>
              <CheckCircle className="h-12 w-12 text-accent mx-auto" />
              <h1 className="text-xl font-semibold mt-6">
                E-post bekreftet{name ? `, ${name}` : ""}!
              </h1>
              <p className="text-white/60 text-sm mt-3">
                Din forespørsel er nå bekreftet. Vi tar kontakt så snart vi kan.
              </p>
            </>
          )}

          {status === "error" && (
            <>
              <XCircle className="h-12 w-12 text-destructive mx-auto" />
              <h1 className="text-xl font-semibold mt-6">Kunne ikke bekrefte</h1>
              <p className="text-white/60 text-sm mt-3">
                Lenken er ugyldig eller allerede brukt.
              </p>
            </>
          )}

          <Link to="/">
            <Button variant="outline" className="mt-8">
              Tilbake til forsiden
            </Button>
          </Link>
        </section>
      </div>
    </PageLayout>
  );
}
