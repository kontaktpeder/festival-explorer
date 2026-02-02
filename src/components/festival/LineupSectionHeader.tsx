import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import lineupHeaderBg from "@/assets/lineup-header-bg-new.jpeg";
import boilerroomHeaderBg from "@/assets/boilerroom-header-bg.jpeg";
import lineupDesktopBg from "@/assets/lineup-header-bg-new.jpeg";
import boilerroomDesktopBg from "@/assets/section-bg-boilerroom-desktop.jpg";

interface LineupSectionHeaderProps {
  title: string;
  variant: "festival" | "boilerroom";
}

/**
 * Compact section divider for lineup sections
 * Festival: uses uploaded orange gradient background
 * Boiler Room: dark atmospheric background
 * Desktop uses new gradient backgrounds, mobile keeps original images
 */
export function LineupSectionHeader({ title, variant }: LineupSectionHeaderProps) {
  const isMobile = useIsMobile();
  
  const variantStyles = {
    festival: {
      tagline: "text-white/80",
      title: "text-white",
      line: "from-white/40 via-white/20 to-transparent",
    },
    boilerroom: {
      tagline: "text-cyan-300/70",
      title: "text-white",
      line: "from-cyan-500/60 via-teal-400/40 to-transparent",
    },
  };
  
  const styles = variantStyles[variant];
  
  // Desktop uses new backgrounds, mobile keeps originals
  const getBgImage = () => {
    if (variant === "festival") {
      return isMobile ? lineupHeaderBg : lineupDesktopBg;
    }
    return isMobile ? boilerroomHeaderBg : boilerroomDesktopBg;
  };
  
  return (
    <section className="relative min-h-[30vh] md:min-h-[35vh] flex flex-col items-center justify-center px-6 py-12">
      {/* Background image */}
      <div className="absolute inset-0">
        <img 
          src={getBgImage()} 
          alt="" 
          className="w-full h-full object-cover"
        />
        {variant === "festival" && <div className="absolute inset-0 bg-black/20" />}
      </div>
      
      {/* Decorative line above */}
      <div className={cn(
        "absolute top-0 left-1/2 -translate-x-1/2 w-px h-16 bg-gradient-to-b z-10",
        styles.line
      )} />
      
      {/* Serif tagline */}
      <p className={cn(
        "relative z-10 text-center text-sm md:text-base italic font-light mb-4",
        "animate-blur-in",
        styles.tagline
      )} style={{ fontFamily: "'Crimson Pro', 'Source Serif 4', Georgia, serif" }}>
        festival for en kveld
      </p>
      
      {/* Main title - Space Grotesk */}
      <h2 className={cn(
        "relative z-10 text-4xl sm:text-5xl md:text-6xl tracking-tight text-center font-bold",
        "animate-blur-in delay-100",
        styles.title
      )} style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
        {title}
      </h2>
      
      {/* Decorative line below */}
      <div className={cn(
        "relative z-10 mt-8 w-24 h-px bg-gradient-to-r",
        styles.line,
        "animate-line-grow delay-200"
      )} />
    </section>
  );
}