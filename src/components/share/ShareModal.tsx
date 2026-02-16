import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Share2, Download } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { ShareModel } from "@/types/share";
import { SHARE_WIDTH, SHARE_HEIGHT } from "@/types/share";
// SHARE_WIDTH/HEIGHT used for aspect-ratio calc
import { useShareImage } from "@/hooks/useShareImage";
import { ShareCapturePortal } from "./ShareCapturePortal";

type ShareModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: ShareModel;
  filenameBase: string;
};

const PREVIEW_MAX_W = 280;

export function ShareModal({
  open,
  onOpenChange,
  data,
  filenameBase,
}: ShareModalProps) {
  const [captureEnabled, setCaptureEnabled] = useState(false);
  const hasGenerated = useRef(false);
  const { cardRef, generating, previewUrl, blob, generate, share, download } =
    useShareImage();

  const preloadUrls = useMemo(
    () => [
      data.brandBackgroundUrl,
      data.brandLogoUrl,
      data.heroImageUrl ?? null,
      data.subjectLogoUrl ?? null,
    ],
    [data.brandBackgroundUrl, data.brandLogoUrl, data.heroImageUrl, data.subjectLogoUrl]
  );

  // When modal opens: mount portal, then generate after portal is in the DOM
  useEffect(() => {
    if (!open) {
      setCaptureEnabled(false);
      hasGenerated.current = false;
      return;
    }
    // Mount portal first
    setCaptureEnabled(true);
  }, [open]);

  // Once portal is enabled, wait a tick then generate
  useEffect(() => {
    if (!captureEnabled || hasGenerated.current) return;
    hasGenerated.current = true;

    // Use rAF to ensure portal has actually mounted in the DOM
    let cancelled = false;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!cancelled) {
          generate(preloadUrls);
        }
      });
    });
    return () => {
      cancelled = true;
    };
  }, [captureEnabled, generate, preloadUrls]);

  const disabled = generating || !blob;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Del</DialogTitle>
          <DialogDescription>
            Instagram innlegg (4:5) – forhåndsvisning nedenfor, deretter Del eller Last ned.
          </DialogDescription>
        </DialogHeader>

        {/* Preview: show the actual generated PNG */}
        <div className="flex justify-center">
          <div
            style={{
              width: PREVIEW_MAX_W,
              aspectRatio: `${SHARE_WIDTH} / ${SHARE_HEIGHT}`,
              backgroundColor: "#0a0a0a",
            }}
            className="relative rounded-xl overflow-hidden"
          >
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Forhåndsvisning av delingsbilde"
                style={{ width: "100%", height: "100%", objectFit: "contain" }}
              />
            ) : (
              <div className="flex items-center justify-center w-full h-full">
                {generating ? (
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                ) : (
                  <span className="text-xs text-muted-foreground">Ingen preview</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Off-screen capture portal */}
        <ShareCapturePortal
          data={data}
          captureRef={cardRef}
          enabled={captureEnabled}
        />

        <div className="flex gap-2 mt-4">
          <button
            onClick={() => {
              share(filenameBase);
              onOpenChange(false);
            }}
            disabled={disabled}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-accent text-accent-foreground font-medium disabled:opacity-60 transition-colors hover:bg-accent/90"
          >
            {generating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Share2 className="w-4 h-4" />
            )}
            Del
          </button>
          <button
            onClick={() => {
              download(filenameBase);
              onOpenChange(false);
            }}
            disabled={disabled}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg border border-border bg-card hover:bg-accent/10 text-foreground font-medium disabled:opacity-60 transition-colors"
          >
            {generating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            Last ned
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
