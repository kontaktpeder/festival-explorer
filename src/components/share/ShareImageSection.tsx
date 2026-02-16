import { useState } from "react";
import { Loader2, Download, Share2, ImageDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { ShareImageCard, type ShareImageFormat } from "./ShareImageCard";
import { useShareImage } from "@/hooks/useShareImage";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";

type ShareImageSectionProps = {
  slug: string;
  heroImageUrl: string | null;
  logoUrl: string | null;
  title: string;
  tagline: string | null;
};

export function ShareImageSection({
  slug,
  heroImageUrl,
  logoUrl,
  title,
  tagline,
}: ShareImageSectionProps) {
  const [format, setFormat] = useState<ShareImageFormat>("story");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const {
    linkCardRef,
    storyCardRef,
    generating,
    generateBlob,
    download,
    share,
  } = useShareImage();

  const filenameBase = `giggen-${slug}`;

  const handlePreview = async () => {
    const blob = await generateBlob(format);
    if (blob) {
      setPreviewBlob(blob);
      setPreviewUrl(URL.createObjectURL(blob));
    }
  };

  const handleDownloadPreview = () => {
    if (!previewBlob) return;
    const ext = format === "link" ? "-link" : "-story";
    const url = URL.createObjectURL(previewBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filenameBase}${ext}.png`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSharePreview = async () => {
    if (!previewBlob) return;
    const ext = format === "link" ? "-link" : "-story";
    const file = new File([previewBlob], `${filenameBase}${ext}.png`, { type: "image/png" });
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title });
      } catch (err) {
        if ((err as Error).name !== "AbortError") console.warn(err);
      }
    } else {
      handleDownloadPreview();
    }
  };

  const closePreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPreviewBlob(null);
  };

  return (
    <>
      <section className="py-16 md:py-24 border-t border-border/20">
        <div className="max-w-2xl mx-auto px-6">
          <h2 className="text-mono text-accent/60 text-xs uppercase tracking-[0.25em] mb-4">
            Del
          </h2>
          <p className="text-sm text-muted-foreground/60 mb-6">
            Last ned et bilde med bakgrunn, tittel og GIGGEN-branding.
          </p>

          {/* Format toggle */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setFormat("story")}
              className={cn(
                "px-4 py-2 rounded-full text-xs font-medium uppercase tracking-wider transition-all",
                format === "story"
                  ? "bg-accent text-accent-foreground"
                  : "bg-accent/10 text-accent/60 border border-accent/20 hover:bg-accent/20"
              )}
            >
              Story 9:16
            </button>
            <button
              onClick={() => setFormat("link")}
              className={cn(
                "px-4 py-2 rounded-full text-xs font-medium uppercase tracking-wider transition-all",
                format === "link"
                  ? "bg-accent text-accent-foreground"
                  : "bg-accent/10 text-accent/60 border border-accent/20 hover:bg-accent/20"
              )}
            >
              Link 1200×630
            </button>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handlePreview}
              disabled={generating}
              className={cn(
                "inline-flex items-center gap-2 px-5 py-2.5 rounded-full",
                "text-xs font-medium uppercase tracking-wider",
                "bg-accent text-accent-foreground hover:brightness-110",
                "transition-all duration-300",
                generating && "opacity-60 cursor-wait"
              )}
            >
              {generating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ImageDown className="w-4 h-4" />
              )}
              {generating ? "Lager..." : "Lag bilde"}
            </button>
            <button
              onClick={() => download(format, filenameBase)}
              disabled={generating}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-medium uppercase tracking-wider border border-accent/30 text-accent/80 hover:bg-accent/10 transition-all"
            >
              <Download className="w-4 h-4" />
              Last ned
            </button>
            <button
              onClick={() => share(format, filenameBase)}
              disabled={generating}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-medium uppercase tracking-wider border border-accent/30 text-accent/80 hover:bg-accent/10 transition-all"
            >
              <Share2 className="w-4 h-4" />
              Del
            </button>
          </div>
        </div>
      </section>

      {/* Hidden off-screen cards for html2canvas capture */}
      <div className="fixed -left-[9999px] -top-[9999px] pointer-events-none" aria-hidden="true">
        <ShareImageCard
          ref={linkCardRef}
          format="link"
          heroImageUrl={heroImageUrl}
          logoUrl={logoUrl}
          title={title}
          tagline={tagline}
        />
        <ShareImageCard
          ref={storyCardRef}
          format="story"
          heroImageUrl={heroImageUrl}
          logoUrl={logoUrl}
          title={title}
          tagline={tagline}
        />
      </div>

      {/* Preview dialog */}
      <Dialog open={!!previewUrl} onOpenChange={(open) => !open && closePreview()}>
        <DialogContent className="max-w-sm w-[calc(100vw-2rem)] p-0 bg-transparent border-none shadow-none overflow-hidden [&>button]:text-white [&>button]:bg-black/40 [&>button]:rounded-full [&>button]:p-1.5 [&>button]:top-3 [&>button]:right-3">
          <DialogTitle className="sr-only">Forhåndsvisning av delingsbilde</DialogTitle>
          {previewUrl && (
            <div className="relative rounded-2xl overflow-hidden shadow-2xl">
              <img src={previewUrl} alt="Preview" className="w-full h-auto block" />
              <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/70 to-transparent">
                <div className="flex gap-2">
                  <button
                    onClick={handleSharePreview}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-full text-xs font-semibold uppercase tracking-wider bg-white text-black hover:bg-white/90 transition-all"
                  >
                    <Share2 className="w-4 h-4" />
                    Del
                  </button>
                  <button
                    onClick={handleDownloadPreview}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-full text-xs font-semibold uppercase tracking-wider bg-white/20 text-white border border-white/30 hover:bg-white/30 backdrop-blur-sm transition-all"
                  >
                    <Download className="w-4 h-4" />
                    Last ned
                  </button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
