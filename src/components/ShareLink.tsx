import { useState } from "react";
import { toast } from "sonner";
import { Link2, X, Copy, Mail, MessageCircle } from "lucide-react";

export function useShareLink() {
  const [url, setUrl] = useState<string | null>(null);
  const [label, setLabel] = useState<string>("Share link");

  const share = async (linkUrl: string, sharedLabel = "Share link") => {
    setLabel(sharedLabel);
    // Try native clipboard, fall back to modal for iframes/permissions-blocked contexts
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(linkUrl);
        toast.success("Link copied! Share with client.");
        setUrl(linkUrl); // still show modal for quick email/whatsapp actions
        return;
      }
      throw new Error("clipboard unavailable");
    } catch {
      setUrl(linkUrl);
    }
  };

  const close = () => setUrl(null);

  const modal = url ? (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={close}>
      <div className="w-full max-w-md rounded-xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b px-5 py-3">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2"><Link2 className="h-4 w-4 text-[var(--brand-blue)]" /> {label}</h3>
          <button onClick={close} className="text-slate-400 hover:text-slate-700"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-5">
          <p className="text-sm text-slate-600">Anyone with this link can view the document.</p>
          <div className="mt-3 flex gap-2">
            <input
              readOnly
              value={url}
              onFocus={(e) => e.currentTarget.select()}
              className="flex-1 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
            />
            <button
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(url);
                  toast.success("Link copied!");
                } catch {
                  // manual copy — prompt select
                  toast.info("Long-press or Ctrl+C to copy the link.");
                }
              }}
              className="flex items-center gap-1 rounded-md bg-[var(--brand-blue)] px-3 py-2 text-sm font-semibold text-white"
            >
              <Copy className="h-4 w-4" /> Copy
            </button>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <a
              href={`mailto:?subject=${encodeURIComponent(label)}&body=${encodeURIComponent(url)}`}
              className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Mail className="h-4 w-4 text-[var(--brand-blue)]" /> Email
            </a>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(url)}`}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <MessageCircle className="h-4 w-4 text-green-600" /> WhatsApp
            </a>
          </div>
        </div>
      </div>
    </div>
  ) : null;

  return { share, modal };
}
