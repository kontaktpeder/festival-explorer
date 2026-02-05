import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Get the public URL for the app (production URL).
 * Uses VITE_PUBLIC_URL if set, otherwise falls back to window.location.origin.
 */
export function getPublicUrl(): string {
  const publicUrl = import.meta.env.VITE_PUBLIC_URL;
  if (publicUrl) {
    return publicUrl;
  }
  if (typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
    return window.location.origin;
  }
  return "https://giggn.lovable.app";
}
