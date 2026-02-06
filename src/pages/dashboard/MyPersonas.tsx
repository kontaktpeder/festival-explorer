import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus, Pencil, ExternalLink, Eye, EyeOff, Trash2, ArrowLeft } from "lucide-react";
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
  if (error) return <div className="text-destructive p-8">Feil ved lasting av profiler</div>;

  const hasPersonas = personas && personas.length > 0;

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b border-border/30 bg-background/80 backdrop-blur-sm sticky top-0 z-10">
          <div className="container max-w-3xl px-4 py-4 flex items-center justify-between">
            <Link 
              to="/dashboard" 
              className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Backstage</span>
            </Link>
            
            <h1 className="text-sm font-medium tracking-wide uppercase text-muted-foreground">
              Mine profiler
            </h1>
            
            <Button asChild size="sm" variant="outline" className="gap-1.5">
              <Link to="/dashboard/personas/new">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Ny</span>
              </Link>
            </Button>
          </div>
        </header>

        <main className="container max-w-3xl px-4 py-8 sm:py-12">
          {!hasPersonas ? (
            /* Empty state */
            <div className="text-center py-16 space-y-6">
              <div className="w-20 h-20 mx-auto rounded-full bg-accent/10 flex items-center justify-center">
                <Plus className="h-8 w-8 text-accent" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-semibold">Ingen profiler ennå</h2>
                <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                  Lag din første offentlige profil for å bli synlig på GIGGEN
                </p>
              </div>
              <Button asChild>
                <Link to="/dashboard/personas/new">
                  <Plus className="h-4 w-4 mr-2" />
                  Lag profil
                </Link>
              </Button>
            </div>
          ) : (
            /* Persona list */
            <div className="space-y-3">
              {personas.map((persona) => (
                <div 
                  key={persona.id}
                  className="group flex items-center gap-4 p-4 rounded-lg border border-border/30 bg-card/50 hover:bg-card/80 hover:border-border/50 transition-all"
                >
                  {/* Avatar */}
                  <Avatar className="h-14 w-14 sm:h-16 sm:w-16 flex-shrink-0">
                    <AvatarImage src={persona.avatar_url || undefined} />
                    <AvatarFallback className="text-lg bg-accent/10 text-accent">
                      {persona.name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  {/* Info */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium truncate">{persona.name}</h3>
                      <Badge 
                        variant={persona.is_public ? "secondary" : "outline"} 
                        className="text-[10px] px-1.5 py-0"
                      >
                        {persona.is_public ? "Synlig" : "Skjult"}
                      </Badge>
                    </div>
                    
                    {persona.category_tags && persona.category_tags.length > 0 && (
                      <p className="text-xs text-muted-foreground truncate">
                        {persona.category_tags.join(" · ")}
                      </p>
                    )}
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {persona.is_public && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                            <Link to={`/p/${persona.slug}`} target="_blank">
                              <ExternalLink className="h-4 w-4" />
                            </Link>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Se profil</TooltipContent>
                      </Tooltip>
                    )}
                    
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                          <Link to={`/dashboard/personas/${persona.id}`}>
                            <Pencil className="h-4 w-4" />
                          </Link>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Rediger</TooltipContent>
                    </Tooltip>
                    
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
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
                        {persona.is_public ? "Skjul" : "Gjør synlig"}
                      </TooltipContent>
                    </Tooltip>
                    
                    <AlertDialog>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                        </TooltipTrigger>
                        <TooltipContent>Slett</TooltipContent>
                      </Tooltip>
                      <AlertDialogContent className="max-w-sm">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Slett profil?</AlertDialogTitle>
                          <AlertDialogDescription>
                            "{persona.name}" slettes permanent.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Avbryt</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(persona.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Slett
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </TooltipProvider>
  );
}
