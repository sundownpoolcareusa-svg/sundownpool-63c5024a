import { useEffect, useState } from "react";
import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";
import { geocodeAddress } from "@/lib/geocode";
import { MapErrorBoundary } from "@/components/MapErrorBoundary";

const GOOGLE_MAPS_KEY = (import.meta.env.VITE_GOOGLE_MAPS_BROWSER_KEY as string | undefined) ?? "";
const ADDRESS = "4008 Destination Dr Apt 2208, Osprey, FL 34229";

function FooterMapInner() {
  const { isLoaded } = useJsApiLoader({ id: "sundown-google-maps", googleMapsApiKey: GOOGLE_MAPS_KEY });
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!isLoaded) return;
    geocodeAddress(ADDRESS).then(setCoords);
  }, [isLoaded]);

  if (!isLoaded || !coords) {
    return <div className="grid h-[300px] w-full place-items-center rounded-xl bg-white/5 text-sm text-[#8ea1c2]">Loading map…</div>;
  }

  return (
    <GoogleMap
      center={coords}
      zoom={15}
      mapContainerStyle={{ width: "100%", height: "300px", borderRadius: "12px" }}
      options={{ disableDefaultUI: true, zoomControl: true, gestureHandling: "cooperative" }}
    >
      <Marker position={coords} title="Sundown Pool Care" />
    </GoogleMap>
  );
}

// Skips rendering the map until after hydration — @react-google-maps/api
// touches window/document in effects, and this component lives on SSR'd
// marketing pages, not just the ssr:false admin routes it was built for.
export function FooterMap() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="h-[300px] w-full rounded-xl bg-white/5" />;
  }

  return (
    <MapErrorBoundary className="h-[300px] w-full overflow-hidden rounded-xl">
      <FooterMapInner />
    </MapErrorBoundary>
  );
}
