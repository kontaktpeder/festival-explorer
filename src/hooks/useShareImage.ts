import { useCallback, useEffect, useRef, useState } from "react";
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
  const [blob, setBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const prevUrlRef = useRef<string | null>(null);

  // cleanup on unmount
  useEffect(() => {
    return () => {
      if (prevUrlRef.current) URL.revokeObjectURL(prevUrlRef.current);
    };
  }, []);

  const generate = useCallback(
    async (preloadUrls: (string | null | undefined)[] = []): Promise<Blob | null> => {
      if (!cardRef.current) {
        console.warn("useShareImage.generate: cardRef is null");
        return null;
      }
      setGenerating(true);
      try {
        // wait for layout
        await new Promise<void>((r) => requestAnimationFrame(() => r()));
        await new Promise<void>((r) => requestAnimationFrame(() => r()));

        const valid = preloadUrls.filter((u): u is string => !!u);
        await Promise.allSettled(valid.map(preloadImage));

        if (document.fonts?.ready) await document.fonts.ready;

        const canvas = await html2canvas(cardRef.current, {
          backgroundColor: null,
          scale: 2,
          useCORS: true,
          allowTaint: false,
        });

        const out = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob((b) => resolve(b ?? null), "image/png")
        );

        setBlob(out);

        // revoke old url, set new
        if (prevUrlRef.current) URL.revokeObjectURL(prevUrlRef.current);
        const newUrl = out ? URL.createObjectURL(out) : null;
        prevUrlRef.current = newUrl;
        setPreviewUrl(newUrl);

        return out;
      } catch (e) {
        console.error("Share image generation failed", e);
        return null;
      } finally {
        setGenerating(false);
      }
    },
    [] // stable – no deps needed, uses refs
  );

  const download = useCallback(
    (filenameBase: string) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${filenameBase}-instagram.png`;
      a.click();
      URL.revokeObjectURL(url);
    },
    [blob]
  );

  const share = useCallback(
    async (filenameBase: string) => {
      if (!blob) return;
      const file = new File([blob], `${filenameBase}-instagram.png`, {
        type: "image/png",
      });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: filenameBase });
          return;
        } catch (err) {
          if ((err as Error).name === "AbortError") return;
        }
      }
      download(filenameBase);
    },
    [blob, download]
  );

  return { cardRef, generating, blob, previewUrl, generate, download, share };
}
