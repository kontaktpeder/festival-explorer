import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

interface BackToFestivalProps {
  festivalSlug: string;
  festivalName: string;
}

export function BackToFestival({ festivalSlug, festivalName }: BackToFestivalProps) {
  return (
    <Link
      to={`/festival/${festivalSlug}`}
      className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-accent transition-colors py-3"
    >
      <ArrowLeft className="w-4 h-4" />
      <span>Tilbake til {festivalName}</span>
    </Link>
  );
}
