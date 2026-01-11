import { Link } from "react-router-dom";
import type { EventProject } from "@/types/database";

interface LineupItemProps {
  item: EventProject;
  showBilling?: boolean;
}

export function LineupItem({ item, showBilling }: LineupItemProps) {
  const project = item.project;
  if (!project) return null;

  return (
    <Link to={`/project/${project.slug}`} className="lineup-item group">
      <div className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-secondary">
        {project.profile_image_url ? (
          <img
            src={project.profile_image_url}
            alt={project.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-lg font-bold text-muted-foreground/40">
              {project.name.charAt(0)}
            </span>
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <h4 className="font-semibold truncate group-hover:text-accent transition-colors">
          {project.name}
        </h4>
        {project.tagline && (
          <p className="text-sm text-muted-foreground truncate">{project.tagline}</p>
        )}
      </div>

      {item.set_time && (
        <div className="text-mono text-muted-foreground flex-shrink-0">
          {item.set_time}
        </div>
      )}

      {showBilling && item.billing_order === 1 && (
        <span className="cosmic-tag-accent flex-shrink-0">Headliner</span>
      )}
    </Link>
  );
}
