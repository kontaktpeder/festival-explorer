import { useRef, useCallback, useState } from "react";
import html2canvas from "html2canvas";
import type { ShareImageFormat } from "@/components/share/ShareImageCard";

export function useShareImage() {
  const linkCardRef = useRef<HTMLDivElement>(null);
  const storyCardRef = useRef<HTMLDivElement>(null);
  const [generating, setGenerating] = useState(false);

  const getRef = (format: ShareImageFormat) =>
    format === "link" ? linkCardRef : storyCardRef;

  const generateBlob = useCallback(
    async (format: ShareImageFormat): Promise<Blob | null> => {
      const ref = getRef(format);
      if (!ref.current) return null;
      setGenerating(true);
      try {
        const canvas = await html2canvas(ref.current, {
          backgroundColor: null,
          scale: 2,
          useCORS: true,
          allowTaint: false,
        });
        return new Promise<Blob | null>((resolve) => {
          canvas.toBlob(
            (blob) => {
              setGenerating(false);
              resolve(blob ?? null);
            },
            "image/png"
          );
        });
      } catch (e) {
        setGenerating(false);
        console.error("Share image generation failed", e);
        return null;
      }
    },
    []
  );

  const download = useCallback(
    async (format: ShareImageFormat, filenameBase: string) => {
      const blob = await generateBlob(format);
      if (!blob) return;
      const ext = format === "link" ? "-link" : "-story";
      const filename = `${filenameBase}${ext}.png`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    },
    [generateBlob]
  );

  const share = useCallback(
    async (format: ShareImageFormat, filenameBase: string) => {
      const blob = await generateBlob(format);
      if (!blob) return;
      const ext = format === "link" ? "-link" : "-story";
      const filename = `${filenameBase}${ext}.png`;
      const file = new File([blob], filename, { type: "image/png" });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: filenameBase });
        } catch (err) {
          if ((err as Error).name !== "AbortError") console.warn("Share failed", err);
        }
      } else {
        // Fallback to download
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      }
    },
    [generateBlob]
  );

  return {
    linkCardRef,
    storyCardRef,
    generating,
    generateBlob,
    download,
    share,
  };
}
