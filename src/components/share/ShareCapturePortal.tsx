import React from "react";
import { createPortal } from "react-dom";
import type { ShareModel } from "@/types/share";
import { SHARE_WIDTH, SHARE_HEIGHT } from "@/types/share";
import { ShareImageCard } from "./ShareImageCard";

type Props = {
  data: ShareModel;
  captureRef: React.RefObject<HTMLDivElement>;
  enabled: boolean;
};

export function ShareCapturePortal({ data, captureRef, enabled }: Props) {
  if (!enabled) return null;

  return createPortal(
    <div
      style={{
        position: "fixed",
        left: -100000,
        top: 0,
        opacity: 0,
        width: SHARE_WIDTH,
        height: SHARE_HEIGHT,
        pointerEvents: "none",
        zIndex: -1,
      }}
    >
      <ShareImageCard ref={captureRef} data={data} />
    </div>,
    document.body
  );
}
