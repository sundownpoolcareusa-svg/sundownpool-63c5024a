import { Link } from "react-router-dom";
import { Calendar, Menu, X, Phone } from "lucide-react";
import { useState } from "react";
import logo from "@/assets/sundown-logo-new-black.png";

const PHONE = "(561) 376-2428";
const PHONE_HREF = "tel:+15613762428";

const NAV = [
  { label: "HOME", to: "/" },
  { label: "SERVICES", to: "/services" },
  { label: "MAINTENANCE PLANS", to: "/maintenance-plans" },
  { label: "ABOUT US", to: "/about" },
  { label: "SERVICE AREAS", to: "/service-areas" },
  { label: "CONTACT", to: "/#quote" },
] as const;

export function SiteHeader({ active }: { active?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <header className="relative z-20 border-b border-[#eef2f7] bg-white">
      <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-5 px-5 py-1 md:px-7">
        <Link to="/" className="flex items-center">
          <img src={logo} alt="Sundown Pool Care" className="h-[55px] w-auto" />
        </Link>

        <nav className="hidden items-center gap-6 lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.label}
              to={item.to}
              className="whitespace-nowrap py-1.5 font-display text-[13.5px] font-semibold tracking-[.2px] text-brand-navy transition-colors hover:text-brand-blue"
              style={{ color: active === item.label ? "var(--brand-blue)" : undefined }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <a
            href={PHONE_HREF}
            className="hidden items-center gap-2 font-display text-[17px] font-bold text-brand-navy md:inline-flex"
          >
            <Phone className="h-4 w-4 text-brand-blue" />
            {PHONE}
          </a>
          <a
            href="/#quote"
            className="hidden items-center gap-2 rounded-lg bg-brand-yellow px-4 py-2.5 font-display text-[13px] font-bold text-brand-navy-deep md:inline-flex"
          >
            <Calendar className="h-4 w-4" />
            GET A FREE QUOTE
          </a>
          <button
            onClick={() => setOpen((v) => !v)}
            className="rounded-md p-2 text-brand-navy lg:hidden"
            aria-label="Toggle menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-[#eef2f7] bg-white lg:hidden">
          <div className="mx-auto flex max-w-[1180px] flex-col px-5 py-3">
            {NAV.map((item) => (
              <Link
                key={item.label}
                to={item.to}
                onClick={() => setOpen(false)}
                className="border-b border-[#eef2f7] py-3 font-display text-[13.5px] font-semibold text-brand-navy"
              >
                {item.label}
              </Link>
            ))}
            <a
              href="/#quote"
              onClick={() => setOpen(false)}
              className="mt-3 inline-flex items-center justify-center gap-2 rounded-lg bg-brand-yellow px-4 py-3 font-display text-[13px] font-bold text-brand-navy-deep"
            >
              <Calendar className="h-4 w-4" />
              GET A FREE QUOTE
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
