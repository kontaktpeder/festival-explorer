import { Link } from "react-router-dom";
import { Building2, Users, Sparkles } from "lucide-react";

interface ExploreBlock {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  to: string;
}

const exploreBlocks: ExploreBlock[] = [
  {
    icon: <Building2 className="w-10 h-10 md:w-12 md:h-12" />,
    title: "Utforsk venue",
    subtitle: "Josefines Vertshus",
    to: "/venue/josefines-vertshus",
  },
  {
    icon: <Users className="w-10 h-10 md:w-12 md:h-12" />,
    title: "Backstage",
    subtitle: "For artister, arrangører og crew",
    to: "/dashboard",
  },
  {
    icon: <Sparkles className="w-10 h-10 md:w-12 md:h-12" />,
    title: "Om GIGGEN",
    subtitle: "Historien bak",
    to: "/om-giggen",
  },
];

export function UtforskMerSection() {
  return (
    <section className="relative py-16 md:py-24 px-6 bg-black">
      {/* Subtle gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-zinc-950 via-black to-zinc-950 pointer-events-none" />
      
      {/* Grain texture */}
      <div className="absolute inset-0 opacity-20 pointer-events-none bg-[url('data:image/svg+xml,%3Csvg viewBox=%220 0 256 256%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noise%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.9%22 numOctaves=%224%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noise)%22/%3E%3C/svg%3E')]" />
      
      {/* Content */}
      <div className="relative z-10 max-w-5xl mx-auto">
        {/* Section title */}
        <h2 
          className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-12 md:mb-16 text-center tracking-tight"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          Utforsk mer
        </h2>
        
        {/* Poster blocks */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {exploreBlocks.map((block, index) => (
            <Link
              key={index}
              to={block.to}
              className="group relative flex flex-col items-center justify-center aspect-[4/3] md:aspect-square p-8 border border-white/10 hover:border-orange-500/40 bg-zinc-900/30 hover:bg-zinc-900/50 transition-all duration-500"
            >
              {/* Icon */}
              <div className="text-orange-400/60 group-hover:text-orange-400 transition-colors duration-300 mb-6">
                {block.icon}
              </div>
              
              {/* Title */}
              <h3 
                className="text-2xl md:text-3xl font-semibold text-white mb-3 text-center"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                {block.title}
              </h3>
              
              {/* Subtitle */}
              <p className="text-sm md:text-base text-white/50 text-center">
                {block.subtitle}
              </p>
              
              {/* Arrow indicator */}
              <div className="absolute bottom-6 right-6 text-orange-400/0 group-hover:text-orange-400/80 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
                →
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
