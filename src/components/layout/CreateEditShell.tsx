import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export interface CreateEditShellProps {
  title: string;
  subtitle?: string;
  stepTitle?: string;
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
}

export function CreateEditShell({
  title,
  subtitle,
  stepTitle,
  stepIndex,
  stepCount,
  children,
  primaryAction,
  secondaryAction,
}: CreateEditShellProps) {
  const showSteps = stepCount != null && stepCount > 1 && stepIndex != null;

  return (
    <div className="min-h-[100svh] bg-background flex flex-col">
      {/* Header */}
      <div className="border-b border-border/30 px-4 sm:px-6 py-4 sm:py-6">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
        )}
        {showSteps && stepTitle && (
          <p className="text-xs text-muted-foreground/70 mt-2">
            Steg {(stepIndex ?? 0) + 1} av {stepCount}: {stepTitle}
          </p>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 px-4 sm:px-6 py-6 sm:py-8 max-w-lg mx-auto w-full">
        {children}
      </div>

      {/* Footer actions */}
      <div className="border-t border-border/30 px-4 sm:px-6 py-4 max-w-lg mx-auto w-full space-y-3">
        <div className="flex items-center justify-between">
          <div>
            {secondaryAction && (
              <Button variant="ghost" onClick={secondaryAction.onClick}>
                {secondaryAction.label}
              </Button>
            )}
          </div>
          <Button onClick={primaryAction.onClick} disabled={primaryAction.disabled}>
            {primaryAction.label}
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground/60 text-center">
          Ved å fortsette godtar du våre{" "}
          <Link to="/vilkar" className="underline hover:text-muted-foreground">vilkår</Link>
          {" "}og{" "}
          <Link to="/personvern" className="underline hover:text-muted-foreground">personvern</Link>.
        </p>
      </div>
    </div>
  );
}
