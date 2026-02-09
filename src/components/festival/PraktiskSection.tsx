import { Clock, MapPin, Users, Utensils, Ticket } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import praktiskHeaderBg from "@/assets/praktisk-header-bg.jpeg";
import praktiskInfoBg from "@/assets/praktisk-info-bg.jpeg";
import praktiskHeaderDesktopBg from "@/assets/section-bg-praktisk-desktop.jpg";
import praktiskInfoDesktopBg from "@/assets/section-bg-praktisk-info-desktop.jpg";

interface InfoItem {
  icon: React.ReactNode;
  label: string;
  value: string;
}

const infoItems: InfoItem[] = [
  { icon: <Clock className="w-6 h-6 md:w-8 md:h-8" />, label: "TIDSPUNKT", value: "14. mars · 17:00 – 01:00" },
  { icon: <MapPin className="w-6 h-6 md:w-8 md:h-8" />, label: "STED", value: "Josefines Vertshus, Josefines gate 16" },
  { icon: <Users className="w-6 h-6 md:w-8 md:h-8" />, label: "ALDERSGRENSE", value: "18 år" },
  { icon: <Utensils className="w-6 h-6 md:w-8 md:h-8" />, label: "MAT", value: "Matservering utover kvelden" },
  { icon: <Ticket className="w-6 h-6 md:w-8 md:h-8" />, label: "INNGANG", value: "Gyldig billett" },
];

export function PraktiskSection() {
  const isMobile = useIsMobile();
  
  return (
    <>
      {/* Header section with background */}
      <section className="relative min-h-[30vh] md:min-h-[35vh] flex flex-col items-center justify-center px-6 py-12">
        {/* Background image - same style as lineup headers */}
        <div className="absolute inset-0">
          <img 
            src={isMobile ? praktiskHeaderBg : praktiskHeaderDesktopBg}
            alt="" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/30" />
        </div>
        
        {/* Decorative line above */}
        <div className={cn(
          "absolute top-0 left-1/2 -translate-x-1/2 w-px h-16 bg-gradient-to-b z-10",
          "from-white/40 via-white/20 to-transparent"
        )} />
        
        {/* Serif tagline */}
        <p className={cn(
          "relative z-10 text-center text-sm md:text-base italic font-light mb-4",
          "animate-blur-in",
          "text-white/80"
        )} style={{ fontFamily: "'Crimson Pro', 'Source Serif 4', Georgia, serif" }}>
          alt du trenger å vite
        </p>
        
        {/* Main title - Space Grotesk */}
        <h2 className={cn(
          "relative z-10 text-4xl sm:text-5xl md:text-6xl tracking-tight text-center font-bold uppercase",
          "animate-blur-in delay-100",
          "text-white"
        )} style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          Praktisk
        </h2>
        
        {/* Decorative line below */}
        <div className={cn(
          "relative z-10 mt-8 w-24 h-px bg-gradient-to-r",
          "from-white/40 via-white/20 to-transparent",
          "animate-line-grow delay-200"
        )} />
      </section>
      
      {/* Info section - separate, dark background */}
      <section className="relative px-6 py-16 overflow-hidden">
        {/* Background image */}
        <div className="absolute inset-0">
          <img 
            src={isMobile ? praktiskInfoBg : praktiskInfoDesktopBg} 
            alt="" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/40" />
        </div>
        <div className="relative z-10 grid grid-cols-2 md:grid-cols-5 gap-8 md:gap-10 max-w-4xl mx-auto">
          {infoItems.map((item, index) => (
            <div 
              key={index}
              className="flex flex-col items-center text-center"
            >
              <div className="text-accent mb-3">
                {item.icon}
              </div>
              <span className="text-[10px] md:text-xs uppercase tracking-[0.2em] text-muted-foreground mb-1">
                {item.label}
              </span>
              <span className="text-sm md:text-base text-foreground font-medium">
                {item.value}
              </span>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
