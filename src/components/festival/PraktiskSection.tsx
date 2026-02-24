import { Clock, MapPin, Users, Utensils, Ticket } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import praktiskHeaderBg from "@/assets/praktisk-header-bg.jpeg";
import praktiskInfoBg from "@/assets/praktisk-info-bg.jpeg";
import praktiskHeaderDesktopBg from "@/assets/section-bg-praktisk-desktop.jpg";
import praktiskInfoDesktopBg from "@/assets/section-bg-praktisk-info-desktop.jpg";
import praktiskTransitionBg from "@/assets/praktisk-transition-bg.jpg";

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
      {/* Soft transition with background image */}
      <div className="relative overflow-hidden">
        <img
          src={praktiskTransitionBg}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative z-10 mx-auto max-w-xs py-10 flex flex-col items-center gap-2">
          <div className="w-px h-8 bg-gradient-to-b from-transparent via-white/30 to-white/10" />
          <span
            className="text-xs uppercase tracking-[0.3em] text-white/90 font-bold"
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              textShadow: "0 1px 8px rgba(0,0,0,0.4)",
            }}
          >
            Praktisk info
          </span>
        </div>
      </div>

      {/* Info section - compact card style */}
      <section className="relative px-4 md:px-6 py-10 md:py-16 overflow-hidden">
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
