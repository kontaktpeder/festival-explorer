import { useState } from "react";
import { Loader2, Share2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ShareModel, ShareVariant } from "@/types/share";
import { useShareImage } from "@/hooks/useShareImage";
import { ShareImageCard } from "./ShareImageCard";

type ShareModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: ShareModel;
  filenameBase: string;
};

export function ShareModal({
  open,
  onOpenChange,
  data,
  filenameBase,
}: ShareModalProps) {
  const [activeVariant, setActiveVariant] = useState<ShareVariant | null>(null);
  const {
    storyCardRef,
    linkCardRef,
    generating,
    share,
  } = useShareImage();

  const handleChoice = async (variant: ShareVariant) => {
    setActiveVariant(variant);
    await share(variant, filenameBase);
    setActiveVariant(null);
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Del</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-4">
            Velg format for delingsbildet.
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => handleChoice("story")}
              disabled={generating}
              className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-lg border border-border bg-card hover:bg-accent/10 text-foreground font-medium disabled:opacity-60 transition-colors"
            >
              {activeVariant === "story" && generating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Share2 className="w-4 h-4" />
              )}
              Del som story (9:16)
            </button>
            <button
              onClick={() => handleChoice("link")}
              disabled={generating}
              className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-lg border border-border bg-card hover:bg-accent/10 text-foreground font-medium disabled:opacity-60 transition-colors"
            >
              {activeVariant === "link" && generating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Share2 className="w-4 h-4" />
              )}
              Del som link (4:5)
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Hidden off-screen cards for html2canvas capture */}
      <div className="fixed -left-[9999px] -top-[9999px] pointer-events-none" aria-hidden="true">
        <ShareImageCard ref={storyCardRef} variant="story" data={data} />
        <ShareImageCard ref={linkCardRef} variant="link" data={data} />
      </div>
    </>
  );
}
