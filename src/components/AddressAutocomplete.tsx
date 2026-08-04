import { useEffect, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import { loadGoogleMaps } from "@/lib/googleMapsLoader";

type Suggestion = { id: string; text: string; placeId: string };

export function AddressAutocomplete({
  value,
  onChange,
  onSelectPlace,
  label = "Address",
}: {
  value: string;
  onChange: (v: string) => void;
  onSelectPlace?: (p: { address: string; city: string; state: string; zip: string; lat?: number; lng?: number }) => void;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Suggestion[]>([]);
  const sessionRef = useRef<any>(null);
  const placesRef = useRef<any>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    loadGoogleMaps()
      .then(async (g) => {
        const places: any = await g.maps.importLibrary("places");
        placesRef.current = places;
        sessionRef.current = new places.AutocompleteSessionToken();
      })
      .catch((e) => console.error("AddressAutocomplete: failed to load Google Places", e));
  }, []);

  function handleInput(v: string) {
    onChange(v);
    if (timerRef.current) window.clearTimeout(timerRef.current);
    if (!v.trim() || !placesRef.current) {
      setItems([]);
      setOpen(false);
      return;
    }
    timerRef.current = window.setTimeout(async () => {
      try {
        const { suggestions } = await placesRef.current.AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: v,
          sessionToken: sessionRef.current,
        });
        const mapped: Suggestion[] = (suggestions || [])
          .map((s: any) => s.placePrediction)
          .filter(Boolean)
          .map((p: any) => ({
            id: p.placeId,
            placeId: p.placeId,
            text: p.text?.toString?.() ?? "",
          }));
        setItems(mapped);
        setOpen(mapped.length > 0);
      } catch (e) {
        console.error("AddressAutocomplete: failed to fetch suggestions", e);
        setItems([]);
        setOpen(false);
      }
    }, 200);
  }

  async function pick(s: Suggestion) {
    setOpen(false);
    try {
      const place = new placesRef.current.Place({ id: s.placeId });
      await place.fetchFields({ fields: ["formattedAddress", "addressComponents", "location"] });
      const comps = place.addressComponents || [];
      const get = (type: string, short = false) => {
        const c = comps.find((c: any) => c.types?.includes(type));
        return (short ? c?.shortText : c?.longText) || "";
      };
      const streetNumber = get("street_number");
      const route = get("route");
      const street = [streetNumber, route].filter(Boolean).join(" ");
      const city = get("locality") || get("postal_town") || get("administrative_area_level_2");
      const state = get("administrative_area_level_1", true);
      const zip = get("postal_code");
      const address = street || (place.formattedAddress || s.text).split(",")[0];
      const lat = typeof place.location?.lat === "function" ? place.location.lat() : place.location?.lat;
      const lng = typeof place.location?.lng === "function" ? place.location.lng() : place.location?.lng;
      onChange(address);
      onSelectPlace?.({ address, city, state, zip, lat, lng });
      sessionRef.current = new placesRef.current.AutocompleteSessionToken();
    } catch (e) {
      console.error("AddressAutocomplete: failed to fetch place details", e);
      onChange(s.text);
    }
  }

  return (
    <div className="relative">
      <label className="text-[11px] font-bold uppercase tracking-[.07em] text-[var(--dash-text-secondary-2)]">{label}</label>
      <div className="relative mt-1">
        <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--dash-text-muted)]" />
        <input
          value={value}
          onChange={(e) => handleInput(e.target.value)}
          onFocus={() => items.length && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Start typing the address..."
          className="w-full rounded-[10px] border border-[var(--dash-border-input)] py-2 pl-9 pr-3 text-sm"
        />
      </div>
      {open && (
        <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-[10px] border border-[var(--dash-border)] bg-white shadow-lg">
          {items.map((s) => (
            <li
              key={s.id}
              onMouseDown={(e) => { e.preventDefault(); pick(s); }}
              className="cursor-pointer px-3 py-2 text-sm hover:bg-[var(--dash-bg)]"
            >
              {s.text}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
