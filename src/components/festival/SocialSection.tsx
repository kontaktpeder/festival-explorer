import { Instagram, Youtube, Facebook } from "lucide-react";
import { cn } from "@/lib/utils";

interface SocialLink {
  icon: React.ReactNode;
  label: string;
  href: string;
}

// TikTok icon (not in lucide)
const TikTokIcon = () => (
  <svg 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    className="w-5 h-5"
  >
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
);

const socialLinks: SocialLink[] = [
  {
    icon: <Instagram className="w-5 h-5" />,
    label: "Instagram",
    href: "https://www.instagram.com/giggenintervjuer",
  },
  {
    icon: <TikTokIcon />,
    label: "TikTok",
    href: "https://www.tiktok.com/@giggenintervjuer",
  },
  {
    icon: <Youtube className="w-5 h-5" />,
    label: "YouTube",
    href: "https://www.youtube.com/@giggentheapp",
  },
  {
    icon: <Facebook className="w-5 h-5" />,
    label: "Facebook",
    href: "https://www.facebook.com/people/GIGGENtheapp/61577973511926/",
  },
];

export function SocialSection() {
  return (
    <section className="relative py-12 px-6 bg-black">
      {/* Content */}
      <div className="relative z-10 max-w-xl mx-auto text-center">
        {/* Label */}
        <p className="text-sm uppercase tracking-widest text-muted-foreground mb-6">
          Følg oss
        </p>
        
        {/* Social icons */}
        <div className="flex items-center justify-center gap-6">
          {socialLinks.map((link, index) => (
            <a
              key={index}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "flex items-center justify-center",
                "w-12 h-12 rounded-full",
                "bg-white/5 border border-white/10",
                "text-white/60 hover:text-orange-400 hover:border-orange-500/30",
                "transition-all duration-300"
              )}
              aria-label={link.label}
            >
              {link.icon}
            </a>
          ))}
        </div>
        
        {/* Newsletter hint */}
        <p className="mt-8 text-sm text-muted-foreground/60">
          Nyoppstartet – følg med for oppdateringer
        </p>
      </div>
    </section>
  );
}
