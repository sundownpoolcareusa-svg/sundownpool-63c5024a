// MapView — placeholder map component.
//
// This renders a stylized static "map" (CSS grid + SVG) with numbered stop
// markers and a route line, so the rest of the app can be built and used
// today without a Google Maps API key.
//
// TODO(google-maps): once we have a Google Maps API key, replace the inside
// of this component with @react-google-maps/api's <GoogleMap>, <Marker> and
// <Polyline>, reading from the SAME props (stops, currentLocation, route)
// that are already wired up everywhere this component is used. Nothing
// outside this file should need to change.
import { Home } from "lucide-react";

function markerColor(status) {
  if (status === "completed") return "#16A34A";
  if (status === "current") return "#2563EB";
  return "#94A3B8";
}

/**
 * @param {{ stops?: any[], currentLocation?: any, route?: boolean, className?: string, style?: React.CSSProperties }} props
 */
export function MapView({ stops = [], currentLocation, route = true, className = "", style }) {
  const ordered = [...stops].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const points = ordered.map((s) => `${s.mapX},${s.mapY}`).join(" ");

  return (
    <div
      className={`relative w-full overflow-hidden rounded-2xl border border-[var(--dash-border)] bg-[#E9F1F6] ${className}`}
      style={style}
    >
      <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
        <defs>
          <pattern id="mapGrid" width="8%" height="10%" patternUnits="userSpaceOnUse">
            <path d="M 0 0 L 0 100 M 0 0 L 100 0" stroke="#D6E3EA" strokeWidth="1" fill="none" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#mapGrid)" />
        {/* stand-ins for coastline/roads, purely decorative */}
        <path d="M 0 85 C 20 75, 40 90, 100 60" stroke="#CBDEE8" strokeWidth="6" fill="none" opacity="0.6" />
        <path d="M 10 0 C 30 30, 20 55, 50 100" stroke="#D9E7ED" strokeWidth="3" fill="none" opacity="0.5" />
      </svg>

      {route && ordered.length > 1 && (
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <polyline
            points={points}
            fill="none"
            stroke="#2563EB"
            strokeWidth="0.7"
            strokeDasharray="2.2 1.6"
            strokeLinecap="round"
            opacity="0.75"
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
          className="absolute grid h-9 w-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-white shadow-lg"
          style={{ left: `${currentLocation.mapX}%`, top: `${currentLocation.mapY}%`, background: "var(--dash-navy)" }}
          title="Localização atual"
        >
          <Home className="h-4 w-4 text-white" />
        </div>
      )}
    </div>
  );
}
