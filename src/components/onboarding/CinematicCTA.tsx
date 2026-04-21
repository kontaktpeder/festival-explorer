import React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

type Variant = "primary" | "glass" | "ghost-light";
type Size = "lg" | "md";

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  asChild?: boolean;
}

/**
 * Premium, touchable CTA used throughout the onboarding flow.
 * Replaces the flat default Button for the hero/primary actions.
 */
export const CinematicCTA = React.forwardRef<HTMLButtonElement, Props>(
  (
    { variant = "primary", size = "lg", className, asChild, children, ...rest },
    ref,
  ) => {
    const Comp: React.ElementType = asChild ? Slot : "button";

    const base =
      "group relative inline-flex items-center justify-center gap-2 font-medium tracking-tight " +
      "rounded-full overflow-hidden select-none isolate " +
      "transition-all duration-300 ease-out " +
      "active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none " +
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background";

    const sizes: Record<Size, string> = {
      lg: "h-14 px-7 text-base",
      md: "h-11 px-5 text-sm",
    };

    const variants: Record<Variant, string> = {
      primary:
        "text-accent-foreground bg-accent shadow-[0_10px_40px_-10px_hsl(24_100%_55%/0.6),inset_0_1px_0_hsl(0_0%_100%/0.25)] hover:shadow-[0_15px_50px_-10px_hsl(24_100%_55%/0.75),inset_0_1px_0_hsl(0_0%_100%/0.3)]",
      glass:
        "text-foreground bg-foreground/[0.08] backdrop-blur-xl border border-foreground/15 hover:bg-foreground/[0.14] hover:border-foreground/25",
      "ghost-light":
        "text-foreground/80 hover:text-foreground hover:bg-foreground/5",
    };

    return (
      <Comp
        ref={ref}
        className={cn(base, sizes[size], variants[variant], className)}
        {...rest}
      >
        {/* Shimmer for primary */}
        {variant === "primary" && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out bg-gradient-to-r from-transparent via-white/25 to-transparent"
          />
        )}
        <span className="relative z-10 inline-flex items-center gap-2">
          {children}
        </span>
      </Comp>
    );
  },
);
CinematicCTA.displayName = "CinematicCTA";