import { useState, useEffect } from "react";
import { Loader2, Share2, Download } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ShareModel } from "@/types/share";
import { SHARE_WIDTH, SHARE_HEIGHT } from "@/types/share";
import { useShareImage } from "@/hooks/useShareImage";
import { ShareImageCard } from "./ShareImageCard";

type ShareModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: ShareModel;
  filenameBase: string;
};

const PREVIEW_SCALE = 0.22;

export function ShareModal({
  open,
  onOpenChange,
  data,
  filenameBase,
}: ShareModalProps) {
  const [isCapturing, setIsCapturing] = useState(false);

  const {
    cardRef,
    generating,
    download,
    share,
    preloadForModel,
  } = useShareImage({ setIsCapturing });

  useEffect(() => {
    if (!open || !data) return;
    preloadForModel([
      data.brandBackgroundUrl,
      data.brandLogoUrl,
      data.heroImageUrl ?? null,
      data.subjectLogoUrl ?? null,
    ]).catch(() => {});
  }, [open, data, preloadForModel]);

  const handleShare = async () => {
    await share(filenameBase);
    onOpenChange(false);
  };

  const handleDownload = async () => {
    await download(filenameBase);
    onOpenChange(false);
  };

  const previewW = SHARE_WIDTH * PREVIEW_SCALE;
  const previewH = SHARE_HEIGHT * PREVIEW_SCALE;

  const scale = isCapturing ? 1 : PREVIEW_SCALE;
  const wrapperW = isCapturing ? SHARE_WIDTH : previewW;
  const wrapperH = isCapturing ? SHARE_HEIGHT : previewH;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Del</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground mb-4">
          Instagram innlegg (4:5) – forhåndsvisning nedenfor, deretter Del eller Last ned.
        </p>

        {/* Én kort: full størrelse 1080×1350, vises skalert; under capture scale(1) */}
        <div
          className="mx-auto mb-4 rounded-lg overflow-hidden border border-border/30"
          style={{ width: wrapperW, height: wrapperH }}
        >
          <div
            style={{
              transform: `scale(${scale})`,
              transformOrigin: "top left",
            }}
          >
            <ShareImageCard ref={cardRef} data={data} />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={handleShare}
            disabled={generating}
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
            onClick={handleDownload}
            disabled={generating}
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
