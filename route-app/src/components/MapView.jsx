// MapView — placeholder map component.
//
// This renders a stylized static "map" (CSS grid + SVG) with numbered stop
// markers, place-name labels and a route line, so the rest of the app can be
// built and used today without a Google Maps API key.
//
// TODO(google-maps): once we have a Google Maps API key, replace the inside
// of this component with @react-google-maps/api's <GoogleMap>, <Marker> and
// <Polyline>, reading from the SAME props (stops, currentLocation, route)
// that are already wired up everywhere this component is used. Nothing
// outside this file should need to change.
import { Home, Plus, Minus, LocateFixed } from "lucide-react";

function markerColor(status) {
  if (status === "completed") return "#16A34A";
  if (status === "current") return "#2563EB";
  return "#94A3B8";
}

/**
 * @param {{ stops?: any[], currentLocation?: any, route?: boolean, labels?: {text:string,x:number,y:number}[], zoomControls?: boolean, className?: string, style?: React.CSSProperties }} props
 */
export function MapView({ stops = [], currentLocation, route = true, labels = [], zoomControls = false, className = "", style }) {
  const ordered = [...stops].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const points = ordered.map((s) => `${s.mapX},${s.mapY}`).join(" ");

  return (
    <div
      className={`relative w-full overflow-hidden rounded-2xl border border-[var(--dash-border)] ${className}`}
      style={{ background: "linear-gradient(160deg, #EAF3E8 0%, #E4F0F5 55%, #DCEAF4 100%)", ...style }}
    >
      <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
        <defs>
          <pattern id="mapGrid" width="7%" height="9%" patternUnits="userSpaceOnUse">
            <path d="M 0 0 L 0 100 M 0 0 L 100 0" stroke="#D3E2DC" strokeWidth="1" fill="none" opacity="0.7" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#mapGrid)" />
        {/* stand-ins for coastline/roads, purely decorative */}
        <path d="M 0 8 C 12 20, 8 55, 22 100" stroke="#BEDDEE" strokeWidth="7" fill="none" opacity="0.8" />
        <path d="M 5 0 C 35 25, 30 50, 60 60 S 80 90, 100 95" stroke="#F2E7C4" strokeWidth="3.5" fill="none" opacity="0.7" />
        <path d="M 60 0 C 55 30, 70 45, 65 100" stroke="#F2E7C4" strokeWidth="3" fill="none" opacity="0.6" />
      </svg>

      {labels.map((l) => (
        <span
          key={l.text}
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap text-[10px] font-semibold uppercase tracking-wide text-[var(--dash-text-muted-2)]"
          style={{ left: `${l.x}%`, top: `${l.y}%` }}
        >
          {l.text}
        </span>
      ))}

      {route && ordered.length > 1 && (
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <polyline
            points={points}
            fill="none"
            stroke="#2563EB"
            strokeWidth="0.9"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.8"
          />
        </svg>
      )}

      {ordered.map((s) => (
        <div
          key={s.id}
          className="absolute grid h-7 w-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-white text-[11px] font-bold text-white shadow-md"
          style={{ left: `${s.mapX}%`, top: `${s.mapY}%`, background: markerColor(s.status) }}
          title={s.clientName}
        >
          {s.order}
        </div>
      ))}

      {currentLocation && (
        <div
          className="absolute -translate-x-1/2 -translate-y-full"
          style={{ left: `${currentLocation.mapX}%`, top: `${currentLocation.mapY}%` }}
          title="Localização atual"
        >
          <svg width="34" height="42" viewBox="0 0 34 42" fill="none" className="absolute inset-0">
            <path
              d="M17 0C7.6 0 0 7.6 0 17c0 12 17 25 17 25s17-13 17-25C34 7.6 26.4 0 17 0Z"
              fill="var(--dash-navy)"
              stroke="white"
              strokeWidth="2"
            />
          </svg>
          <div className="relative grid h-[34px] w-[34px] place-items-center">
            <Home className="h-[16px] w-[16px] text-white" />
          </div>
        </div>
      )}

      <button
        className="absolute bottom-3 right-3 grid h-9 w-9 place-items-center rounded-full bg-white text-[var(--dash-navy)] shadow-md"
        title="Minha localização"
      >
        <LocateFixed className="h-4 w-4" />
      </button>

      {zoomControls && (
        <div className="absolute right-3 top-3 flex flex-col overflow-hidden rounded-lg border border-[var(--dash-border)] bg-white shadow-md">
          <button className="grid h-8 w-8 place-items-center border-b border-[var(--dash-border)] text-[var(--dash-text-secondary)]">
            <Plus className="h-3.5 w-3.5" />
          </button>
          <button className="grid h-8 w-8 place-items-center text-[var(--dash-text-secondary)]">
            <Minus className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
