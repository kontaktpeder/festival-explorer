import { Link } from "react-router-dom";
import { Building2, Users, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExploreCard {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  to: string;
}

const exploreCards: ExploreCard[] = [
  {
    icon: <Building2 className="w-8 h-8" />,
    title: "Utforsk venue",
    subtitle: "Josefines Vertshus",
    to: "/venue/josefines-vertshus",
  },
  {
    icon: <Users className="w-8 h-8" />,
    title: "Backstage",
    subtitle: "For artister, arrangører og crew",
    to: "/dashboard",
  },
  {
    icon: <Sparkles className="w-8 h-8" />,
    title: "Om GIGGEN",
    subtitle: "Historien bak",
    to: "/om-giggen",
  },
];

export function UtforskMerSection() {
  return (
    <section className="relative min-h-[60vh] md:min-h-[70vh] flex flex-col items-center justify-center px-6 py-16 bg-zinc-900">
      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto w-full">
        {/* Section title */}
        <h2 
          className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-12 text-center tracking-tight"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          Utforsk mer
        </h2>
        
        {/* Cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          {exploreCards.map((card, index) => (
            <Link
              key={index}
              to={card.to}
              className={cn(
                "group relative flex flex-col items-center justify-center",
                "p-8 md:p-10 rounded-lg",
                "bg-zinc-800/50 border border-white/5",
                "hover:bg-zinc-800/80 hover:border-orange-500/30",
                "transition-all duration-300"
              )}
            >
              {/* Icon */}
              <div className="text-orange-400/70 group-hover:text-orange-400 transition-colors mb-4">
                {card.icon}
              </div>
              
              {/* Title */}
              <h3 className="text-xl md:text-2xl font-semibold text-white mb-2 text-center">
                {card.title}
              </h3>
              
              {/* Subtitle */}
              {card.subtitle && (
                <p className="text-sm text-muted-foreground text-center">
                  {card.subtitle}
                </p>
              )}
              
              {/* Hover arrow */}
              <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-orange-400">→</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
