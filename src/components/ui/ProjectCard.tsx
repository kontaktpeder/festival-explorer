import { Link } from "react-router-dom";
import type { Project, Entity } from "@/types/database";
import { useSignedMediaUrl } from "@/hooks/useSignedMediaUrl";

// Support both legacy Project and new Entity types
type ProjectOrEntity = Project | Entity;

interface ProjectCardProps {
  project: ProjectOrEntity;
  size?: "sm" | "md";
}

export function ProjectCard({ project, size = "md" }: ProjectCardProps) {
  // Signed URL for public viewing
  const imageUrl = useSignedMediaUrl(project.hero_image_url, 'public');

  return (
    <Link
      to={`/project/${project.slug}`}
      className="cosmic-card block group overflow-hidden"
    >
      {imageUrl ? (
        <div className={`relative ${size === "sm" ? "h-24 w-24" : "h-40"} overflow-hidden`}>
          <img
            src={imageUrl}
            alt={project.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />
        </div>
      ) : (
        <div className={`${size === "sm" ? "h-24 w-24" : "h-40"} bg-secondary flex items-center justify-center`}>
          <span className="text-3xl font-bold text-muted-foreground/30">
            {project.name.charAt(0)}
          </span>
        </div>
      )}

      <div className="p-3">
        <h3 className="text-display font-semibold group-hover:text-accent transition-colors truncate">
          {project.name}
        </h3>
        {project.tagline && (
          <p className="text-sm text-muted-foreground truncate mt-0.5">
            {project.tagline}
          </p>
        )}
      </div>
    </Link>
  );
}
