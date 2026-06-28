import logoAsset from "@/assets/sundown-logo.png.asset.json";

export function DocCardHeader({ title, number }: { title: string; number: string }) {
  return (
    <div className="flex items-start justify-between">
      <img src={logoAsset.url} alt="Sundown Pool Service" className="-mt-[46px] h-44 w-auto" />
      <div className="text-right">
        <div className="text-3xl font-extrabold tracking-wider text-slate-900">{title}</div>
        <div className="text-sm font-semibold text-slate-900">{number}</div>
      </div>
    </div>
  );
}





