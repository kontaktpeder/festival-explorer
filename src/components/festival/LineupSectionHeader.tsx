import { cn } from "@/lib/utils";

interface LineupSectionHeaderProps {
  title: string;
  variant: "festival" | "boilerroom";
}

/**
 * Compact section divider for lineup sections
 * Festival: warm amber/orange tones
 * Boiler Room: cold black/purple tones
 */
export function LineupSectionHeader({ title, variant }: LineupSectionHeaderProps) {
  const variantStyles = {
    festival: {
      container: "bg-gradient-to-b from-amber-950/80 via-orange-950/60 to-transparent",
      tagline: "text-orange-200/70",
      title: "text-orange-50",
      line: "from-orange-500/60 via-amber-400/40 to-transparent",
    },
    boilerroom: {
      container: "bg-gradient-to-b from-black via-zinc-950/90 to-transparent",
      tagline: "text-purple-300/70",
      title: "text-white",
      line: "from-purple-500/60 via-violet-400/40 to-transparent",
    },
  };
  
  const styles = variantStyles[variant];
  
  return (
    <section className={cn(
      "relative min-h-[30vh] md:min-h-[35vh] flex flex-col items-center justify-center px-6 py-12",
      styles.container
    )}>
      {/* Decorative line above */}
      <div className={cn(
        "absolute top-0 left-1/2 -translate-x-1/2 w-px h-16 bg-gradient-to-b",
        styles.line
      )} />
      
      {/* Serif tagline */}
      <p className={cn(
        "text-center text-sm md:text-base italic font-light mb-4",
        "animate-blur-in",
        styles.tagline
      )} style={{ fontFamily: "'Crimson Pro', 'Source Serif 4', Georgia, serif" }}>
        festival for en kveld
      </p>
      
      {/* Main title - Space Grotesk */}
      <h2 className={cn(
        "text-4xl sm:text-5xl md:text-6xl tracking-tight text-center font-bold",
        "animate-blur-in delay-100",
        styles.title
      )} style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
        {title}
      </h2>
      
      {/* Decorative line below */}
      <div className={cn(
        "mt-8 w-24 h-px bg-gradient-to-r",
        styles.line,
        "animate-line-grow delay-200"
      )} />
    </section>
  );
}