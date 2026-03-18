import React, { useCallback, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";

type VimeoVideoProps = {
  /** Full Vimeo URL, embed code, or just the video ID */
  url: string;
  /** Use as background video (no controls, autoplay, loop). Default: true */
  background?: boolean;
  /** Extra className on outer wrapper */
  className?: string;
};

function extractVimeoId(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();

  const playerMatch = trimmed.match(/player\.vimeo\.com\/video\/(\d+)/i);
  if (playerMatch?.[1]) return playerMatch[1];

  const pageMatch = trimmed.match(/vimeo\.com\/(\d+)/i);
  if (pageMatch?.[1]) return pageMatch[1];

  const srcMatch = trimmed.match(/src=["']([^"']+)["']/i);
  if (srcMatch?.[1]) {
    const nested = srcMatch[1].match(/player\.vimeo\.com\/video\/(\d+)/i);
    if (nested?.[1]) return nested[1];
    const nested2 = srcMatch[1].match(/vimeo\.com\/(\d+)/i);
    if (nested2?.[1]) return nested2[1];
  }

  const idMatch = trimmed.match(/^(\d{6,12})$/);
  if (idMatch?.[1]) return idMatch[1];

  return null;
}

export const VimeoVideo: React.FC<VimeoVideoProps> = ({
  url,
  background = true,
  className = "",
}) => {
  const id = extractVimeoId(url);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [muted, setMuted] = useState(true);

  const toggleMute = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;

    const newMuted = !muted;
    iframe.contentWindow.postMessage(
      JSON.stringify({ method: "setVolume", value: newMuted ? 0 : 1 }),
      "*"
    );
    setMuted(newMuted);
  }, [muted]);

  if (!id) return null;

  const params = new URLSearchParams({
    background: background ? "1" : "0",
    autoplay: "1",
    muted: "1",
    loop: "1",
    title: "0",
    byline: "0",
    portrait: "0",
    dnt: "1",
  }).toString();

  const src = `https://player.vimeo.com/video/${id}?${params}`;

  return (
    <div className={`relative w-full overflow-hidden rounded-2xl ${className}`} style={{ paddingTop: "56.25%" }}>
      <iframe
        ref={iframeRef}
        src={src}
        allow="autoplay; fullscreen; picture-in-picture"
        className="absolute inset-0 w-full h-full"
        title="Video"
      />
      {background && (
        <div className="pointer-events-none absolute inset-0 bg-black/40" />
      )}
      <button
        onClick={toggleMute}
        className="absolute bottom-3 right-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm transition-colors hover:bg-black/80"
        aria-label={muted ? "Slå på lyd" : "Slå av lyd"}
      >
        {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
      </button>
    </div>
  );
};
