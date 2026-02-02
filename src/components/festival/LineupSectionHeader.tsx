import { cn } from "@/lib/utils";

interface LineupSectionHeaderProps {
  title: string;
  subtitle: string;
  variant: "festival" | "boilerroom";
}

/**
 * Large section header for lineup sections
 * Festival: warm amber/orange tones
 * Boiler Room: cold black/purple tones
 */
export function LineupSectionHeader({ title, subtitle, variant }: LineupSectionHeaderProps) {
  const variantStyles = {
    festival: {
      container: "bg-gradient-to-b from-amber-950/80 via-orange-950/60 to-transparent",
      title: "text-orange-50",
      subtitle: "text-orange-300/80",
      line: "from-orange-500/60 via-amber-400/40 to-transparent",
    },
    boilerroom: {
      container: "bg-gradient-to-b from-black via-zinc-950/90 to-transparent",
      title: "text-white",
      subtitle: "text-purple-400/80",
      line: "from-purple-500/60 via-violet-400/40 to-transparent",
    },
  };
  
  const styles = variantStyles[variant];
  
  return (
    <section className={cn(
      "relative min-h-[50vh] md:min-h-[60vh] flex flex-col items-center justify-center px-6 py-20",
      styles.container
    )}>
      {/* Decorative line above */}
      <div className={cn(
        "absolute top-0 left-1/2 -translate-x-1/2 w-px h-24 bg-gradient-to-b",
        styles.line
      )} />
      
      {/* Main title */}
      <h2 className={cn(
        "text-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl tracking-tight text-center",
        "animate-blur-in",
        styles.title
      )}>
        {title}
      </h2>
      
      {/* Subtitle with separators */}
      <p className={cn(
        "mt-6 text-sm md:text-base uppercase tracking-[0.3em] text-center whitespace-pre-line",
        "animate-slide-up delay-200",
        styles.subtitle
      )}>
        {subtitle}
      </p>
      
      {/* Decorative line below */}
      <div className={cn(
        "mt-12 w-32 h-px bg-gradient-to-r",
        styles.line,
        "animate-line-grow delay-300"
      )} />
    </section>
  );
}
