import logoAsset from "@/assets/sundown-logo.png.asset.json";

export function AppLogo({ className }: { className?: string }) {
  return (
    <div className="flex items-center gap-3">
      <img src={logoAsset.url} alt="Sundown Pool Service" className={`h-20 w-auto ${className ?? ""}`} />
    </div>
  );
}

