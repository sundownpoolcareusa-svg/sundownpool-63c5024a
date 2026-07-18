import { supabase } from "@/integrations/supabase/client";

type LatLng = { lat: number; lng: number };

const memoCache = new Map<string, LatLng | null>();

// Requires window.google.maps to already be loaded (e.g. via useJsApiLoader).
export async function geocodeAddress(address: string): Promise<LatLng | null> {
  if (memoCache.has(address)) return memoCache.get(address) ?? null;
  const g = (window as any).google;
  if (!g?.maps?.Geocoder) return null;

  const result = await new Promise<LatLng | null>((resolve) => {
    const geocoder = new g.maps.Geocoder();
    geocoder.geocode({ address }, (results: any[], status: string) => {
      const loc = status === "OK" ? results?.[0]?.geometry?.location : null;
      resolve(loc ? { lat: loc.lat(), lng: loc.lng() } : null);
    });
  });

  memoCache.set(address, result);
  return result;
}

// Geocodes an address and writes the result back onto the client row, so
// future map loads don't need to re-geocode the same address.
export async function geocodeAndSaveClient(clientId: string, address: string): Promise<LatLng | null> {
  const coords = await geocodeAddress(address);
  if (!coords) return null;
  await supabase.from("clients").update({ lat: coords.lat, lng: coords.lng }).eq("id", clientId);
  return coords;
}
