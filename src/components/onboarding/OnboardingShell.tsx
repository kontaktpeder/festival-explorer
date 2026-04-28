import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { OnboardingBackground } from "./OnboardingBackground";
import giggenLogo from "@/assets/giggen-logo-final.png";

type Intensity = "light" | "medium" | "heavy";

interface Props {
  stepKey: string;
  overlayIntensity?: Intensity;
  progress?: { current: number; total: number };
  /** Optional slot rendered on the right side of the top bar (e.g. "Jeg har allerede konto"). */
  topBarRight?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Wraps an onboarding step with the cinematic background and an animated
 * step-level transition. The background is rendered once at the shell level
 * so the Vimeo iframe never re-mounts between steps.
 */
export const OnboardingShell: React.FC<Props> = ({
  stepKey,
  overlayIntensity = "medium",
  progress,
  topBarRight,
  children,
}) => {
  return (
    <div className="relative h-[100dvh] min-h-[100dvh] w-full overflow-hidden text-foreground">
      <OnboardingBackground intensity={overlayIntensity} />

      <div
        className="relative z-10 flex h-[100dvh] min-h-[100dvh] flex-col overflow-hidden"
        style={{
          paddingTop: "max(env(safe-area-inset-top), 0.75rem)",
          paddingBottom: "max(env(safe-area-inset-bottom), 1rem)",
        }}
      >
        <header className="flex flex-col gap-3 px-4 pt-1 sm:px-6 lg:px-10 lg:pt-3 lg:gap-4">
          {/* Top bar: logo left, action right */}
          <div className="flex items-center justify-between gap-3">
            <img
              src={giggenLogo}
              alt="Giggen"
              className="h-9 w-auto sm:h-11 lg:h-14"
            />
            <div className="flex items-center">{topBarRight}</div>
          </div>
          {/* Step bar — full-width under the top bar */}
          {progress && (
            <div className="flex items-center justify-center gap-1.5">
              {Array.from({ length: progress.total }).map((_, i) => (
                <span
                  key={i}
                  className={`h-1 rounded-full transition-all duration-500 ${
                    i < progress.current
                      ? "w-7 bg-accent"
                      : "w-3 bg-foreground/20"
                  }`}
                />
              ))}
            </div>
          )}
        </header>

        {/* Animated step content */}
        <main className="relative flex min-h-0 flex-1 flex-col">
          <AnimatePresence mode="wait">
            <motion.div
              key={stepKey}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col px-5 lg:max-w-7xl lg:px-12"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};