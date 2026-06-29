import logoAsset from "@/assets/sundown-logo.png.asset.json";

export function DocCardHeader({ title, number }: { title: string; number: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <img src={logoAsset.url} alt="Sundown Pool Service" className="h-14 w-auto sm:h-16" />
      <div className="text-right">
        <div className="text-2xl font-extrabold tracking-wider text-slate-900 sm:text-3xl">{title}</div>
        <div className="text-xs font-semibold text-slate-900 sm:text-sm">{number}</div>
      </div>
    </div>
  );
}





