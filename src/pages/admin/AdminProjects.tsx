import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Plus, ExternalLink, Settings, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function AdminProjects() {
  const queryClient = useQueryClient();

  const { data: projects, isLoading } = useQuery({
    queryKey: ["admin-projects"],
    queryFn: async () => {
      const { data } = await supabase
        .from("projects")
        .select("*")
        .order("name");
      return data || [];
    },
  });

  const togglePublished = useMutation({
    mutationFn: async ({ id, is_published }: { id: string; is_published: boolean }) => {
      await supabase.from("projects").update({ is_published }).eq("id", id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-projects"] });
    },
  });

  if (isLoading) {
    return <div className="text-muted-foreground">Laster artister...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Artister / Projects</h1>
        <Button asChild>
          <Link to="/admin/projects/new">
            <Plus className="h-4 w-4 mr-2" />
            Ny artist
          </Link>
        </Button>
      </div>

      <div className="space-y-4">
        {projects?.map((project) => (
          <div
            key={project.id}
            className="bg-card border border-border rounded-lg p-6"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <h2 className="text-xl font-semibold text-foreground">
                    {project.name}
                  </h2>
                  <Badge variant={project.type === "band" ? "default" : "secondary"}>
                    {project.type === "band" ? "Band" : "Solo"}
                  </Badge>
                  <Badge variant={project.is_published ? "default" : "outline"}>
                    {project.is_published ? "Publisert" : "Utkast"}
                  </Badge>
                </div>
                
                {project.tagline && (
                  <p className="text-muted-foreground">{project.tagline}</p>
                )}
              </div>

              <div className="flex gap-2">
                <Button asChild variant="ghost" size="sm">
                  <Link to={`/admin/projects/${project.id}`}>
                    <Settings className="h-4 w-4 mr-2" />
                    Rediger
                  </Link>
                </Button>
                <Button asChild variant="ghost" size="sm">
                  <Link to={`/project/${project.slug}`} target="_blank">
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-border flex gap-2">
              <Button
                variant={project.is_published ? "outline" : "default"}
                size="sm"
                onClick={() => togglePublished.mutate({
                  id: project.id,
                  is_published: !project.is_published
                })}
              >
                {project.is_published ? "Gjør til utkast" : "Publiser"}
              </Button>
            </div>
          </div>
        ))}

        {projects?.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p>Ingen artister ennå.</p>
            <Button asChild className="mt-4">
              <Link to="/admin/projects/new">Opprett din første artist</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
