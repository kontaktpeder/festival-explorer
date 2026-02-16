import giggenLogo from "@/assets/giggen-logo-final.png";
import storyFallbackBg from "@/assets/story-fallback-bg.jpeg";

const STORY_W = 1080;
const STORY_H = 1920;

export interface StoryImageOptions {
  heroImageUrl: string | null;
  title: string;
  /** First two sentences of description */
  description: string;
  logoUrl?: string | null;
}

/**
 * Extract the first two sentences from a text block.
 */
export function extractFirstTwoSentences(text: string | null | undefined): string {
  if (!text) return "";
  // Split on sentence endings while keeping the punctuation
  const sentences = text.match(/[^.!?\n]+[.!?]?/g);
  if (!sentences) return text.slice(0, 140);
  return sentences.slice(0, 2).join("").trim();
}

/**
 * Generate a 1080×1920 story image as a Blob (PNG).
 */
export async function generateStoryImage(opts: StoryImageOptions): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = STORY_W;
  canvas.height = STORY_H;
  const ctx = canvas.getContext("2d")!;

  // 1. Draw hero background or dark fallback
  if (opts.heroImageUrl) {
    try {
      const img = await loadImage(opts.heroImageUrl);
      // Cover the canvas
      const scale = Math.max(STORY_W / img.width, STORY_H / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      ctx.drawImage(img, (STORY_W - w) / 2, (STORY_H - h) / 2, w, h);
    } catch {
      await drawFallbackBg(ctx);
    }
  } else {
    await drawFallbackBg(ctx);
  }

  // 2. Dark gradient overlay from bottom
  const grad = ctx.createLinearGradient(0, STORY_H * 0.35, 0, STORY_H);
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(0.4, "rgba(0,0,0,0.55)");
  grad.addColorStop(1, "rgba(0,0,0,0.92)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, STORY_W, STORY_H);

  // Also add a top vignette for logo contrast
  const topGrad = ctx.createLinearGradient(0, 0, 0, STORY_H * 0.25);
  topGrad.addColorStop(0, "rgba(0,0,0,0.6)");
  topGrad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = topGrad;
  ctx.fillRect(0, 0, STORY_W, STORY_H * 0.25);

  const pad = 72;

  // 3. Draw GIGGEN logo at top center
  try {
    const logo = await loadImage(giggenLogo);
    const logoH = 80;
    const logoW = (logo.width / logo.height) * logoH;
    ctx.drawImage(logo, (STORY_W - logoW) / 2, 100, logoW, logoH);
  } catch {
    // Skip logo if it fails
  }

  // 4. Draw entity/project logo if available (bottom area, above title)
  let entityLogoBottom = STORY_H * 0.62;
  if (opts.logoUrl) {
    try {
      const eLogo = await loadImage(opts.logoUrl);
      const eLogoH = 100;
      const eLogoW = (eLogo.width / eLogo.height) * eLogoH;
      const eLogoY = STORY_H * 0.58;
      ctx.drawImage(eLogo, pad, eLogoY, eLogoW, eLogoH);
      entityLogoBottom = eLogoY + eLogoH + 24;
    } catch {
      // Skip
    }
  }

  // 5. Title
  const titleY = opts.logoUrl ? entityLogoBottom : STORY_H * 0.64;
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 72px system-ui, -apple-system, sans-serif";
  ctx.textAlign = "left";
  const titleLines = wrapText(ctx, opts.title.toUpperCase(), STORY_W - pad * 2);
  let currentY = titleY;
  for (const line of titleLines.slice(0, 3)) {
    ctx.fillText(line, pad, currentY);
    currentY += 84;
  }

  // 6. Description (first 2 sentences)
  if (opts.description) {
    currentY += 12;
    ctx.font = "400 36px system-ui, -apple-system, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    const descLines = wrapText(ctx, opts.description, STORY_W - pad * 2);
    for (const line of descLines.slice(0, 4)) {
      ctx.fillText(line, pad, currentY);
      currentY += 46;
    }
  }

  // 7. Bottom CTA
  ctx.font = "600 30px system-ui, -apple-system, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.fillText("giggen.org", pad, STORY_H - 100);

  // Convert to blob
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Canvas toBlob failed"));
    }, "image/png");
  });
}

async function drawFallbackBg(ctx: CanvasRenderingContext2D) {
  try {
    const img = await loadImage(storyFallbackBg);
    const scale = Math.max(STORY_W / img.width, STORY_H / img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    ctx.drawImage(img, (STORY_W - w) / 2, (STORY_H - h) / 2, w, h);
  } catch {
    const grad = ctx.createLinearGradient(0, 0, STORY_W, STORY_H);
    grad.addColorStop(0, "#0f0f12");
    grad.addColorStop(1, "#1a1a2e");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, STORY_W, STORY_H);
  }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line + (line ? " " : "") + w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}
