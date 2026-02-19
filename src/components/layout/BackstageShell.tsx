import { ReactNode } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import gIcon from "@/assets/giggen-g-icon-red.png";

interface BackstageShellProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  backTo?: string;
  externalLink?: { to: string; label: string };
  actions?: ReactNode;
}

export function BackstageShell({
  children,
  title,
  subtitle,
  backTo,
  externalLink,
  actions,
}: BackstageShellProps) {
  const navigate = useNavigate();

  return (
    <div className="min-h-[100svh] bg-background">
      {/* Header */}
      <header
        className="sticky top-0 z-50 bg-background/60 backdrop-blur-xl border-b border-border/20"
        style={{ paddingTop: "max(env(safe-area-inset-top, 0px), 0px)" }}
      >
        <div className="w-full px-4 sm:px-8 lg:px-12 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => (backTo ? navigate(backTo) : navigate(-1))}
              className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <span className="text-sm font-semibold tracking-tight text-foreground block truncate">
                {title}
              </span>
              {subtitle && (
                <span className="text-[10px] text-muted-foreground/60 block truncate">
                  {subtitle}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {externalLink && (
              <Button
                asChild
                variant="outline"
                size="sm"
                className="text-xs border-border/30 hover:border-accent/40"
              >
                <Link to={externalLink.to} target="_blank">
                  <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                  {externalLink.label}
                </Link>
              </Button>
            )}
            {actions}
            <img src={gIcon} alt="" className="h-8 w-8 object-contain ml-1" />
          </div>
        </div>
      </header>

      {/* Content */}
      <main
        className="w-full px-4 sm:px-8 lg:px-12 py-6 sm:py-8"
        style={{
          paddingBottom: "max(env(safe-area-inset-bottom, 0px), 2rem)",
        }}
      >
        {children}
      </main>
    </div>
  );
}
