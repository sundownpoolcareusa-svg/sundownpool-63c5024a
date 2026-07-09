import { X } from "lucide-react";
import { type ReactNode } from "react";

export function Modal({
  open, onClose, title, children, maxWidth = "max-w-2xl", closeOnOverlayClick = true,
}: { open: boolean; onClose: () => void; title: string; children: ReactNode; maxWidth?: string; closeOnOverlayClick?: boolean }) {
  if (!open) return null;
  return (
    <div className="dash fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={closeOnOverlayClick ? onClose : undefined}>
      <div
        className={`w-full ${maxWidth} rounded-[22px] bg-white`}
        style={{ boxShadow: "0 30px 90px rgba(10,20,40,.4)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--dash-border)] px-6 py-4">
          <h2 className="text-lg font-bold text-[var(--dash-text)]">{title}</h2>
          <button onClick={onClose} className="text-[var(--dash-text-muted)] hover:text-[var(--dash-text-secondary)]"><X className="h-5 w-5" /></button>
        </div>
        <div className="max-h-[75vh] overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );
}
