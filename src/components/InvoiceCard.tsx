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

type BusinessInfo = {
  company_name?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  phone?: string | null;
} | null | undefined;

// Falls back to the original hardcoded Sundown Pool Care / Effect Up LLC
// details whenever the issuing account has no business_profiles row yet —
// keeps every existing invoice/estimate unchanged until an owner (or a
// second, unrelated business using the same app) fills their own info in.
export function BusinessInfoBlock({ business }: { business: BusinessInfo }) {
  const cityLine = [business?.city, business?.state].filter(Boolean).join(", ") + (business?.zip ? ` ${business.zip}` : "");
  return (
    <div className="space-y-1 text-[var(--dash-text-secondary)]">
      <div className="font-bold text-[var(--dash-text)]">{business?.company_name || "Effect Up LLC"}</div>
      <div>{business?.address || "4008 Destination Dr Apt 2208"}</div>
      <div>{business?.city ? cityLine : "Osprey, FL 34229"}</div>
      <div>{business?.phone || "(561) 376-2428"}</div>
    </div>
  );
}





