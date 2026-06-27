import logoAsset from "@/assets/sundown-logo.png.asset.json";

export function AppLogo() {
  return (
    <div className="flex items-center gap-3">
      <img src={logoAsset.url} alt="Sundown Pool Service" className="h-12 w-auto" />
    </div>
  );
}
