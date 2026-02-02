import { useState, useEffect, useRef, useSyncExternalStore } from "react";
import { getMediaUrl, cleanupSignedUrlCache, getCacheVersion, subscribeToCacheVersion } from "@/lib/media-helpers";

/**
 * Hook for å hente signed media URL for offentlig visning
 * 
 * Brukes på offentlige sider som ProjectPage, EventPage, FestivalPage
 * for å generere signed URLs for private storage-filer.
 */
export function useSignedMediaUrl(
  publicUrl: string | null | undefined,
  context: 'public' | 'private' = 'public'
): string {
  const previousUrlRef = useRef<string | null | undefined>(undefined);
  const [signedUrl, setSignedUrl] = useState<string>("");
  
  // Track cache version to force re-fetch when cache is cleared
  const cacheVersion = useSyncExternalStore(
    subscribeToCacheVersion,
    getCacheVersion,
    getCacheVersion
  );

  useEffect(() => {
    if (!publicUrl) {
      setSignedUrl("");
      previousUrlRef.current = publicUrl;
      return;
    }

    // For private context, bruk URL direkte
    if (context === 'private') {
      setSignedUrl(publicUrl);
      previousUrlRef.current = publicUrl;
      return;
    }

    // Hvis URL har endret seg, rydd cache for å tvinge ny signed URL
    if (previousUrlRef.current !== undefined && previousUrlRef.current !== publicUrl) {
      cleanupSignedUrlCache(true);
    }

    // For public context, generer signed URL
    let cancelled = false;

    getMediaUrl({ public_url: publicUrl }, context)
      .then(url => {
        if (!cancelled) {
          setSignedUrl(url);
          previousUrlRef.current = publicUrl;
        }
      })
      .catch(err => {
        console.error("Error getting signed media URL:", err);
        if (!cancelled) {
          setSignedUrl(publicUrl); // Fallback
          previousUrlRef.current = publicUrl;
        }
      });

    return () => {
      cancelled = true;
    };
  }, [publicUrl, context, cacheVersion]); // Added cacheVersion dependency

  return signedUrl;
}
