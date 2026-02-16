import { useState } from "react";
import { Share2, Loader2, Check, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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

const FALLBACK_SOCIAL_HINT = "Lim inn lenken i Instagram, TikTok eller hvor du vil dele.";

export function ShareButton({
  config,
  className,
  variant = "outline",
  size = "icon",
  showLabel = false,
}: {
  config: ShareConfig;
  className?: string;
  variant?: "outline" | "ghost" | "secondary";
  size?: "icon" | "sm" | "default";
  showLabel?: boolean;
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
      <Button
        variant={variant}
        size={size}
        onClick={handleShare}
        className={cn("gap-2", className)}
      >
        {sharing ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Share2 className="w-4 h-4" />
        )}
        {showLabel && <span>Del</span>}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Del</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              {FALLBACK_SOCIAL_HINT}
            </p>

            <div className="flex justify-center">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleCopyLink}
                className="gap-2"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    Kopiert
                  </>
                ) : (
                  <>
                    <Link2 className="w-4 h-4" />
                    Kopier lenke
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
