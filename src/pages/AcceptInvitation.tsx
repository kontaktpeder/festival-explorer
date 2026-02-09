import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useInvitation, useAcceptInvitation } from "@/hooks/useInvitations";
import { LoadingState } from "@/components/ui/LoadingState";
import { AlertCircle, Building2, User, Users, Check, LogIn } from "lucide-react";
import { ensureProfile } from "@/lib/admin-helpers";
import type { EntityType, AccessLevel } from "@/types/database";

const TYPE_ICONS: Record<EntityType, typeof Building2> = {
  venue: Building2,
  solo: User,
  band: Users,
};

// Platform entity slug for general invitations
const PLATFORM_SLUG = "giggen-platform";

// Human-friendly access descriptions
const ACCESS_CONFIG: Record<AccessLevel, { label: string; description: string }> = {
  owner: { label: "Eier", description: "Full kontroll over alt innhold og innstillinger" },
  admin: { label: "Administrator", description: "Du kan redigere innhold og invitere andre" },
  editor: { label: "Redaktør", description: "Du kan redigere innhold" },
  viewer: { label: "Leser", description: "Du kan se innhold" },
};

export default function AcceptInvitation() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const acceptInvitation = useAcceptInvitation();

  const tokenParam = searchParams.get("token") || searchParams.get("t") || "";
  const emailParam = searchParams.get("email") || "";
  const entityIdParam = searchParams.get("entity_id") || "";

  const [email, setEmail] = useState(emailParam);
  const [entityId, setEntityId] = useState(entityIdParam);

  const [password, setPassword] = useState("");
  const [isSignup, setIsSignup] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ id: string; email: string } | null>(null);
  const [acceptedSuccessfully, setAcceptedSuccessfully] = useState(false);

  // Fetch invitation details (prefer token)
  const { data: invitation, isLoading, error } = useInvitation({
    token: tokenParam || undefined,
    email: email || undefined,
    entityId: entityId || undefined,
  });

  // Hydrate email/entityId from invitation when opened by token
  useEffect(() => {
    if (!invitation) return;
    if (!email && invitation.email) setEmail(invitation.email);
    if (!entityId && invitation.entity_id) setEntityId(invitation.entity_id);
  }, [invitation, email, entityId]);

  // Check if user is already logged in
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setCurrentUser({
          id: session.user.id,
          email: session.user.email || "",
        });
      }
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setCurrentUser({
          id: session.user.id,
          email: session.user.email || "",
        });
      } else {
        setCurrentUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Auto-accept if already logged in with matching email
  useEffect(() => {
    const autoAccept = async () => {
      if (currentUser && invitation && currentUser.email === email && !acceptedSuccessfully) {
        await handleAccept(currentUser.id);
      }
    };
    autoAccept();
  }, [currentUser, invitation, email, acceptedSuccessfully]);

  const handleAccept = async (userId: string) => {
    if (!invitation?.token) {
      toast({ 
        title: "Feil", 
        description: "Invitasjonstoken mangler", 
        variant: "destructive" 
      });
      return;
    }

    try {
      setIsProcessing(true);
      
      // Ensure profile exists
      await ensureProfile(userId);
      
      await acceptInvitation.mutateAsync({
        token: invitation.token,
        userId,
      });

      setAcceptedSuccessfully(true);
      toast({ title: "Invitasjon akseptert!" });
      
      // Redirect after short delay
      setTimeout(() => {
        navigate("/dashboard");
      }, 2000);
    } catch (error: any) {
      toast({ 
        title: "Feil", 
        description: error.message || "Kunne ikke akseptere invitasjon", 
        variant: "destructive" 
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password || password.length < 6) {
      toast({ 
        title: "Ugyldig passord", 
        description: "Passordet må være minst 6 tegn", 
        variant: "destructive" 
      });
      return;
    }

    setIsProcessing(true);
    try {
      const token = invitation?.token || tokenParam;
      const redirectUrl = token
        ? `${window.location.origin}/accept-invitation?token=${encodeURIComponent(token)}`
        : `${window.location.origin}/accept-invitation?email=${encodeURIComponent(email)}&entity_id=${entityId}`;
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
        },
      });

      if (error) {
        // If user already exists, switch to login mode
        if (error.message.includes("already registered") || error.message.includes("already exists")) {
          setIsSignup(false);
          toast({ 
            title: "Konto finnes allerede", 
            description: "Logg inn med eksisterende passord", 
          });
          return;
        }
        throw error;
      }

      if (data.user && data.session) {
        // Auto-logged in (email confirmation disabled)
        await handleAccept(data.user.id);
      } else if (data.user) {
        // Email confirmation needed
        toast({ 
          title: "Sjekk e-posten din", 
          description: "Klikk på lenken i e-posten for å bekrefte kontoen din", 
        });
      }
    } catch (error: any) {
      toast({ 
        title: "Feil ved registrering", 
        description: error.message, 
        variant: "destructive" 
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        await handleAccept(data.user.id);
      }
    } catch (error: any) {
      toast({ 
        title: "Feil ved innlogging", 
        description: error.message, 
        variant: "destructive" 
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <LoadingState message="Laster invitasjon..." />
      </div>
    );
  }

  // Error or invalid invitation
  if (error || !invitation) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <CardTitle>Invitasjon ikke funnet</CardTitle>
            <CardDescription>
              Denne invitasjonen finnes ikke, har utløpt, eller er allerede brukt.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/")} className="w-full">
              Gå til forsiden
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if invitation expired
  if (new Date(invitation.expires_at) < new Date()) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-accent mx-auto mb-4" />
            <CardTitle>Invitasjonen har utløpt</CardTitle>
            <CardDescription>
              Denne invitasjonen har utløpt. Be om en ny lenke fra administratoren.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/")} className="w-full">
              Gå til forsiden
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state
  if (acceptedSuccessfully) {
    const TypeIcon = invitation.entity ? TYPE_ICONS[invitation.entity.type] : User;
    
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-accent/30 bg-accent/5">
          <CardHeader className="text-center">
            <Check className="h-12 w-12 text-accent mx-auto mb-4" />
            <CardTitle className="text-accent">Velkommen!</CardTitle>
            <CardDescription>
              Du er nå med i teamet til{" "}
              <strong className="text-foreground">{invitation.entity?.name}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <TypeIcon className="h-5 w-5 text-muted-foreground" />
              <Badge>{ACCESS_CONFIG[invitation.access].label}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Du blir sendt videre om noen sekunder...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Already logged in but different email
  if (currentUser && currentUser.email !== email) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-accent mx-auto mb-4" />
            <CardTitle>Feil e-postadresse</CardTitle>
            <CardDescription>
              Du er logget inn som <strong>{currentUser.email}</strong>, men denne invitasjonen er for <strong>{email}</strong>.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={async () => {
                await supabase.auth.signOut();
                setCurrentUser(null);
              }} 
              className="w-full"
            >
              Logg ut og prøv igjen
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Processing state while auto-accepting
  if (currentUser && isProcessing) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <LoadingState message="Aksepterer invitasjon..." />
      </div>
    );
  }

  // Main form (signup or login)
  const TypeIcon = invitation.entity ? TYPE_ICONS[invitation.entity.type] : User;
  
  // Determine if this is a platform/general invitation
  const isPlatformInvitation = invitation.entity?.slug === PLATFORM_SLUG || !invitation.entity?.name;
  const entityName = invitation.entity?.name || "GIGGEN";
  const accessConfig = ACCESS_CONFIG[invitation.access];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          {/* Entity/Platform visual */}
          {invitation.entity?.hero_image_url ? (
            <img
              src={invitation.entity.hero_image_url}
              alt={entityName}
              className="w-24 h-24 rounded-full object-cover mx-auto mb-4"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
              <TypeIcon className="h-10 w-10 text-muted-foreground" />
            </div>
          )}
          
          <CardTitle className="text-2xl">Du er invitert</CardTitle>
          
          <CardDescription className="text-base mt-2">
            {isPlatformInvitation ? (
              "Du har fått tilgang til GIGGEN-plattformen"
            ) : (
              <>
                Du er invitert til å bli med i{" "}
                <strong className="text-foreground">{entityName}</strong>
              </>
            )}
          </CardDescription>
          
          {/* Access level - human readable */}
          <div className="mt-4 space-y-2">
            <Badge variant="secondary" className="text-sm">
              Tilgang: {accessConfig.label}
            </Badge>
            <p className="text-xs text-muted-foreground">
              {accessConfig.description}
            </p>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={isSignup ? handleSignup : handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-post</Label>
              <Input
                id="email"
                type="email"
                value={email}
                readOnly
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">
                {isSignup ? "Velg passord" : "Passord"}
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isSignup ? "Minst 6 tegn" : "Ditt passord"}
                required
                minLength={isSignup ? 6 : undefined}
              />
            </div>

            <Button type="submit" className="w-full" disabled={isProcessing}>
              {isProcessing ? (
                "Behandler..."
              ) : isSignup ? (
                <>
                  <User className="h-4 w-4 mr-2" />
                  Opprett konto og få tilgang
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4 mr-2" />
                  Logg inn og få tilgang
                </>
              )}
            </Button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => setIsSignup(!isSignup)}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {isSignup
                  ? "Har du allerede konto? Logg inn og aksepter invitasjonen"
                  : "Ingen konto? Opprett en ny"}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
