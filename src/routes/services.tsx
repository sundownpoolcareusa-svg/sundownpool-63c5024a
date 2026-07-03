import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Phone, Menu, X, MapPin, Facebook, Instagram, ChevronDown,
  ShieldCheck, Star, UserCheck, Clock, BadgeCheck, DollarSign,
  Calendar, UserCog, FlaskConical, Waves, ArrowRight,
  Droplet, Trash2, Wrench, Grid3x3, Sparkles,
} from "lucide-react";
import logoAsset from "@/assets/sundown-logo.png.asset.json";
import heroPool from "@/assets/hero-pool.jpg";
import svcSkimmer from "@/assets/svc-skimmer.jpg";
import svcGreen from "@/assets/svc-green.jpg";
import svcFilter from "@/assets/svc-filter.jpg";
import svcRepair from "@/assets/svc-repair.jpg";
import svcWater from "@/assets/svc-water.jpg";
import svcTile from "@/assets/svc-tile.jpg";
import svcSalt from "@/assets/svc-salt.jpg";
import svcStartup from "@/assets/svc-startup.jpg";

export const Route = createFileRoute("/services")({
  component: ServicesPage,
  head: () => ({
    meta: [
      { title: "Our Pool Services — Sundown Pool Service" },
      { name: "description", content: "Weekly maintenance, green pool recovery, filter cleaning, equipment repair, water testing and more. Professional pool care in South Florida." },
    ],
  }),
});

const PHONE = "(561) 376-2428";
const PHONE_HREF = "tel:+15613762428";

const NAV = [
  { label: "HOME", href: "/" },
  { label: "SERVICES", href: "/services", active: true, hasCaret: true },
  { label: "MAINTENANCE PLANS", href: "/maintenance-plans" },
  { label: "ABOUT US", href: "/about" },
  { label: "SERVICE AREAS", href: "/#areas" },
  { label: "CONTACT", href: "/#contact" },
];

const HERO_FEATURES = [
  { icon: UserCheck, title: "Experienced Technicians", desc: "Trained professionals you can trust." },
  { icon: Clock, title: "On-Time Service", desc: "We show up when we say we will." },
  { icon: BadgeCheck, title: "Satisfaction Guaranteed", desc: "100% satisfaction every time." },
  { icon: DollarSign, title: "Upfront Pricing", desc: "No hidden fees. Honest & fair." },
];

const SERVICES = [
  { icon: Waves, img: svcSkimmer, title: "Weekly Pool Maintenance", desc: "Regular cleaning, water testing, chemical balancing, and equipment checks to keep your pool perfect." },
  { icon: Droplet, img: svcGreen, title: "Green Pool Cleanup", desc: "We remove algae and restore your pool to crystal clear quickly and safely." },
  { icon: Trash2, img: svcFilter, title: "Filter Cleaning", desc: "Deep cleaning for sand, cartridge and DE filters for maximum performance." },
  { icon: Wrench, img: svcRepair, title: "Pool Equipment Repair", desc: "Pump, heater, filter, and salt system repairs. We fix it right the first time." },
  { icon: FlaskConical, img: svcWater, title: "Water Testing & Chemical Balancing", desc: "We test your water and balance chemicals for a safe, clean and healthy pool." },
  { icon: Grid3x3, img: svcTile, title: "Pool Tile Cleaning", desc: "Remove buildup and calcium from tiles to keep your pool looking beautiful." },
  { icon: Sparkles, img: svcSalt, title: "Salt System Service", desc: "Salt cell cleaning, inspection and performance check for longer life and efficiency." },
  { icon: Waves, img: svcStartup, title: "Pool Start-Up", desc: "Opening service includes full inspection, cleaning, and balancing to get your pool ready." },
];

const HOW = [
  { step: 1, icon: Calendar, title: "SCHEDULE", desc: "Choose a service and schedule your appointment." },
  { step: 2, icon: UserCog, title: "WE INSPECT", desc: "Our technician inspects your pool and equipment." },
  { step: 3, icon: FlaskConical, title: "WE SERVICE", desc: "We clean, balance and service your pool with care." },
  { step: 4, icon: Waves, title: "YOU ENJOY", desc: "Relax and enjoy your clean, healthy, crystal-clear pool!" },
];

function ServicesPage() {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* TOP BAR */}
      <div className="bg-[#0a2547] text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2 text-xs lg:px-8">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" /> Licensed & Insured</span>
            <span className="hidden h-3 w-px bg-white/30 sm:block" />
            <span className="hidden items-center gap-1.5 sm:flex">
              <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" /> 5-Star Rated on Google
              <span className="flex">{[...Array(5)].map((_,i)=><Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400"/>)}</span>
            </span>
          </div>
          <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> Serving South Florida</span>
        </div>
      </div>

      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 lg:px-8">
          <Link to="/" className="flex items-center">
            <img src={logoAsset.url} alt="Sundown Pool Service" className="h-12 w-auto sm:h-14 lg:h-16" />
          </Link>
          <nav className="hidden items-center gap-7 lg:flex">
            {NAV.map((n) => (
              <a
                key={n.label}
                href={n.href}
                className={`flex items-center gap-1 text-[13px] font-bold tracking-wide hover:text-[#0a4d8a] ${
                  n.active ? "text-[#0a4d8a] border-b-2 border-[#0a4d8a] pb-1" : "text-slate-800"
                }`}
              >
                {n.label}
                {n.hasCaret && <ChevronDown className="h-3.5 w-3.5" />}
              </a>
            ))}
          </nav>
          <div className="hidden items-center gap-4 lg:flex">
            <a href={PHONE_HREF} className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <Phone className="h-4 w-4 text-[#0a4d8a]" /> {PHONE}
            </a>
            <a href="/#contact" className="rounded bg-[#f5b900] px-4 py-2.5 text-xs font-extrabold tracking-wide text-slate-900 hover:bg-[#e0a800]">
              GET A FREE QUOTE
            </a>
          </div>
          <button onClick={() => setOpen((v) => !v)} aria-label="Menu" className="grid h-10 w-10 place-items-center rounded-md text-slate-800 lg:hidden">
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
        {open && (
          <nav className="border-t border-slate-100 bg-white lg:hidden">
            <div className="flex flex-col px-4 py-3">
              {NAV.map((n) => (
                <a key={n.label} href={n.href} onClick={() => setOpen(false)} className="border-b border-slate-100 py-3 text-sm font-bold tracking-wide text-slate-800">
                  {n.label}
                </a>
              ))}
              <a href={PHONE_HREF} className="mt-3 flex items-center gap-2 text-sm font-bold">
                <Phone className="h-4 w-4 text-[#0a4d8a]" /> {PHONE}
              </a>
            </div>
          </nav>
        )}
      </header>

      {/* HERO */}
      <section className="relative">
        <div className="relative">
          <img src={heroPool} alt="Pool services" className="h-[560px] w-full object-cover lg:h-[520px]" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a2547]/90 via-[#0a2547]/60 to-transparent" />
          <div className="absolute inset-0">
            <div className="mx-auto flex h-full max-w-7xl flex-col justify-center px-4 py-12 lg:flex-row lg:items-center lg:px-8">
              <div className="min-w-0 flex-1 text-white lg:pr-12">
                <div className="text-xs font-bold tracking-wider text-white/80">
                  <Link to="/" className="hover:text-white">HOME</Link> <span className="mx-1.5 text-white/50">/</span> <span className="text-[#33b5c5]">SERVICES</span>
                </div>
                <h1 className="mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
                  Our Pool Services
                </h1>
                <p className="mt-3 text-xl font-extrabold text-[#33b5c5] sm:text-2xl">
                  Everything your pool needs.<br />All in one place.
                </p>
                <p className="mt-4 max-w-md text-sm leading-relaxed text-white/90 sm:text-base">
                  From weekly maintenance to green pool recovery and equipment repairs, we keep your pool clean, safe, and crystal clear year-round.
                </p>
                <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                  <a href={PHONE_HREF} className="flex items-center justify-center gap-3 rounded bg-[#f5b900] px-6 py-3 text-sm font-extrabold text-slate-900 hover:bg-[#e0a800]">
                    <Phone className="h-5 w-5" />
                    <span className="leading-tight text-left">CALL NOW<br /><span className="text-xs font-bold">{PHONE}</span></span>
                  </a>
                  <a href="/#contact" className="flex items-center justify-center gap-3 rounded border border-white/40 bg-white/5 px-6 py-3 text-sm font-extrabold text-white hover:bg-white/10">
                    <Calendar className="h-5 w-5" />
                    <span className="leading-tight text-left">GET A FREE QUOTE<br /><span className="text-xs font-bold">Fast, Easy & No Obligation</span></span>
                  </a>
                </div>
              </div>

              <div className="mt-8 w-full max-w-sm rounded-lg bg-white p-6 shadow-2xl lg:mt-0">
                <ul className="space-y-4">
                  {HERO_FEATURES.map((f) => (
                    <li key={f.title} className="flex items-start gap-3">
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-[#0a4d8a] text-[#0a4d8a]">
                        <f.icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-extrabold text-[#0a2547]">{f.title}</div>
                        <div className="text-xs text-slate-600">{f.desc}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
        <svg viewBox="0 0 1440 60" className="block h-10 w-full -mt-1 fill-white" preserveAspectRatio="none">
          <path d="M0,30 C360,80 1080,-20 1440,30 L1440,60 L0,60 Z" />
        </svg>
      </section>

      {/* SERVICES GRID */}
      <section className="bg-white py-12 lg:py-16">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="text-center">
            <h2 className="text-2xl font-extrabold tracking-wide text-[#0a2547] sm:text-3xl">OUR POOL SERVICES</h2>
            <div className="mx-auto mt-2 h-0.5 w-12 bg-[#33b5c5]" />
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {SERVICES.map((s) => (
              <div key={s.title} className="relative overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition hover:shadow-lg">
                <div className="relative h-44 overflow-hidden">
                  <img src={s.img} alt={s.title} loading="lazy" className="h-full w-full object-cover" />
                  <div className="absolute left-1/2 top-3 grid h-12 w-12 -translate-x-1/2 place-items-center rounded-full bg-[#0a2547] shadow-lg">
                    <s.icon className="h-5 w-5 text-white" />
                  </div>
                </div>
                <div className="p-5 text-center">
                  <h3 className="text-base font-extrabold text-[#0a2547]">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{s.desc}</p>
                  <a href="/#contact" className="mt-4 inline-flex items-center gap-1 text-xs font-extrabold tracking-wide text-[#0a4d8a] hover:text-[#0a2547]">
                    LEARN MORE <ArrowRight className="h-3 w-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>

          {/* CUSTOM BANNER */}
          <div className="mt-10 overflow-hidden rounded-lg bg-[#0a4d8a]">
            <div className="relative flex flex-col items-center justify-between gap-4 px-6 py-5 sm:flex-row">
              <div className="flex items-center gap-4">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full border-2 border-white/40">
                  <ShieldCheck className="h-6 w-6 text-white" />
                </div>
                <div className="text-white">
                  <div className="text-base font-extrabold sm:text-lg">Need a custom service or not sure what you need?</div>
                  <div className="text-sm text-white/85">Our experts are here to help.</div>
                </div>
              </div>
              <a href="/#contact" className="flex shrink-0 items-center gap-2 rounded bg-[#f5b900] px-5 py-3 text-xs font-extrabold tracking-wide text-slate-900 hover:bg-[#e0a800]">
                GET A FREE QUOTE <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="bg-white pb-14 lg:pb-20">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="text-center">
            <h2 className="text-2xl font-extrabold tracking-wide text-[#0a2547] sm:text-3xl">HOW IT WORKS</h2>
            <div className="mx-auto mt-2 h-0.5 w-12 bg-[#33b5c5]" />
          </div>
          <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {HOW.map((s, i) => (
              <div key={s.title} className="relative flex flex-col items-center text-center">
                <div className="flex items-center gap-4">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#0a4d8a] text-sm font-extrabold text-white">{s.step}</div>
                  <div className="grid h-20 w-20 place-items-center rounded-full border-2 border-slate-200">
                    <s.icon className="h-9 w-9 text-[#0a4d8a]" strokeWidth={1.5} />
                  </div>
                </div>
                <h3 className="mt-4 text-sm font-extrabold tracking-wide text-[#0a2547]">{s.title}</h3>
                <p className="mt-1 max-w-[200px] text-xs leading-relaxed text-slate-600">{s.desc}</p>
                {i < HOW.length - 1 && (
                  <ChevronDown className="absolute -right-2 top-12 hidden h-6 w-6 -rotate-90 text-slate-300 lg:block" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#0a2547] py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 lg:flex-row lg:px-8">
          <div className="flex items-center gap-4 text-white">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#0a4d8a]">
              <Phone className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="text-base font-extrabold">READY FOR A CLEAN, HEALTHY POOL?</div>
              <div className="text-sm text-white/85">Call us today or request your free quote online.</div>
            </div>
          </div>
          <a href={PHONE_HREF} className="flex items-center gap-2 text-lg font-extrabold text-white">
            <Phone className="h-5 w-5" /> {PHONE}
          </a>
          <a href="/#contact" className="flex items-center gap-2 rounded bg-[#f5b900] px-5 py-3 text-xs font-extrabold tracking-wide text-slate-900 hover:bg-[#e0a800]">
            GET A FREE QUOTE <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#0a2547] text-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-5 lg:px-8">
          <div>
            <img src="/sundown-logo-white.png" alt="Sundown Pool Service" className="h-20 w-auto" />
            <p className="mt-4 text-sm text-white/80">
              Professional pool cleaning, maintenance, and repairs. We keep your pool perfect, so you can enjoy what matters most.
            </p>
            <div className="mt-4 flex items-center gap-3">
              <a href="#" aria-label="Facebook" className="grid h-8 w-8 place-items-center rounded-full bg-white/10 hover:bg-white/20"><Facebook className="h-4 w-4" /></a>
              <a href="#" aria-label="Instagram" className="grid h-8 w-8 place-items-center rounded-full bg-white/10 hover:bg-white/20"><Instagram className="h-4 w-4" /></a>
              <a href="#" aria-label="Google" className="grid h-8 w-8 place-items-center rounded-full bg-white/10 text-sm font-extrabold hover:bg-white/20">G</a>
              <a href="#" aria-label="Yelp" className="grid h-8 w-8 place-items-center rounded-full bg-white/10 text-sm font-extrabold hover:bg-white/20">y</a>
            </div>
          </div>
          <div>
            <h4 className="text-sm font-extrabold tracking-wide">QUICK LINKS</h4>
            <ul className="mt-3 space-y-2 text-sm text-white/80">
              <li><Link to="/" className="hover:text-white">Home</Link></li>
              <li><Link to="/services" className="hover:text-white">Services</Link></li>
              <li><Link to="/maintenance-plans" className="hover:text-white">Maintenance Plans</Link></li>
              <li><Link to="/about" className="hover:text-white">About Us</Link></li>
              <li><a href="/#contact" className="hover:text-white">Contact Us</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-extrabold tracking-wide">SERVICE AREAS</h4>
            <ul className="mt-3 space-y-2 text-sm text-white/80">
              {["Osprey", "Sarasota", "Venice", "Nokomis", "Siesta Key", "And Surrounding Areas"].map((c) => (
                <li key={c} className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-sky-400" /> {c}</li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-extrabold tracking-wide">CONTACT US</h4>
            <ul className="mt-3 space-y-2 text-sm text-white/80">
              <li className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-sky-400" /> {PHONE}</li>
              <li className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-sky-400" /> hello@sundownpoolservice.com</li>
              <li className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-sky-400" /> South Florida</li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-extrabold tracking-wide">LICENSED & INSURED</h4>
            <div className="mt-3 flex items-start gap-3">
              <ShieldCheck className="h-8 w-8 shrink-0 text-sky-400" strokeWidth={1.5} />
              <p className="text-sm text-white/80">We are fully licensed and insured for your peace of mind.</p>
            </div>
            <Link to="/auth" className="mt-4 inline-block text-xs text-white/50 hover:text-white">Staff Login →</Link>
          </div>
        </div>
        <div className="border-t border-white/10">
          <div className="mx-auto max-w-7xl px-4 py-4 text-center text-xs text-white/60 lg:px-8">
            © {new Date().getFullYear()} Sundown Pool Service. All Rights Reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

export default ServicesPage;
