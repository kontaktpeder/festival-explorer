import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus, Pencil, ExternalLink, Eye, EyeOff } from "lucide-react";
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
import { Trash2 } from "lucide-react";

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

  return (
    <div className="container max-w-4xl py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Mine profiler</h1>
          <p className="text-muted-foreground">
            Offentlige identiteter du kan bruke på GIGGEN
          </p>
        </div>
        <Button asChild>
          <Link to="/dashboard/personas/new">
            <Plus className="h-4 w-4 mr-2" />
            Ny profil
          </Link>
        </Button>
      </div>

      {(!personas || personas.length === 0) ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              Du har ingen offentlige profiler ennå
            </p>
            <Button asChild>
              <Link to="/dashboard/personas/new">
                <Plus className="h-4 w-4 mr-2" />
                Opprett din første profil
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {personas.map((persona) => (
            <Card key={persona.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={persona.avatar_url || undefined} />
                    <AvatarFallback>
                      {persona.name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">{persona.name}</CardTitle>
                      {persona.is_public ? (
                        <Badge variant="secondary" className="text-xs">
                          <Eye className="h-3 w-3 mr-1" />
                          Offentlig
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          <EyeOff className="h-3 w-3 mr-1" />
                          Privat
                        </Badge>
                      )}
                    </div>
                    {persona.bio && (
                      <CardDescription className="mt-1 line-clamp-2">
                        {persona.bio}
                      </CardDescription>
                    )}
                    {persona.category_tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {persona.category_tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {persona.is_public && (
                      <Button variant="ghost" size="icon" asChild>
                        <Link to={`/p/${persona.slug}`} target="_blank">
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" asChild>
                      <Link to={`/dashboard/personas/${persona.id}`}>
                        <Pencil className="h-4 w-4" />
                      </Link>
                    </Button>
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
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
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

      <div className="pt-4">
        <Button variant="outline" asChild>
          <Link to="/dashboard">← Tilbake til dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
