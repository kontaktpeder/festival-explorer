import { useRef, useCallback, useState } from "react";
import html2canvas from "html2canvas";

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
  const cardRef = useRef<HTMLDivElement>(null);
  const [generating, setGenerating] = useState(false);

  const preloadForModel = useCallback(async (urls: (string | null | undefined)[]) => {
    const valid = urls.filter((u): u is string => !!u);
    await Promise.allSettled(valid.map(preloadImage));
  }, []);

  const generateBlob = useCallback(
    async (preloadUrls?: (string | null | undefined)[]): Promise<Blob | null> => {
      if (!cardRef.current) return null;
      setGenerating(true);
      try {
        await new Promise<void>((r) => requestAnimationFrame(() => r()));
        await new Promise<void>((r) => requestAnimationFrame(() => r()));

        if (preloadUrls?.length) {
          await preloadForModel(preloadUrls);
        }
        if (typeof document !== "undefined" && document.fonts?.ready) {
          await document.fonts.ready;
        }

        const canvas = await html2canvas(cardRef.current, {
          backgroundColor: null,
          scale: 2,
          useCORS: true,
          allowTaint: false,
        });

        return await new Promise<Blob | null>((resolve) => {
          canvas.toBlob(
            (blob) => {
              setGenerating(false);
              if (!blob) {
                console.error("html2canvas toBlob returned null – sjekk CORS på bilder");
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
    [preloadForModel]
  );

  const download = useCallback(
    async (filenameBase: string, preloadUrls?: (string | null | undefined)[]) => {
      const blob = await generateBlob(preloadUrls);
      if (!blob) return;
      const filename = `${filenameBase}-instagram.png`;
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
    async (filenameBase: string, preloadUrls?: (string | null | undefined)[]) => {
      const blob = await generateBlob(preloadUrls);
      if (!blob) return;
      const filename = `${filenameBase}-instagram.png`;
      const file = new File([blob], filename, { type: "image/png" });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: filenameBase });
        } catch (err) {
          if ((err as Error).name !== "AbortError") {
            await download(filenameBase, preloadUrls);
          }
        }
      } else {
        await download(filenameBase, preloadUrls);
      }
    },
    [generateBlob, download]
  );

  return {
    cardRef,
    generating,
    generateBlob,
    download,
    share,
    preloadForModel,
  };
}
