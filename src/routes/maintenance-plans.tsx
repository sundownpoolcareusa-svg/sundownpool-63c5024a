import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Phone, Calendar, FlaskConical, Wrench, ShieldCheck, Check, Menu, X, MapPin,
  Mail, Facebook, Instagram, ChevronDown, Clock, ThumbsUp, MessageCircle,
  Waves, ArrowRight, Gem, ClipboardList,
} from "lucide-react";
import logoAsset from "@/assets/sundown-logo.png.asset.json";
import heroPool from "@/assets/hero-pool.jpg";

export const Route = createFileRoute("/maintenance-plans")({
  component: MaintenancePlansPage,
  head: () => ({
    meta: [
      { title: "Maintenance Plans — Sundown Pool Service" },
      { name: "description", content: "Simple weekly, bi-weekly and monthly pool maintenance plans. Professional care, crystal-clear water, and worry-free service in South Florida." },
    ],
  }),
});

const PHONE = "(561) 376-2428";
const PHONE_HREF = "tel:+15613762428";

const NAV = [
  { label: "HOME", href: "/" },
  { label: "SERVICES", href: "/#services" },
  { label: "MAINTENANCE PLANS", href: "/maintenance-plans", active: true },
  { label: "ABOUT US", href: "/#about" },
  { label: "SERVICE AREAS", href: "/#areas" },
  { label: "CONTACT", href: "/#contact" },
];

const WHY_CHOOSE = [
  "Consistent, professional care",
  "Prevent costly repairs",
  "Healthy, crystal-clear water",
  "Licensed & Insured Technicians",
  "100% Satisfaction Guaranteed",
];

const HERO_BADGES = [
  { icon: Calendar, label: "Reliable", sub: "Scheduling" },
  { icon: FlaskConical, label: "Chemical", sub: "Balance" },
  { icon: Wrench, label: "Equipment", sub: "Check" },
  { icon: ShieldCheck, label: "Peace of", sub: "Mind" },
];

const TABS = ["WEEKLY", "BI-WEEKLY", "MONTHLY"] as const;

const PRICING = {
  WEEKLY: [
    {
      name: "BASIC PLAN",
      price: "$99",
      desc: "Perfect for pools that are in good condition.",
      features: [
        "Skim surface",
        "Vacuum pool",
        "Brush walls",
        "Empty skimmer & pump basket",
        "Check & adjust chemicals",
        "Equipment check",
      ],
      cta: "CHOOSE PLAN",
      color: "teal",
      icon: Waves,
    },
    {
      name: "STANDARD PLAN",
      price: "$129",
      desc: "Our most popular plan for complete pool care.",
      features: [
        "Everything in Basic Plan",
        "Test & balance chemicals",
        "Clean tile line",
        "Inspect filter & equipment",
        "Backwash filter (as needed)",
        "Check salt system (if applicable)",
        "Report of service",
      ],
      cta: "CHOOSE PLAN",
      color: "navy",
      icon: Waves,
      popular: true,
    },
    {
      name: "PREMIUM PLAN",
      price: "$169",
      desc: "Maximum care for a perfectly maintained pool.",
      features: [
        "Everything in Standard Plan",
        "Filter cleaning (as needed)",
        "Salt cell cleaning (as needed)",
        "Equipment deep inspection",
        "Water level check & adjust",
        "Priority service",
        "15% off repairs",
      ],
      cta: "CHOOSE PLAN",
      color: "teal",
      icon: Gem,
    },
  ],
  "BI-WEEKLY": [
    {
      name: "BASIC PLAN",
      price: "$79",
      desc: "Perfect for pools that are in good condition.",
      features: [
        "Skim surface",
        "Vacuum pool",
        "Brush walls",
        "Empty skimmer & pump basket",
        "Check & adjust chemicals",
        "Equipment check",
      ],
      cta: "CHOOSE PLAN",
      color: "teal",
      icon: Waves,
    },
    {
      name: "STANDARD PLAN",
      price: "$99",
      desc: "Our most popular plan for complete pool care.",
      features: [
        "Everything in Basic Plan",
        "Test & balance chemicals",
        "Clean tile line",
        "Inspect filter & equipment",
        "Backwash filter (as needed)",
        "Check salt system (if applicable)",
        "Report of service",
      ],
      cta: "CHOOSE PLAN",
      color: "navy",
      icon: Waves,
      popular: true,
    },
    {
      name: "PREMIUM PLAN",
      price: "$129",
      desc: "Maximum care for a perfectly maintained pool.",
      features: [
        "Everything in Standard Plan",
        "Filter cleaning (as needed)",
        "Salt cell cleaning (as needed)",
        "Equipment deep inspection",
        "Water level check & adjust",
        "Priority service",
        "15% off repairs",
      ],
      cta: "CHOOSE PLAN",
      color: "teal",
      icon: Gem,
    },
  ],
  MONTHLY: [
    {
      name: "BASIC PLAN",
      price: "$59",
      desc: "Perfect for pools that are in good condition.",
      features: [
        "Skim surface",
        "Vacuum pool",
        "Brush walls",
        "Empty skimmer & pump basket",
        "Check & adjust chemicals",
        "Equipment check",
      ],
      cta: "CHOOSE PLAN",
      color: "teal",
      icon: Waves,
    },
    {
      name: "STANDARD PLAN",
      price: "$79",
      desc: "Our most popular plan for complete pool care.",
      features: [
        "Everything in Basic Plan",
        "Test & balance chemicals",
        "Clean tile line",
        "Inspect filter & equipment",
        "Backwash filter (as needed)",
        "Check salt system (if applicable)",
        "Report of service",
      ],
      cta: "CHOOSE PLAN",
      color: "navy",
      icon: Waves,
      popular: true,
    },
    {
      name: "PREMIUM PLAN",
      price: "$99",
      desc: "Maximum care for a perfectly maintained pool.",
      features: [
        "Everything in Standard Plan",
        "Filter cleaning (as needed)",
        "Salt cell cleaning (as needed)",
        "Equipment deep inspection",
        "Water level check & adjust",
        "Priority service",
        "15% off repairs",
      ],
      cta: "CHOOSE PLAN",
      color: "teal",
      icon: Gem,
    },
  ],
};

const ALL_PLANS = [
  { icon: ShieldCheck, label: "Licensed & Insured", sub: "Technicians" },
  { icon: Clock, label: "On-Time, Every Time", sub: "Service" },
  { icon: ThumbsUp, label: "Satisfaction", sub: "Guaranteed" },
  { icon: MessageCircle, label: "Easy Communication", sub: "& Updates" },
];

const HOW_IT_WORKS = [
  {
    step: 1,
    icon: Calendar,
    title: "SCHEDULE",
    desc: "Choose your plan and we'll set up your service schedule.",
  },
  {
    step: 2,
    icon: Wrench,
    title: "WE CLEAN & CHECK",
    desc: "Our technician visits and performs a complete service.",
  },
  {
    step: 3,
    icon: FlaskConical,
    title: "WE TEST & BALANCE",
    desc: "We test your water and balance chemicals for perfect results.",
  },
  {
    step: 4,
    icon: Waves,
    title: "YOU ENJOY",
    desc: "Relax and enjoy your clean, healthy, crystal-clear pool!",
  },
];

function MaintenancePlansPage() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<keyof typeof PRICING>("WEEKLY");

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 lg:px-8">
          <a href="/" className="flex items-center">
            <img src={logoAsset.url} alt="Sundown Pool Service" className="h-12 w-auto sm:h-16 lg:h-16" />
          </a>
          <nav className="hidden items-center gap-7 lg:flex">
            {NAV.map((n) => (
              <a
                key={n.label}
                href={n.href}
                className={`flex items-center gap-1 text-[13px] font-bold tracking-wide hover:text-[#0a4d8a] ${
                  n.active ? "text-[#0a4d8a]" : "text-slate-800"
                }`}
              >
                {n.label}
                {n.label === "SERVICES" && <ChevronDown className="h-3.5 w-3.5" />}
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
          <img src={heroPool} alt="Pool maintenance" className="h-[600px] w-full object-cover lg:h-[580px]" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a2547]/95 via-[#0a2547]/80 to-[#0a2547]/50" />
          <div className="absolute inset-0">
            <div className="mx-auto flex h-full max-w-7xl flex-col justify-center px-4 py-16 lg:flex-row lg:items-center lg:px-8">
              <div className="min-w-0 flex-1 text-white lg:pr-12">
                <h1 className="whitespace-nowrap text-2xl font-extrabold uppercase tracking-tight sm:text-3xl lg:text-3xl">
                  POOL MAINTENANCE PLANS
                </h1>
                <p className="whitespace-nowrap text-lg font-extrabold text-[#33b5c5] sm:text-xl lg:text-2xl">
                  Simple Plans. Crystal Clear Results.
                </p>
                <p className="mt-4 max-w-lg text-sm leading-relaxed text-white/90 sm:text-base">
                  Keep your pool clean, safe, and swim-ready year-round with our professional maintenance plans. We handle the work, so you can enjoy your pool worry-free.
                </p>
                <div className="mt-8 grid grid-cols-2 gap-4 sm:flex sm:flex-wrap sm:gap-6">
                  {HERO_BADGES.map((b) => (
                    <div key={b.label} className="flex items-center gap-3">
                      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-white/30 bg-white/10">
                        <b.icon className="h-6 w-6 text-white" />
                      </div>
                      <div className="text-xs font-bold leading-tight">
                        <div>{b.label}</div>
                        <div className="font-normal text-white/80">{b.sub}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-8 w-full max-w-sm rounded-lg bg-white p-6 shadow-2xl lg:mt-0">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#0a4d8a]">
                    <ClipboardList className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="text-lg font-extrabold text-[#0a2547]">WHY CHOOSE OUR PLANS?</h3>
                </div>
                <ul className="mt-4 space-y-3">
                  {WHY_CHOOSE.map((item) => (
                    <li key={item} className="flex items-start gap-3 text-sm text-slate-700">
                      <Check className="mt-0.5 h-5 w-5 shrink-0 text-[#0a4d8a]" />
                      {item}
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

      {/* PRICING */}
      <section className="bg-white py-14 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="text-center">
            <h2 className="text-xl font-extrabold tracking-wide text-[#0a2547] sm:text-2xl lg:text-3xl">
              CHOOSE THE PLAN THAT'S RIGHT FOR YOU
            </h2>
          </div>

          <div className="mt-8 flex justify-center">
            <div className="inline-flex overflow-hidden rounded border border-slate-200">
              {TABS.map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-6 py-2.5 text-xs font-extrabold tracking-wide sm:px-10 sm:text-sm ${
                    tab === t
                      ? "bg-[#0a4d8a] text-white"
                      : "bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {PRICING[tab].map((plan) => (
              <div key={plan.name} className={`relative rounded-lg border border-slate-200 bg-white shadow-sm ${plan.popular ? "ring-2 ring-[#0a2547]" : ""}`}>
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded bg-[#f5b900] px-4 py-1 text-xs font-extrabold tracking-wide text-slate-900">
                    MOST POPULAR
                  </div>
                )}
                <div className={`rounded-t-lg py-3 text-center ${plan.color === "navy" ? "bg-[#0a2547]" : "bg-[#00a3a3]"}`}>
                  <h3 className="text-base font-extrabold tracking-wide text-white">{plan.name}</h3>
                </div>
                <div className="p-6">
                  <div className="flex justify-center py-3">
                    <plan.icon className="h-16 w-16 text-[#00a3a3]" strokeWidth={1} />
                  </div>
                  <p className="text-center text-sm text-slate-600">{plan.desc}</p>
                  <ul className="mt-5 space-y-2.5">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-sm text-slate-700">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#0a4d8a]" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-6 text-center">
                    <div className="text-xs font-bold uppercase tracking-wide text-slate-500">STARTING AT</div>
                    <div className="mt-1 flex items-center justify-center gap-1">
                      <span className="text-3xl font-extrabold text-[#0a2547]">{plan.price}</span>
                      <span className="text-sm text-slate-500">/month</span>
                    </div>
                  </div>
                  <a
                    href="/#contact"
                    className={`mt-5 block rounded py-3 text-center text-sm font-extrabold tracking-wide text-white ${
                      plan.color === "navy" ? "bg-[#0a2547] hover:bg-[#0b305a]" : "bg-[#00a3a3] hover:bg-[#008f8f]"
                    }`}
                  >
                    {plan.cta}
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ALL PLANS INCLUDE */}
      <section className="bg-white pb-14 lg:pb-20">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="text-center">
            <h2 className="text-xl font-extrabold tracking-wide text-[#0a2547] sm:text-2xl">ALL PLANS INCLUDE</h2>
            <div className="mx-auto mt-2 h-0.5 w-12 bg-[#00a3a3]" />
          </div>
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {ALL_PLANS.map((p) => (
              <div key={p.label} className="flex items-center gap-3">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#0a2547]">
                  <p.icon className="h-6 w-6 text-white" />
                </div>
                <div className="text-sm leading-tight">
                  <div className="font-extrabold text-[#0a2547]">{p.label}</div>
                  <div className="text-slate-600">{p.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="bg-slate-50 py-14 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="text-center">
            <h2 className="text-xl font-extrabold tracking-wide text-[#0a2547] sm:text-2xl">HOW IT WORKS</h2>
            <div className="mx-auto mt-2 h-0.5 w-12 bg-[#00a3a3]" />
          </div>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {HOW_IT_WORKS.map((step, i) => (
              <div key={step.title} className="relative flex items-start gap-4">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#0a4d8a] text-sm font-extrabold text-white">
                  {step.step}
                </div>
                <div className="rounded-lg bg-white p-4 shadow-sm">
                  <step.icon className="h-8 w-8 text-[#00a3a3]" strokeWidth={1.5} />
                  <h3 className="mt-2 text-sm font-extrabold text-[#0a2547]">{step.title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">{step.desc}</p>
                </div>
                {i < HOW_IT_WORKS.length - 1 && (
                  <ArrowRight className="absolute -right-3 top-1/2 hidden h-5 w-5 -translate-y-1/2 text-[#0a4d8a] lg:block" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#0a2547] py-12">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-4 lg:flex-row lg:px-8">
          <div className="flex items-center gap-4">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[#0a4d8a]">
              <Phone className="h-7 w-7 text-white" />
            </div>
            <div className="text-white">
              <div className="text-lg font-extrabold">HAVE QUESTIONS?</div>
              <div className="text-lg font-extrabold">WE'RE HERE TO HELP!</div>
            </div>
          </div>
          <div className="text-center text-white lg:text-left">
            <div className="text-sm text-white/80">Call us or request a free quote today.</div>
            <div className="text-2xl font-extrabold">{PHONE}</div>
          </div>
          <a href="/#contact" className="flex items-center gap-2 rounded bg-[#f5b900] px-6 py-3 text-sm font-extrabold text-slate-900 hover:bg-[#e0a800]">
            GET A FREE QUOTE <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#0a2547] text-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-5 lg:px-8">
          <div>
            <img src={logoAsset.url} alt="Sundown Pool Service" className="h-24 w-auto rounded bg-white" />
            <p className="mt-4 text-sm text-white/80">
              Professional pool cleaning, green pool cleanup, maintenance and repairs. We keep your pool perfect, so you can enjoy what matters most.
            </p>
            <div className="mt-4 flex items-center gap-3">
              <a href="#" className="grid h-8 w-8 place-items-center rounded-full bg-white/10 hover:bg-white/20"><Facebook className="h-4 w-4" /></a>
              <a href="#" className="grid h-8 w-8 place-items-center rounded-full bg-white/10 hover:bg-white/20"><Instagram className="h-4 w-4" /></a>
            </div>
          </div>
          <div>
            <h4 className="text-sm font-extrabold tracking-wide">QUICK LINKS</h4>
            <ul className="mt-3 space-y-2 text-sm text-white/80">
              {NAV.slice(0, 5).map((n) => (
                <li key={n.label}><a href={n.href} className="hover:text-white">{n.label.charAt(0) + n.label.slice(1).toLowerCase()}</a></li>
              ))}
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
              <li className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-sky-400" /> 4008 Destination Dr #2208, Osprey, FL 34229</li>
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

export default MaintenancePlansPage;
