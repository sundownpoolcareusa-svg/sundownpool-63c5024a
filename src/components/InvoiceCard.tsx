import logo from "@/assets/sundown-logo-new-black.png";

export function DocCardHeader({ title, number }: { title: string; number: string }) {
  return (
    <div className="dash flex flex-col items-start gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
      <img src={logo} alt="Sundown Pool Service" className="h-12 w-auto sm:h-16" />
      <div className="text-left sm:text-right">
        <div className="text-[22px] font-extrabold uppercase tracking-[.02em] text-[var(--dash-text)] sm:text-[30px]">{title}</div>
        <div className="text-xs font-semibold text-[var(--dash-text-secondary)] sm:text-sm">{number}</div>
      </div>
    </div>
  );
}





