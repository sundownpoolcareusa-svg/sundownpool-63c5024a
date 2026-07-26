let loaderPromise: Promise<any> | null = null;

export function loadGoogleMaps(): Promise<any> {
  if (typeof window === "undefined") return Promise.reject(new Error("SSR"));
  if ((window as any).google?.maps?.places) return Promise.resolve((window as any).google);
  if (loaderPromise) return loaderPromise;

  const key = import.meta.env.VITE_GOOGLE_MAPS_BROWSER_KEY;
  const channel = import.meta.env.VITE_GOOGLE_MAPS_TRACKING_ID;
  if (!key) return Promise.reject(new Error("Google Maps API key não configurada"));

  loaderPromise = new Promise((resolve, reject) => {
    (window as any).__initGmaps = () => resolve((window as any).google);
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&loading=async&libraries=places&callback=__initGmaps${channel ? `&channel=${channel}` : ""}`;
    s.async = true;
    s.onerror = () => reject(new Error("Falha ao carregar Google Maps"));
    document.head.appendChild(s);
  });
  return loaderPromise;
}
