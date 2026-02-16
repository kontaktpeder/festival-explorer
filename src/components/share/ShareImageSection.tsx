import { useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ShareModel } from "@/types/share";
import { ShareModal } from "./ShareModal";

type ShareImageSectionProps = {
  slug: string;
  shareModel: ShareModel;
};

export function ShareImageSection({
  slug,
  shareModel,
}: ShareImageSectionProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const filenameBase = `giggen-${slug}`;

  return (
    <section className="py-16 md:py-24 border-t border-border/20">
      <div className="max-w-2xl mx-auto px-6 text-center">
        <h2 className="text-mono text-accent/60 text-xs uppercase tracking-[0.25em] mb-4">
          Del
        </h2>
        <p className="text-sm text-muted-foreground/40 mb-6">
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
