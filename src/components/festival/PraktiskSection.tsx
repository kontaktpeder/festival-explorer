import { Clock, MapPin, Users, Utensils, Ticket } from "lucide-react";

interface InfoItem {
  icon: React.ReactNode;
  label: string;
  value: string;
}

const infoItems: InfoItem[] = [
  { icon: <Clock className="w-6 h-6 md:w-8 md:h-8" />, label: "TIDSPUNKT", value: "17:00 – 01:30" },
  { icon: <MapPin className="w-6 h-6 md:w-8 md:h-8" />, label: "STED", value: "Josefines Vertshus, Josefines gate 16" },
  { icon: <Users className="w-6 h-6 md:w-8 md:h-8" />, label: "ALDERSGRENSE", value: "18 år" },
  { icon: <Utensils className="w-6 h-6 md:w-8 md:h-8" />, label: "MAT", value: "Matservering utover kvelden" },
  { icon: <Ticket className="w-6 h-6 md:w-8 md:h-8" />, label: "INNGANG", value: "Gyldig billett" },
];

export function PraktiskSection() {
  return (
    <section className="relative min-h-screen max-h-screen flex flex-col items-center justify-center px-6 py-12 bg-zinc-950 overflow-hidden">
      {/* Grain texture overlay */}
      <div className="absolute inset-0 opacity-30 pointer-events-none bg-[url('data:image/svg+xml,%3Csvg viewBox=%220 0 256 256%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noise%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.9%22 numOctaves=%224%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noise)%22/%3E%3C/svg%3E')]" />
      
      {/* Content */}
      <div className="relative z-10 max-w-3xl mx-auto text-center">
        {/* Section title - poster style */}
        <h2 
          className="text-5xl sm:text-6xl md:text-7xl font-bold text-white mb-16 tracking-tight uppercase"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          Praktisk
        </h2>
        
        {/* Info grid - centered, poster-like */}
        <div className="grid grid-cols-1 gap-8 md:gap-10">
          {infoItems.map((item, index) => (
            <div 
              key={index}
              className="flex flex-col items-center text-center"
            >
              <div className="text-orange-400 mb-3">
                {item.icon}
              </div>
              <span className="text-xs md:text-sm uppercase tracking-[0.3em] text-white/50 mb-2">
                {item.label}
              </span>
              <span className="text-xl md:text-2xl text-white font-medium">
                {item.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
