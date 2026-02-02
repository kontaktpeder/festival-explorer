import { supabase } from "@/integrations/supabase/client";

/**
 * Henter media-URL for visning
 * 
 * PRINSIPPER:
 * - Offentlig visning (publiserte sider): Genererer signed URL for private filer
 * - Dashboard/MediaPicker (privat): Bruker direkte public_url (bruker har allerede tilgang)
 * - External URLs (YouTube, Vimeo, etc.): Returneres direkte
 * 
 * Signed URLs caches i 1 time for ytelse
 */
export async function getMediaUrl(
  mediaItem: { 
    public_url?: string | null; 
    storage_path?: string | null; 
    external_url?: string | null;
  },
  context: 'public' | 'private' = 'public'
): Promise<string> {
  // Hvis external URL (YouTube, Vimeo, etc.)
  if (mediaItem.external_url) {
    return mediaItem.external_url;
  }

  // For private context (dashboard/MediaPicker), bruk direkte public_url
  if (context === 'private' && mediaItem.public_url) {
    return mediaItem.public_url;
  }

  // For offentlig visning, sjekk om vi har storage_path
  if (context === 'public' && mediaItem.storage_path) {
    // Sjekk cache først
    const cached = getCachedSignedUrl(mediaItem.storage_path);
    if (cached) {
      return cached;
    }

    // Generer signed URL som er gyldig i 1 time
    const { data, error } = await supabase.storage
      .from("media")
      .createSignedUrl(mediaItem.storage_path, 3600);
    
    if (error) {
      console.error("Error creating signed URL:", error);
      return mediaItem.public_url || "";
    }
    
    const signedUrl = data?.signedUrl || "";
    
    if (signedUrl) {
      setCachedSignedUrl(mediaItem.storage_path, signedUrl);
    }
    
    return signedUrl;
  }

  // Prøv å parse storage_path fra public_url
  if (context === 'public' && mediaItem.public_url) {
    const storagePath = parseStoragePathFromUrl(mediaItem.public_url);
    
    if (storagePath) {
      // Sjekk cache først
      const cached = getCachedSignedUrl(storagePath);
      if (cached) {
        return cached;
      }

      // Generer signed URL
      const { data, error } = await supabase.storage
        .from("media")
        .createSignedUrl(storagePath, 3600);
      
      if (error) {
        console.error("Error creating signed URL:", error);
        return mediaItem.public_url;
      }
      
      const signedUrl = data?.signedUrl || "";
      
      if (signedUrl) {
        setCachedSignedUrl(storagePath, signedUrl);
      }
      
      return signedUrl;
    }
    
    // Ikke en storage URL, returner direkte
    return mediaItem.public_url;
  }

  return mediaItem.public_url || "";
}

/**
 * Parser storage_path fra en Supabase storage URL
 * 
 * Formater:
 * - https://{project}.supabase.co/storage/v1/object/public/media/{path}
 * - https://{project}.supabase.co/storage/v1/object/sign/media/{path}?token=...
 */
function parseStoragePathFromUrl(url: string): string | null {
  if (!url) return null;
  
  // Sjekk om det er en Supabase storage URL
  const publicMatch = url.match(/\/storage\/v1\/object\/public\/media\/(.+?)(?:\?|$)/);
  if (publicMatch) {
    return decodeURIComponent(publicMatch[1]);
  }
  
  const signMatch = url.match(/\/storage\/v1\/object\/sign\/media\/(.+?)(?:\?|$)/);
  if (signMatch) {
    return decodeURIComponent(signMatch[1]);
  }
  
  return null;
}

/**
 * Cache for signed URLs (forbedrer ytelse ved offentlig visning)
 */
const signedUrlCache = new Map<string, { url: string; expiresAt: number }>();

export function getCachedSignedUrl(storagePath: string): string | null {
  const cached = signedUrlCache.get(storagePath);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.url;
  }
  
  // Fjern expired cache entry
  if (cached) {
    signedUrlCache.delete(storagePath);
  }
  
  return null;
}

export function setCachedSignedUrl(
  storagePath: string,
  url: string,
  expiresInSeconds: number = 3600
): void {
  // Cache for 50 minutter (under signed URL expiry på 1 time)
  signedUrlCache.set(storagePath, {
    url,
    expiresAt: Date.now() + ((expiresInSeconds - 600) * 1000)
  });
}

// Cache version for forcing re-fetch in useSignedMediaUrl
let cacheVersion = 0;
const cacheVersionSubscribers = new Set<() => void>();

export function getCacheVersion(): number {
  return cacheVersion;
}

export function subscribeToCacheVersion(callback: () => void): () => void {
  cacheVersionSubscribers.add(callback);
  return () => cacheVersionSubscribers.delete(callback);
}

function notifyCacheVersionChange(): void {
  cacheVersionSubscribers.forEach(callback => callback());
}

export function incrementCacheVersion(): void {
  cacheVersion++;
  notifyCacheVersionChange();
}

/**
 * Rydder opp i expired cache entries
 * Hvis clearAll er true, rydder ALLE entries (brukes når bilder oppdateres)
 */
export function cleanupSignedUrlCache(clearAll: boolean = false): void {
  if (clearAll) {
    signedUrlCache.clear();
    incrementCacheVersion(); // Increment version to force re-fetch in hooks
    return;
  }
  
  const now = Date.now();
  for (const [path, cached] of signedUrlCache.entries()) {
    if (cached.expiresAt <= now) {
      signedUrlCache.delete(path);
    }
  }
}
