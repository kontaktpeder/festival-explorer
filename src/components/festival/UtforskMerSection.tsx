import { Link } from "react-router-dom";
import { Users, Sparkles } from "lucide-react";
import { VenuePosterBlock } from "./VenuePosterBlock";

interface ExploreLink {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  to: string;
}

const exploreLinks: ExploreLink[] = [
  {
    icon: <Sparkles className="w-5 h-5" />,
    title: "Om GIGGEN",
    subtitle: "Historien bak",
    to: "/om-giggen",
  },
  {
    icon: <Users className="w-5 h-5" />,
    title: "Backstage",
    subtitle: "For artister, arrangører og crew",
    to: "/dashboard",
  },
];

export function UtforskMerSection() {
  return (
    <section className="relative bg-black">
      {/* Venue poster block - same style as lineup */}
      <VenuePosterBlock 
        venue={{
          name: "Josefines Vertshus",
          slug: "josefines-vertshus",
          tagline: "Josefines gate 16, Oslo",
          hero_image_url: "https://nxgotyhhjtwikdcjdxxn.supabase.co/storage/v1/object/public/media/0fbaa0f9-8472-4c7d-8c15-4b80972747da/images/d244bf71-2a17-41f5-b52b-d82e7c7d115d.jpg",
        }}
      />
      
      {/* Additional links - compact */}
      <div className="py-10 px-6 bg-zinc-950">
        <div className="max-w-2xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-10">
          {exploreLinks.map((link, index) => (
            <Link
              key={index}
              to={link.to}
              className="group flex items-center gap-3 text-white/50 hover:text-white transition-colors duration-300"
            >
              <span className="text-orange-400/50 group-hover:text-orange-400 transition-colors">
                {link.icon}
              </span>
              <span className="text-base font-medium">
                {link.title}
              </span>
              <span className="text-orange-400/0 group-hover:text-orange-400 transition-colors text-sm">
                →
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
