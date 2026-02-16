import { useState } from "react";
import { Share2, Loader2, Check, Link2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getPublicUrl, cn } from "@/lib/utils";

export type SharePageType = "project" | "venue" | "festival";

export type ShareConfig = {
  pageType: SharePageType;
  title: string;
  slug: string;
  shareText: string;
  shareTitle: string;
};

export function ShareButton({
  config,
  className,
}: {
  config: ShareConfig;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);

  const baseUrl = getPublicUrl();
  const path =
    config.pageType === "project"
      ? `/project/${config.slug}`
      : config.pageType === "venue"
        ? `/venue/${config.slug}`
        : `/festival/${config.slug}`;
  const url = `${baseUrl}${path}`;

  const handleShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      setSharing(true);
      try {
        await navigator.share({
          title: config.shareTitle,
          text: config.shareText,
          url,
        });
        setOpen(false);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          console.warn("Share failed", err);
        }
      }
      setSharing(false);
      return;
    }
    setOpen(true);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setOpen(false);
    }
  };

  return (
    <>
      <button
        onClick={handleShare}
        className={cn(
          "inline-flex items-center gap-2 px-4 py-2 rounded-sm",
          "text-xs font-medium uppercase tracking-wider",
          "bg-accent/10 text-accent border border-accent/30",
          "hover:bg-accent/20 hover:border-accent/50",
          "transition-all duration-300",
          "backdrop-blur-sm",
          className
        )}
      >
        {sharing ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Share2 className="w-3.5 h-3.5" />
        )}
        <span>Del</span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm bg-card border-accent/20">
          <DialogHeader>
            <DialogTitle className="text-sm uppercase tracking-widest text-foreground/80">Del</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              Lim inn lenken i Instagram, TikTok eller hvor du vil dele.
            </p>

            <div className="flex justify-center">
              <button
                onClick={handleCopyLink}
                className={cn(
                  "inline-flex items-center gap-2 px-5 py-2.5 rounded-sm",
                  "text-xs font-medium uppercase tracking-wider",
                  "transition-all duration-300",
                  copied
                    ? "bg-accent/20 text-accent border border-accent/40"
                    : "bg-accent text-accent-foreground hover:brightness-110",
                )}
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Kopiert
                  </>
                ) : (
                  <>
                    <Link2 className="w-3.5 h-3.5" />
                    Kopier lenke
                  </>
                )}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
