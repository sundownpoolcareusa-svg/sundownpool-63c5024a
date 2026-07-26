import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const SIGNED_URL_TTL_SECONDS = 60 * 60;
const cache = new Map<string, { url: string; expiresAt: number }>();
const inflight = new Map<string, Promise<string | null>>();

function cacheKey(bucket: string, path: string) {
  return `${bucket}:${path}`;
}

function getCached(bucket: string, path: string): string | null {
  const hit = cache.get(cacheKey(bucket, path));
  return hit && hit.expiresAt > Date.now() ? hit.url : null;
}

function fetchSignedUrl(bucket: string, path: string): Promise<string | null> {
  const key = cacheKey(bucket, path);
  const existing = inflight.get(key);
  if (existing) return existing;

  const promise = supabase.storage.from(bucket).createSignedUrl(path, SIGNED_URL_TTL_SECONDS).then(({ data }) => {
    inflight.delete(key);
    if (!data?.signedUrl) return null;
    // Expire our cache a minute before the real URL does, so we never hand
    // out one that's about to stop working.
    cache.set(key, { url: data.signedUrl, expiresAt: Date.now() + (SIGNED_URL_TTL_SECONDS - 60) * 1000 });
    return data.signedUrl;
  });
  inflight.set(key, promise);
  return promise;
}

// Signed URLs for private storage paths have to be fetched asynchronously
// (an <img> can't just point at the path directly), which used to mean
// every single mount briefly showed a placeholder before the real photo
// popped in — even for a photo that had already loaded moments earlier on
// another screen. Caching by bucket+path for the URL's own lifetime makes
// repeat views instant.
export function useSignedPhotoUrl(bucket: string, path: string | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(() => (path ? getCached(bucket, path) : null));

  useEffect(() => {
    if (!path) {
      setUrl(null);
      return;
    }
    const cached = getCached(bucket, path);
    if (cached) {
      setUrl(cached);
      return;
    }
    setUrl(null);
    let alive = true;
    fetchSignedUrl(bucket, path).then((signedUrl) => {
      if (alive) setUrl(signedUrl);
    });
    return () => {
      alive = false;
    };
  }, [bucket, path]);

  return url;
}
