import { useState, useEffect, useSyncExternalStore } from "react";
import { getMediaUrl, getCacheVersion, subscribeToCacheVersion } from "@/lib/media-helpers";

/**
 * Hook for å hente signed media URL for offentlig visning
 * 
 * Brukes på offentlige sider som ProjectPage, EventPage, FestivalPage
 * for å generere signed URLs for private storage-filer.
 * 
 * Cache invalidation skjer via cleanupSignedUrlCache(true) fra admin-sider,
 * som inkrementerer cacheVersion og tvinger denne hooken til å re-fetche.
 */
export function useSignedMediaUrl(
  publicUrl: string | null | undefined,
  context: 'public' | 'private' = 'public'
): string {
  const [signedUrl, setSignedUrl] = useState<string>("");
  
  // Track cache version to force re-fetch when cache is cleared (from admin pages)
  const cacheVersion = useSyncExternalStore(
    subscribeToCacheVersion,
    getCacheVersion,
    getCacheVersion
  );

  useEffect(() => {
    if (!publicUrl) {
      setSignedUrl("");
      return;
    }

    // For private context, bruk URL direkte
    if (context === 'private') {
      setSignedUrl(publicUrl);
      return;
    }

    // For public context, generer signed URL
    let cancelled = false;

    getMediaUrl({ public_url: publicUrl }, context)
      .then(url => {
        if (!cancelled) {
          setSignedUrl(url);
        }
      })
      .catch(err => {
        console.error("Error getting signed media URL:", err);
        if (!cancelled) {
          setSignedUrl(publicUrl); // Fallback
        }
      });

    return () => {
      cancelled = true;
    };
  }, [publicUrl, context, cacheVersion]);

  return signedUrl;
}
