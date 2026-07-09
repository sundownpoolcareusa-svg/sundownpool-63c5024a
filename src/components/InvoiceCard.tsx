import logoAsset from "@/assets/sundown-logo.png.asset.json";

export function DocCardHeader({ title, number }: { title: string; number: string }) {
  return (
    <div className="dash flex items-start justify-between gap-3">
      <img src={logoAsset.url} alt="Sundown Pool Service" className="h-14 w-auto sm:h-16" />
      <div className="text-right">
        <div className="text-[28px] font-extrabold uppercase tracking-[.02em] text-[var(--dash-text)] sm:text-[30px]">{title}</div>
        <div className="text-xs font-semibold text-[var(--dash-text-secondary)] sm:text-sm">{number}</div>
      </div>
    </div>
  );
}





