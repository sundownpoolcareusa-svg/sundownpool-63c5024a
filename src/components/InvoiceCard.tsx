import logoAsset from "@/assets/sundown-logo.png.asset.json";

export function DocCardHeader({ title, number }: { title: string; number: string }) {
  return (
    <div className="flex items-start justify-between">
      <div className="flex items-center gap-3">
        <div className="grid place-items-center rounded-lg bg-white p-2">
          <img src={logoAsset.url} alt="Sundown Pool Service" className="h-36 w-auto" />
        </div>

      </div>
      <div className="text-right">
        <div className="text-3xl font-extrabold tracking-wider text-[var(--brand-blue)]">{title}</div>
        <div className="text-sm font-semibold text-[var(--brand-blue)]">{number}</div>
      </div>
    </div>
  );
}

