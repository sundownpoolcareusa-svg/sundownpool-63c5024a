import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

export function PageHeader({ title, action, onBack }: { title: string; action?: ReactNode; onBack?: () => void }) {
  const navigate = useNavigate();
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-[var(--dash-border)] bg-[var(--dash-navy)] px-4 py-3.5 text-white">
      <button onClick={() => (onBack ? onBack() : navigate(-1))} aria-label="Voltar">
        <ArrowLeft className="h-5 w-5" />
      </button>
      <h1 className="text-base font-bold">{title}</h1>
      <div className="min-w-[24px] text-right text-sm font-semibold">{action}</div>
    </header>
  );
}
