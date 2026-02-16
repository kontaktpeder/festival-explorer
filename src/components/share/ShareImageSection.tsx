import { useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ShareModel } from "@/types/share";
import { ShareModal } from "./ShareModal";

type ShareImageSectionProps = {
  slug: string;
  shareModel: ShareModel;
  /** Compact mode for sidebar placement */
  compact?: boolean;
};

export function ShareImageSection({
  slug,
  shareModel,
  compact = false,
}: ShareImageSectionProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const filenameBase = `giggen-${slug}`;

  if (compact) {
    return (
      <div className="rounded-xl border border-border/15 bg-card/40 p-5 space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/50">
          Del
        </h3>
        <p className="text-xs text-muted-foreground/40 leading-relaxed">
          Lag et bilde du kan dele med venner og kolleger.
        </p>
        <Button
          onClick={() => setModalOpen(true)}
          size="sm"
          className="bg-accent text-accent-foreground hover:bg-accent/90 rounded-full w-full"
        >
          <Send className="w-3.5 h-3.5 mr-2" />
          Del
        </Button>
        <ShareModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          data={shareModel}
          filenameBase={filenameBase}
        />
      </div>
    );
  }

  return (
    <section className="py-12 md:py-16 border-t border-border/20">
      <div className="max-w-2xl mx-auto px-6 text-center">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground/50 mb-3">
          Del
        </h2>
        <p className="text-sm text-muted-foreground/40 mb-5">
          Lag et bilde du kan laste ned, eller dele med venner og kolleger.
        </p>
        <Button
          onClick={() => setModalOpen(true)}
          className="bg-accent text-accent-foreground hover:bg-accent/90 rounded-full"
        >
          <Send className="w-4 h-4 mr-2" />
          Del
        </Button>
      </div>

      <ShareModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        data={shareModel}
        filenameBase={filenameBase}
      />
    </section>
  );
}
