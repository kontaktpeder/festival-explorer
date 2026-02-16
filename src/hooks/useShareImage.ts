import { useRef, useCallback, useState } from "react";
import html2canvas from "html2canvas";
import type { ShareVariant } from "@/types/share";

function preloadImage(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve();
    img.onerror = () => reject(new Error(`Preload failed: ${src}`));
    img.src = src;
  });
}

export function useShareImage() {
  const storyCardRef = useRef<HTMLDivElement>(null);
  const linkCardRef = useRef<HTMLDivElement>(null);
  const [generating, setGenerating] = useState(false);

  const getRef = (variant: ShareVariant) =>
    variant === "link" ? linkCardRef : storyCardRef;

  const generateBlob = useCallback(
    async (variant: ShareVariant): Promise<Blob | null> => {
      const ref = getRef(variant);
      if (!ref.current) return null;
      setGenerating(true);
      try {
        if (typeof document !== "undefined" && document.fonts?.ready) {
          await document.fonts.ready;
        }
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
              if (!blob) {
                console.error("html2canvas toBlob returned null – check CORS on images");
              }
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

  const preloadForModel = useCallback(async (urls: (string | null | undefined)[]) => {
    const valid = urls.filter((u): u is string => !!u);
    await Promise.allSettled(valid.map(preloadImage));
  }, []);

  const download = useCallback(
    async (variant: ShareVariant, filenameBase: string) => {
      const blob = await generateBlob(variant);
      if (!blob) return;
      const filename = `${filenameBase}-${variant}.png`;
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
    async (variant: ShareVariant, filenameBase: string) => {
      const blob = await generateBlob(variant);
      if (!blob) return;
      const filename = `${filenameBase}-${variant}.png`;
      const file = new File([blob], filename, { type: "image/png" });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: filenameBase });
        } catch (err) {
          if ((err as Error).name !== "AbortError") {
            await download(variant, filenameBase);
          }
        }
      } else {
        await download(variant, filenameBase);
      }
    },
    [generateBlob, download]
  );

  return {
    storyCardRef,
    linkCardRef,
    generating,
    generateBlob,
    download,
    share,
    preloadForModel,
  };
}
