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
/**
 * Konverterer ISO-streng (UTC) til lokal YYYY-MM-DDTHH:mm for datetime-local input.
 */
export function isoToLocalDatetimeString(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function getPublicUrl(): string {
  const publicUrl = import.meta.env.VITE_PUBLIC_URL;
  if (publicUrl) {
    return publicUrl;
  }
  if (typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
    return window.location.origin;
  }
  return "https://giggen.org";
}
