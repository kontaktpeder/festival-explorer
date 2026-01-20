import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus, Pencil, ExternalLink, Eye, EyeOff, Info } from "lucide-react";
import { useMyPersonas, useUpdatePersona, useDeletePersona } from "@/hooks/usePersona";
import { LoadingState } from "@/components/ui/LoadingState";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Trash2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Helper to generate context-based description from tags
function getTagDescription(tags: string[]): string {
  const descriptions: Record<string, string> = {
    musiker: "spiller eller bookes som musiker",
    fotograf: "jobber med foto",
    videograf: "jobber med video",
    dj: "spiller som DJ",
    tekniker: "jobber med lyd/lys",
    festivalsjef: "organiserer arrangementer",
    booking: "booker artister",
    manager: "representerer artister",
    bartender: "jobber i bar",
    arrangør: "organiserer events",
  };

  const matches = tags
    .map(tag => descriptions[tag.toLowerCase()])
    .filter(Boolean);

  if (matches.length === 0) return "representerer deg offentlig";
  if (matches.length === 1) return matches[0];
  return matches.slice(0, 2).join(" eller ");
}

export default function MyPersonas() {
  const { data: personas, isLoading, error } = useMyPersonas();
  const updatePersona = useUpdatePersona();
  const deletePersona = useDeletePersona();

  const handleTogglePublic = async (id: string, currentValue: boolean) => {
    try {
      await updatePersona.mutateAsync({ id, is_public: !currentValue });
      toast.success(currentValue ? "Profil skjult" : "Profil synlig");
    } catch (err) {
      toast.error("Kunne ikke oppdatere profil");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deletePersona.mutateAsync(id);
      toast.success("Profil slettet");
    } catch (err) {
      toast.error("Kunne ikke slette profil");
    }
  };

  if (isLoading) return <LoadingState />;
  if (error) return <div className="text-destructive">Feil ved lasting av profiler</div>;

  const isFirstVisit = !personas || personas.length === 0;

  return (
    <TooltipProvider>
      <div className="container max-w-4xl py-8 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold">Hvordan vil du være synlig på GIGGEN?</h1>
            <p className="text-muted-foreground">
              Du kan ha flere profiler – f.eks. som musiker, fotograf eller arrangør.
            </p>
          </div>
          <Button asChild>
            <Link to="/dashboard/personas/new">
              <Plus className="h-4 w-4 mr-2" />
              Ny offentlig profil
            </Link>
          </Button>
        </div>

        {/* Info box explaining the concept */}
        <Alert className="bg-muted/50 border-muted">
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Hva er dette?</strong> En profil er måten andre ser deg på.
            Du kan ha én som musiker, én som fotograf – eller én generell.
          </AlertDescription>
        </Alert>

        {isFirstVisit ? (
          <Card>
            <CardContent className="py-12 text-center space-y-4">
              <p className="text-muted-foreground">
                Du har ingen offentlige profiler ennå.
              </p>
              <p className="text-sm text-muted-foreground">
                For eksempel: "Ola – Fotograf" eller "Ola – DJ"
              </p>
              <Button asChild>
                <Link to="/dashboard/personas/new">
                  <Plus className="h-4 w-4 mr-2" />
                  Lag din første profil
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {personas?.map((persona, index) => (
              <Card key={persona.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={persona.avatar_url || undefined} />
                      <AvatarFallback>
                        {persona.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <CardTitle className="text-lg">{persona.name}</CardTitle>
                        {persona.is_public ? (
                          <Badge variant="secondary" className="text-xs">
                            <Eye className="h-3 w-3 mr-1" />
                            Offentlig
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            <EyeOff className="h-3 w-3 mr-1" />
                            Skjult
                          </Badge>
                        )}
                      </div>
                      
                      {persona.bio && (
                        <CardDescription className="line-clamp-2">
                          {persona.bio}
                        </CardDescription>
                      )}
                      
                      {persona.category_tags && persona.category_tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {persona.category_tags.map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* Contextual usage hint */}
                      <p className="text-xs text-muted-foreground">
                        Brukes når du {getTagDescription(persona.category_tags || [])}
                      </p>

                      {/* First profile hint */}
                      {index === 0 && personas.length === 1 && (
                        <p className="text-xs text-muted-foreground italic">
                          Dette er din første offentlige profil. Du kan lage flere senere.
                        </p>
                      )}
                    </div>
                    
                    {/* Action buttons with tooltips */}
                    <div className="flex items-center gap-1">
                      {persona.is_public && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" asChild>
                              <Link to={`/p/${persona.slug}`} target="_blank">
                                <ExternalLink className="h-4 w-4" />
                              </Link>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Se offentlig profil</TooltipContent>
                        </Tooltip>
                      )}
                      
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" asChild>
                            <Link to={`/dashboard/personas/${persona.id}`}>
                              <Pencil className="h-4 w-4" />
                            </Link>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Rediger profilen</TooltipContent>
                      </Tooltip>
                      
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleTogglePublic(persona.id, persona.is_public)}
                          >
                            {persona.is_public ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {persona.is_public ? "Skjul midlertidig" : "Gjør synlig"}
                        </TooltipContent>
                      </Tooltip>
                      
                      <AlertDialog>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                          </TooltipTrigger>
                          <TooltipContent>Slett profilen</TooltipContent>
                        </Tooltip>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Slett profil?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Dette vil permanent slette profilen "{persona.name}". 
                              Handlingen kan ikke angres.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Avbryt</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(persona.id)}
                              className="bg-destructive text-destructive-foreground"
                            >
                              Slett
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}

        {/* CTA hint under button area */}
        {!isFirstVisit && (
          <div className="text-center">
            <Button variant="outline" asChild>
              <Link to="/dashboard/personas/new">
                <Plus className="h-4 w-4 mr-2" />
                Lag ny offentlig profil
              </Link>
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              For eksempel: "Ola – Fotograf" eller "Ola – DJ"
            </p>
          </div>
        )}

        <div className="pt-4">
          <Button variant="outline" asChild>
            <Link to="/dashboard">← Tilbake til backstage</Link>
          </Button>
        </div>
      </div>
    </TooltipProvider>
  );
}
