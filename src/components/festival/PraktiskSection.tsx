import { Clock, MapPin, Users, Utensils, Ticket } from "lucide-react";
import { cn } from "@/lib/utils";

interface InfoItem {
  icon: React.ReactNode;
  label: string;
  value: string;
}

const infoItems: InfoItem[] = [
  { icon: <Clock className="w-5 h-5" />, label: "Tidspunkt", value: "17:00 – 01:30" },
  { icon: <MapPin className="w-5 h-5" />, label: "Sted", value: "Josefines Vertshus, Josefines gate 16" },
  { icon: <Users className="w-5 h-5" />, label: "Aldersgrense", value: "18 år" },
  { icon: <Utensils className="w-5 h-5" />, label: "Mat", value: "Matservering hele kvelden" },
  { icon: <Ticket className="w-5 h-5" />, label: "Inngang", value: "Gyldig billett" },
];

export function PraktiskSection() {
  return (
    <section className="relative min-h-[70vh] md:min-h-[80vh] flex flex-col items-center justify-center px-6 py-16 bg-zinc-950">
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-zinc-950 to-zinc-900 pointer-events-none" />
      
      {/* Content */}
      <div className="relative z-10 max-w-2xl mx-auto text-center">
        {/* Section title */}
        <h2 
          className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-12 tracking-tight"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          Praktisk
        </h2>
        
        {/* Info grid */}
        <div className="space-y-6 md:space-y-8">
          {infoItems.map((item, index) => (
            <div 
              key={index}
              className={cn(
                "flex flex-col sm:flex-row items-center sm:items-start gap-3 sm:gap-4",
                "text-center sm:text-left"
              )}
            >
              <div className="flex items-center gap-3 text-orange-400/80">
                {item.icon}
                <span className="text-sm uppercase tracking-widest text-muted-foreground">
                  {item.label}
                </span>
              </div>
              <span className="text-lg md:text-xl text-white/90 font-medium">
                {item.value}
              </span>
            </div>
          ))}
        </div>
      </div>
      
      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-zinc-900 to-transparent pointer-events-none" />
    </section>
  );
}
