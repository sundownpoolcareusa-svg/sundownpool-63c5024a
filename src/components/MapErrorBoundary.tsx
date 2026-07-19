import { Component, type ReactNode } from "react";
import { MapPin } from "lucide-react";
import { reportLovableError } from "@/lib/lovable-error-reporting";

// Google Maps' loader/renderer is the most fragile part of these pages (real
// devices sometimes hit transient script-load or SDK races) — isolate it so
// a failure there degrades to "map unavailable" instead of crashing the
// whole route screen.
export class MapErrorBoundary extends Component<{ children: ReactNode; className?: string }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error) {
    reportLovableError(error, { boundary: "route_map" });
  }
  render() {
    if (this.state.error) {
      return (
        <div className={`grid h-56 w-full place-items-center rounded-2xl border border-[var(--dash-border)] bg-[var(--dash-surface-soft)] text-center lg:h-[360px] ${this.props.className ?? ""}`}>
          <div className="px-4">
            <MapPin className="mx-auto h-8 w-8 text-[var(--dash-text-muted)]" />
            <p className="mt-2 text-sm text-[var(--dash-text-muted)]">Map unavailable right now.</p>
            <p className="mt-1 break-words text-[11px] text-[var(--dash-text-muted)]">{this.state.error.message}</p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
