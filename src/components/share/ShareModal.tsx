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
import { ShareCapturePortal } from "./ShareCapturePortal";

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
  const [captureMode, setCaptureMode] = useState(false);

  const {
    cardRef,
    generating,
    download,
    share,
    preloadForModel,
  } = useShareImage();

  const preloadUrls = [
    data.brandBackgroundUrl,
    data.brandLogoUrl,
    data.heroImageUrl ?? null,
    data.subjectLogoUrl ?? null,
  ];

  useEffect(() => {
    if (!open || !data) return;
    preloadForModel(preloadUrls).catch(() => {});
  }, [open, data, preloadForModel]);

  const handleShare = async () => {
    setCaptureMode(true);
    try {
      await new Promise<void>((r) => requestAnimationFrame(() => r()));
      await new Promise<void>((r) => requestAnimationFrame(() => r()));
      await share(filenameBase, preloadUrls);
      onOpenChange(false);
    } finally {
      setCaptureMode(false);
    }
  };

  const handleDownload = async () => {
    setCaptureMode(true);
    try {
      await new Promise<void>((r) => requestAnimationFrame(() => r()));
      await new Promise<void>((r) => requestAnimationFrame(() => r()));
      await download(filenameBase, preloadUrls);
      onOpenChange(false);
    } finally {
      setCaptureMode(false);
    }
  };

  const wrapperW = SHARE_WIDTH * PREVIEW_SCALE;
  const wrapperH = SHARE_HEIGHT * PREVIEW_SCALE;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Del</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground mb-4">
          Instagram innlegg (4:5) – forhåndsvisning nedenfor, deretter Del eller Last ned.
        </p>

        <div className="flex justify-center">
          <div
            style={{ width: wrapperW, height: wrapperH }}
            className="relative overflow-hidden rounded-xl"
          >
            <div
              style={{
                transform: `scale(${PREVIEW_SCALE})`,
                transformOrigin: "top left",
                width: SHARE_WIDTH,
                height: SHARE_HEIGHT,
              }}
            >
              <ShareImageCard data={data} />
            </div>
          </div>
        </div>

        <ShareCapturePortal data={data} captureRef={cardRef} enabled={captureMode} />

        <div className="flex gap-2 mt-4">
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
