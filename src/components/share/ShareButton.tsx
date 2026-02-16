import { useState } from "react";
import { Share2, Loader2, Check, Link2, X, ImageDown, Download } from "lucide-react";
import { getPublicUrl, cn } from "@/lib/utils";
import { generateStoryImage, extractFirstTwoSentences } from "@/lib/story-image-generator";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";

export type SharePageType = "project" | "venue" | "festival";

export type ShareConfig = {
  pageType: SharePageType;
  title: string;
  slug: string;
  shareText: string;
  shareTitle: string;
  /** Optional preview image (imported asset) */
  previewImage?: string;
  /** Hero image URL for story generation */
  heroImageUrl?: string | null;
  /** Full description – first 2 sentences extracted automatically */
  description?: string | null;
  /** Entity/project logo URL */
  logoUrl?: string | null;
};

export function ShareButton({
  config,
  className,
}: {
  config: ShareConfig;
  className?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [generatingStory, setGeneratingStory] = useState(false);
  const [storyPreviewUrl, setStoryPreviewUrl] = useState<string | null>(null);
  const [storyBlob, setStoryBlob] = useState<Blob | null>(null);

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
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          console.warn("Share failed", err);
        }
      }
      setSharing(false);
      return;
    }
    setExpanded(true);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* noop */
    }
  };

  const handleGeneratePreview = async () => {
    setGeneratingStory(true);
    try {
      const desc = extractFirstTwoSentences(config.description);
      const blob = await generateStoryImage({
        heroImageUrl: config.heroImageUrl ?? null,
        title: config.title,
        description: desc,
        logoUrl: config.logoUrl,
      });
      setStoryBlob(blob);
      setStoryPreviewUrl(URL.createObjectURL(blob));
    } catch (err) {
      console.warn("Story generation failed", err);
    }
    setGeneratingStory(false);
  };

  const handleDownloadStory = () => {
    if (!storyBlob) return;
    const blobUrl = URL.createObjectURL(storyBlob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = `giggen-story-${config.slug}.png`;
    a.click();
    URL.revokeObjectURL(blobUrl);
  };

  const handleShareStory = async () => {
    if (!storyBlob) return;
    const file = new File([storyBlob], `giggen-story-${config.slug}.png`, { type: "image/png" });
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: config.shareTitle });
      } catch (err) {
        if ((err as Error).name !== "AbortError") console.warn("Share failed", err);
      }
    } else {
      handleDownloadStory();
    }
  };

  const closePreview = () => {
    if (storyPreviewUrl) URL.revokeObjectURL(storyPreviewUrl);
    setStoryPreviewUrl(null);
    setStoryBlob(null);
  };

  // Collapsed: small pill button
  if (!expanded) {
    return (
      <button
        onClick={handleShare}
        className={cn(
          "inline-flex items-center gap-2 px-4 py-2 rounded-full",
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
    );
  }

  // Expanded: share card with preview + story download
  return (
  <>
    <div
      className={cn(
        "w-64 rounded-2xl overflow-hidden",
        "bg-card/95 border border-accent/25 backdrop-blur-md",
        "shadow-lg animate-scale-in",
        className
      )}
    >
      {/* Close */}
      <button
        onClick={() => setExpanded(false)}
        className="absolute top-2 right-2 z-10 p-1 rounded-sm bg-background/60 text-foreground/60 hover:text-foreground transition-colors"
      >
        <X className="w-3 h-3" />
      </button>

      {/* Preview image */}
      {config.previewImage && (
        <div className="relative w-full aspect-[3/4] overflow-hidden">
          <img
            src={config.previewImage}
            alt={config.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
        </div>
      )}

      {/* Text + actions */}
      <div className="p-3 space-y-3 relative">
        <p className="text-xs text-foreground/80 leading-relaxed">
          {config.shareText}
        </p>

        <div className="flex gap-2">
          <button
            onClick={handleCopyLink}
            className={cn(
              "flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-sm",
              "text-[10px] font-medium uppercase tracking-wider",
              "transition-all duration-300",
              copied
                ? "bg-accent/20 text-accent border border-accent/40"
                : "bg-accent text-accent-foreground hover:brightness-110",
            )}
          >
            {copied ? (
              <>
                <Check className="w-3 h-3" />
                Kopiert
              </>
            ) : (
              <>
                <Link2 className="w-3 h-3" />
                Kopier lenke
              </>
            )}
          </button>

          <button
            onClick={handleShare}
            className="inline-flex items-center justify-center px-3 py-2 rounded-sm text-[10px] font-medium uppercase tracking-wider border border-accent/30 text-accent hover:bg-accent/10 transition-all duration-300"
          >
            <Share2 className="w-3 h-3" />
          </button>
        </div>

        {/* Story image preview */}
        <button
          onClick={handleGeneratePreview}
          disabled={generatingStory}
          className={cn(
            "w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-sm",
            "text-[10px] font-medium uppercase tracking-wider",
            "border border-accent/20 text-accent/80 hover:bg-accent/10",
            "transition-all duration-300",
            generatingStory && "opacity-60 cursor-wait"
          )}
        >
          {generatingStory ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              Lager bilde...
            </>
          ) : (
            <>
              <ImageDown className="w-3 h-3" />
              Lag story-bilde
            </>
          )}
        </button>
      </div>
    </div>

    {/* Story preview dialog */}
    <Dialog open={!!storyPreviewUrl} onOpenChange={(open) => !open && closePreview()}>
      <DialogContent className="max-w-xs p-3 bg-card border-border/30">
        <DialogTitle className="text-xs font-medium uppercase tracking-wider text-foreground/70 mb-2">
          Story-bilde
        </DialogTitle>
        {storyPreviewUrl && (
          <img
            src={storyPreviewUrl}
            alt="Story preview"
            className="w-full rounded-lg"
          />
        )}
        <div className="flex gap-2 mt-2">
          <button
            onClick={handleShareStory}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-sm text-[10px] font-medium uppercase tracking-wider bg-accent text-accent-foreground hover:brightness-110 transition-all"
          >
            <Share2 className="w-3 h-3" />
            Del
          </button>
          <button
            onClick={handleDownloadStory}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-sm text-[10px] font-medium uppercase tracking-wider border border-accent/30 text-accent hover:bg-accent/10 transition-all"
          >
            <Download className="w-3 h-3" />
            Last ned
          </button>
        </div>
      </DialogContent>
    </Dialog>
  </>
  );
}
