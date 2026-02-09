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
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1.5 rounded-full transition-all duration-300 ${
            i === current
              ? "w-6 bg-accent"
              : i < current
                ? "w-1.5 bg-accent/50"
                : "w-1.5 bg-border/50"
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
      {/* Header – compact */}
      <div className="px-4 sm:px-6 pt-4 pb-2 max-w-lg mx-auto w-full">
        {showSteps && (
          <div className="mb-3">
            <ProgressDots current={stepIndex!} total={stepCount!} />
          </div>
        )}
        <h1 className="text-lg sm:text-xl font-bold text-foreground tracking-tight leading-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
        )}
      </div>

      {/* Content – centered vertically in remaining space */}
      <div className="flex-1 flex items-start px-4 sm:px-6 py-4 max-w-lg mx-auto w-full">
        <div className="w-full">{children}</div>
      </div>

      {/* Footer – always at bottom */}
      <div className="px-4 sm:px-6 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 max-w-lg mx-auto w-full space-y-2">
        <div className="flex items-center justify-between">
          <div>
            {secondaryAction && (
              <Button variant="ghost" size="sm" onClick={secondaryAction.onClick}>
                {secondaryAction.label}
              </Button>
            )}
          </div>
          <Button size="sm" onClick={primaryAction.onClick} disabled={primaryAction.disabled}>
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
