import { X } from "lucide-react";
import { type ReactNode } from "react";

export function Modal({
  open, onClose, title, subtitle, headerAction, children, maxWidth = "max-w-2xl", closeOnOverlayClick = true, fullScreenOnMobile = false,
}: {
  open: boolean; onClose: () => void; title: string; subtitle?: string; headerAction?: ReactNode; children: ReactNode; maxWidth?: string;
  closeOnOverlayClick?: boolean;
  // Covers the entire viewport on phones (like a bottom sheet dragged all
  // the way up) instead of floating as a small centered box — reverts to
  // the normal centered dialog at the sm breakpoint and up.
  fullScreenOnMobile?: boolean;
}) {
  if (!open) return null;
  return (
    <div
      className={`dash fixed inset-0 z-50 bg-black/40 ${fullScreenOnMobile ? "sm:grid sm:place-items-center sm:p-4" : "grid place-items-center p-4"}`}
      onClick={closeOnOverlayClick ? onClose : undefined}
    >
      <div
        className={`flex w-full min-w-0 flex-col bg-white ${maxWidth} ${
          fullScreenOnMobile ? "h-full rounded-none sm:h-auto sm:max-h-[85vh] sm:rounded-[22px]" : "rounded-[22px]"
        }`}
        style={{ boxShadow: "0 30px 90px rgba(10,20,40,.4)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {fullScreenOnMobile && (
          <div className="flex shrink-0 justify-center pt-2.5 sm:hidden">
            <div className="h-1.5 w-10 rounded-full bg-[var(--dash-border)]" />
          </div>
        )}
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--dash-border)] px-6 py-4">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-[var(--dash-text)]">{title}</h2>
            {subtitle && <p className="text-xs font-medium text-[var(--dash-text-muted)]">{subtitle}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-3">
            {headerAction}
            <button onClick={onClose} className="text-[var(--dash-text-muted)] hover:text-[var(--dash-text-secondary)]"><X className="h-5 w-5" /></button>
          </div>
        </div>
        <div className={`min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-6 ${fullScreenOnMobile ? "" : "max-h-[75vh]"}`}>{children}</div>
      </div>
    </div>
  );
}
