import { Globe, Instagram, Facebook, Music2, Youtube } from "lucide-react";
import type { SocialLink } from "@/types/social";

// TikTok icon (not in lucide)
const TikTokIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className || "w-4 h-4"}>
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
  </svg>
);

type PersonaSocialLinksProps = {
  links?: SocialLink[] | null;
};

function getIcon(type: string) {
  switch (type) {
    case "instagram":
      return <Instagram className="w-4 h-4" />;
    case "facebook":
      return <Facebook className="w-4 h-4" />;
    case "tiktok":
      return <TikTokIcon className="w-4 h-4" />;
    case "youtube":
      return <Youtube className="w-4 h-4" />;
    case "spotify":
    case "soundcloud":
      return <Music2 className="w-4 h-4" />;
    case "website":
    default:
      return <Globe className="w-4 h-4" />;
  }
}

function getLabel(link: SocialLink) {
  if (link.label) return link.label;
  switch (link.type) {
    case "website":
      return "Nettside";
    case "instagram":
      return "Instagram";
    case "facebook":
      return "Facebook";
    case "tiktok":
      return "TikTok";
    case "youtube":
      return "YouTube";
    case "spotify":
      return "Spotify";
    case "soundcloud":
      return "SoundCloud";
    default:
      return link.type.charAt(0).toUpperCase() + link.type.slice(1);
  }
}

export function PersonaSocialLinks({ links }: PersonaSocialLinksProps) {
  if (!links || links.length === 0) return null;

  return (
    <div className="flex flex-wrap justify-center gap-3 mt-6">
      {links.map((link, idx) => (
        <a
          key={idx}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          referrerPolicy="no-referrer"
          className="group inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border/30 text-muted-foreground hover:text-accent hover:border-accent/40 transition-all duration-300"
        >
          {getIcon(link.type)}
          <span className="text-sm">{getLabel(link)}</span>
        </a>
      ))}
    </div>
  );
}
