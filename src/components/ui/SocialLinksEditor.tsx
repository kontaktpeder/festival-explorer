import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Globe, Instagram, Facebook, Music2, Youtube } from "lucide-react";
import type { SocialLink, SocialLinkType } from "@/types/social";

// TikTok icon (not in lucide)
const TikTokIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className || "w-4 h-4"}>
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
  </svg>
);

const SOCIAL_TYPES: { value: SocialLinkType; label: string; icon: React.ReactNode }[] = [
  { value: "website", label: "Nettside", icon: <Globe className="w-4 h-4" /> },
  { value: "instagram", label: "Instagram", icon: <Instagram className="w-4 h-4" /> },
  { value: "facebook", label: "Facebook", icon: <Facebook className="w-4 h-4" /> },
  { value: "tiktok", label: "TikTok", icon: <TikTokIcon className="w-4 h-4" /> },
  { value: "youtube", label: "YouTube", icon: <Youtube className="w-4 h-4" /> },
  { value: "spotify", label: "Spotify", icon: <Music2 className="w-4 h-4" /> },
  { value: "soundcloud", label: "SoundCloud", icon: <Music2 className="w-4 h-4" /> },
  { value: "other", label: "Annet", icon: <Globe className="w-4 h-4" /> },
];

interface SocialLinksEditorProps {
  links: SocialLink[];
  onChange: (links: SocialLink[]) => void;
  disabled?: boolean;
}

export function SocialLinksEditor({ links, onChange, disabled = false }: SocialLinksEditorProps) {
  const [newLink, setNewLink] = useState<{ type: SocialLinkType; url: string; label: string }>({
    type: "website",
    url: "",
    label: "",
  });

  const normalizeUrl = (url: string, type: SocialLinkType): string => {
    const trimmed = url.trim();
    if (!trimmed) return "";

    // Already a full URL
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      return trimmed;
    }

    // Many users will type just username or @username for social media
    const handle = trimmed.startsWith("@") ? trimmed.slice(1) : trimmed;

    // Check if it looks like a domain/path (contains dots or slashes)
    const looksLikePath = handle.includes(".") || handle.includes("/");

    if (type === "instagram") {
      return looksLikePath 
        ? `https://${handle.replace(/^www\./, "www.")}` 
        : `https://www.instagram.com/${handle}`;
    }
    if (type === "tiktok") {
      return looksLikePath 
        ? `https://${handle}` 
        : `https://www.tiktok.com/@${handle}`;
    }
    if (type === "facebook") {
      return looksLikePath 
        ? `https://${handle}` 
        : `https://www.facebook.com/${handle}`;
    }
    if (type === "spotify") {
      if (handle.startsWith("spotify:")) {
        return `https://open.spotify.com/${handle.replace(/^spotify:/, "").replace(/:/g, "/")}`;
      }
      return looksLikePath 
        ? `https://${handle}` 
        : `https://open.spotify.com/artist/${handle}`;
    }
    if (type === "soundcloud") {
      return looksLikePath 
        ? `https://${handle}` 
        : `https://soundcloud.com/${handle}`;
    }
    if (type === "youtube") {
      if (looksLikePath) {
        return `https://${handle}`;
      }
      // If it's just a video ID or channel handle
      if (handle.length === 11 && /^[a-zA-Z0-9_-]+$/.test(handle)) {
        return `https://www.youtube.com/watch?v=${handle}`;
      }
      return `https://www.youtube.com/@${handle}`;
    }

    // Fallback for website/other: assume it's a domain or path
    return `https://${handle}`;
  };

  const addLink = () => {
    const normalizedUrl = normalizeUrl(newLink.url, newLink.type);
    if (!normalizedUrl) return;

    const link: SocialLink = {
      type: newLink.type,
      url: normalizedUrl,
      label: newLink.label.trim() || undefined,
    };

    onChange([...links, link]);
    setNewLink({ type: "website", url: "", label: "" });
  };

  const removeLink = (index: number) => {
    onChange(links.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      {/* Existing links */}
      {links.length > 0 && (
        <div className="space-y-2">
          <Label className="text-muted-foreground text-xs uppercase tracking-wide">
            Sosiale lenker ({links.length})
          </Label>
          <div className="space-y-2">
            {links.map((link, index) => {
              const typeConfig = SOCIAL_TYPES.find((t) => t.value === link.type);
              return (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg border border-border/30"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className="text-accent flex-shrink-0">{typeConfig?.icon}</span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">
                        {link.label || typeConfig?.label || link.type}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{link.url}</p>
                    </div>
                  </div>
                  {!disabled && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive flex-shrink-0"
                      onClick={() => removeLink(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add new link */}
      {!disabled && (
        <div className="space-y-3">
          <Label className="text-muted-foreground text-xs uppercase tracking-wide">
            Legg til lenke
          </Label>
          <div className="flex flex-col sm:flex-row gap-2">
            <Select
              value={newLink.type}
              onValueChange={(value) => setNewLink({ ...newLink, type: value as SocialLinkType })}
            >
              <SelectTrigger className="w-full sm:w-[140px] bg-transparent border-border/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SOCIAL_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <span className="flex items-center gap-2">
                      {type.icon}
                      {type.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              placeholder="https://..."
              value={newLink.url}
              onChange={(e) => setNewLink({ ...newLink, url: e.target.value })}
              className="flex-1 bg-transparent border-border/50 focus:border-accent"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addLink();
                }
              }}
            />

            <Input
              placeholder="Visningsnavn (valgfritt)"
              value={newLink.label}
              onChange={(e) => setNewLink({ ...newLink, label: e.target.value })}
              className="flex-1 bg-transparent border-border/50 focus:border-accent"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addLink();
                }
              }}
            />

            <Button
              type="button"
              variant="outline"
              onClick={addLink}
              disabled={!newLink.url.trim()}
              className="border-accent/30 hover:border-accent hover:bg-accent/10"
            >
              <Plus className="h-4 w-4 mr-1" />
              Legg til
            </Button>
          </div>
        </div>
      )}

      {links.length === 0 && disabled && (
        <p className="text-sm text-muted-foreground py-2">Ingen sosiale lenker lagt til.</p>
      )}
    </div>
  );
}
