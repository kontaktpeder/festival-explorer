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
    icon: <Building2 className="w-6 h-6" />,
    title: "Utforsk venue",
    subtitle: "Josefines Vertshus",
    to: "/venue/josefines-vertshus",
  },
  {
    icon: <Sparkles className="w-6 h-6" />,
    title: "Om GIGGEN",
    subtitle: "Historien bak",
    to: "/om-giggen",
  },
  {
    icon: <Users className="w-6 h-6" />,
    title: "Backstage",
    subtitle: "For artister, arrangører og crew",
    to: "/dashboard",
  },
];

export function UtforskMerSection() {
  return (
    <section className="relative py-12 md:py-16 px-6 bg-black">
      {/* Content */}
      <div className="relative z-10 max-w-2xl mx-auto text-center">
        {/* Section title */}
        <h2 
          className="text-3xl sm:text-4xl font-bold text-white mb-10 tracking-tight"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          Utforsk mer
        </h2>
        
        {/* Simple list - no cards */}
        <div className="space-y-6">
          {exploreBlocks.map((block, index) => (
            <Link
              key={index}
              to={block.to}
              className="group flex items-center justify-center gap-4 text-white/60 hover:text-white transition-colors duration-300"
            >
              <span className="text-orange-400/60 group-hover:text-orange-400 transition-colors">
                {block.icon}
              </span>
              <span className="text-lg md:text-xl font-medium">
                {block.title}
              </span>
              <span className="text-sm text-white/40">
                {block.subtitle}
              </span>
              <span className="text-orange-400/0 group-hover:text-orange-400 transition-colors">
                →
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
