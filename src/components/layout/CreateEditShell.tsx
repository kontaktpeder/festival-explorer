import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export interface CreateEditShellProps {
  title: string;
  subtitle?: string;
  stepIndex?: number;
  stepCount?: number;
  children: ReactNode;
  primaryAction: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  /** Show legal links in the footer (use on last step only) */
  showLegal?: boolean;
}

function ProgressDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2.5">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-2 rounded-full transition-all duration-300 ${
            i === current
              ? "w-8 bg-accent shadow-[0_0_8px_hsl(var(--accent)/0.4)]"
              : i < current
                ? "w-2 bg-accent/60"
                : "w-2 bg-border/40"
          }`}
        />
      ))}
    </div>
  );
}

export function CreateEditShell({
  title,
  subtitle,
  stepIndex,
  stepCount,
  children,
  primaryAction,
  secondaryAction,
  showLegal = false,
}: CreateEditShellProps) {
  const showSteps = stepCount != null && stepCount > 1 && stepIndex != null;

  return (
    <div className="flex flex-col flex-1">
      {/* Header */}
      <div className="px-4 sm:px-8 pt-5 sm:pt-8 pb-2 max-w-lg sm:max-w-xl mx-auto w-full">
        {showSteps && (
          <div className="mb-4 sm:mb-5">
            <ProgressDots current={stepIndex!} total={stepCount!} />
          </div>
        )}
        <h1 className="text-lg sm:text-2xl font-bold text-foreground tracking-tight leading-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs sm:text-sm text-muted-foreground/70 mt-1 sm:mt-1.5 leading-relaxed">{subtitle}</p>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 flex items-start px-4 sm:px-8 py-4 sm:py-6 max-w-lg sm:max-w-xl mx-auto w-full">
        <div className="w-full">{children}</div>
      </div>

      {/* Footer – always at bottom */}
      <div className="px-4 sm:px-8 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:pt-4 max-w-lg sm:max-w-xl mx-auto w-full space-y-2">
        <div className="flex items-center justify-between">
          <div>
            {secondaryAction && (
              <Button variant="ghost" size="sm" onClick={secondaryAction.onClick} className="text-muted-foreground/60 hover:text-muted-foreground">
                {secondaryAction.label}
              </Button>
            )}
          </div>
          <Button
            size="sm"
            onClick={primaryAction.onClick}
            disabled={primaryAction.disabled}
            className="sm:h-10 sm:px-6 sm:text-sm font-semibold"
          >
            {primaryAction.label}
          </Button>
        </div>
        {showLegal && (
          <p className="text-[10px] text-muted-foreground/50 text-center">
            Ved å fortsette godtar du våre{" "}
            <Link to="/vilkar" className="underline hover:text-muted-foreground">vilkår</Link>
            {" "}og{" "}
            <Link to="/personvern" className="underline hover:text-muted-foreground">personvern</Link>.
          </p>
        )}
      </div>
    </div>
  );
}
