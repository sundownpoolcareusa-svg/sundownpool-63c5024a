import type { CSSProperties } from "react";
import logo from "@/assets/sundown-logo-new-black.png";

export function AppLogo({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <div className="flex items-center gap-3">
      <img src={logo} alt="Sundown Pool Service" className={`h-20 w-auto ${className ?? ""}`} style={style} />
    </div>
  );
}

