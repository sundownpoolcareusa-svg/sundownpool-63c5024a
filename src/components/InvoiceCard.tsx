import logoAsset from "@/assets/sundown-logo.png.asset.json";

export function DocCardHeader({ title, number }: { title: string; number: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <img src={logoAsset.url} alt="Sundown Pool Service" className="-mt-2 h-28 w-auto sm:-mt-3 sm:h-36" />
      <div className="text-right">
        <div className="text-2xl font-extrabold tracking-wider text-slate-900 sm:text-3xl">{title}</div>
        <div className="text-xs font-semibold text-slate-900 sm:text-sm">{number}</div>
      </div>
    </div>
  );
}





