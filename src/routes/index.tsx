import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Phone, Calendar, Shield, Award, Clock, ThumbsUp, CheckCircle2, ArrowRight,
  Menu, X, Droplets, Wrench, Filter, FlaskConical, Grid3x3, Sparkles,
  DollarSign, ShieldCheck, MapPin, Mail, Facebook, Instagram,
} from "lucide-react";
import logoAsset from "@/assets/sundown-logo.png.asset.json";
import heroPool from "@/assets/hero-pool.jpg";
import beforePool from "@/assets/before-pool.jpg";
import afterPool from "@/assets/after-pool.jpg";

export const Route = createFileRoute("/")({
  component: LandingPage,
  head: () => ({
    meta: [
      { title: "Sundown Pool Service — Professional Pool Care in South Florida" },
      { name: "description", content: "Weekly maintenance, green pool recovery, equipment repairs, filter cleaning and water treatment. Fast, reliable pool service with free estimates in Osprey, FL." },
    ],
  }),
});

const PHONE = "(561) 376-2428";
const PHONE_HREF = "tel:+15613762428";

const NAV = [
  { label: "HOME", href: "#home" },
  { label: "SERVICES", href: "#services" },
  { label: "MAINTENANCE PLANS", href: "#plans" },
  { label: "ABOUT US", href: "#about" },
  { label: "SERVICE AREAS", href: "#areas" },
  { label: "CONTACT", href: "#contact" },
];

const SERVICES = [
  { icon: Sparkles, title: "WEEKLY POOL MAINTENANCE", desc: "Regular cleaning, water testing, chemical balancing, and equipment checks." },
  { icon: Droplets, title: "GREEN POOL CLEANUP", desc: "We remove algae and restore your pool water to be crystal clear.", popular: true },
  { icon: Filter, title: "FILTER CLEANING", desc: "Deep cleaning for sand, cartridge and DE filters for maximum performance." },
  { icon: Wrench, title: "POOL EQUIPMENT REPAIR", desc: "Pump, heater, filter, and salt system repairs. We fix it right the first time." },
  { icon: FlaskConical, title: "WATER TESTING & CHEMICAL BALANCING", desc: "We balance your pool chemicals to keep the water safe, clean and healthy." },
  { icon: Grid3x3, title: "POOL TILE CLEANING", desc: "Remove buildup and calcium from tiles to keep your pool looking beautiful." },
];

const TESTIMONIALS = [
  { name: "Jennifer M.", text: "Amazing service! My pool was green and they got it crystal clear in just 2 days. Very professional and reliable!" },
  { name: "Mark T.", text: "Best pool service in South Florida. They are always on time and my pool has never looked better." },
  { name: "Sarah K.", text: "Great communication and fair pricing. I highly recommend Sundown Pool Service to everyone!" },
];

const TRUST = [
  { icon: Shield, label: "Licensed", sub: "& Insured" },
  { icon: Award, label: "5-Star", sub: "Rated" },
  { icon: Clock, label: "On-Time", sub: "Every Time" },
  { icon: ThumbsUp, label: "100%", sub: "Satisfaction" },
];

const BENEFITS = [
  { icon: Calendar, title: "EASY SCHEDULING", desc: "We work around your schedule." },
  { icon: DollarSign, title: "NO HIDDEN FEES", desc: "Transparent pricing you can trust." },
  { icon: ShieldCheck, title: "SATISFACTION GUARANTEED", desc: "We're not happy until you're happy." },
  { icon: MapPin, title: "LOCAL & TRUSTED", desc: "Proudly serving South Florida communities." },
];

function LandingPage() {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* NAV */}
      <header className="sticky top-0 z-50 bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 lg:px-8">
          <a href="#home" className="flex items-center">
            <img src={logoAsset.url} alt="Sundown Pool Service" className="h-12 w-auto sm:h-14 lg:h-18" />
          </a>
          <nav className="hidden items-center gap-7 lg:flex">
            {NAV.map((n) => (
              <a key={n.label} href={n.href} className="text-[13px] font-bold tracking-wide text-slate-800 hover:text-[#0a4d8a]">
                {n.label}
              </a>
            ))}
          </nav>
          <div className="hidden items-center gap-4 lg:flex">
            <a href={PHONE_HREF} className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <Phone className="h-4 w-4 text-[#0a4d8a]" /> {PHONE}
            </a>
            <a href="#contact" className="rounded bg-amber-400 px-4 py-2.5 text-xs font-extrabold tracking-wide text-slate-900 hover:bg-amber-500">
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
      <section id="home" className="relative">
        <div className="relative">
          <img src={heroPool} alt="Luxury pool" className="h-[560px] w-full object-cover sm:h-[640px] lg:h-[720px]" width={1600} height={900} />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a2547]/85 via-[#0a2547]/55 to-transparent lg:from-[#0a2547]/80 lg:via-[#0a2547]/30" />
          <div className="absolute inset-0">
            <div className="mx-auto flex h-full max-w-7xl flex-col justify-center px-4 py-10 lg:px-8">
              <div className="max-w-2xl text-white">
                <h1 className="text-3xl font-extrabold leading-tight sm:text-4xl lg:text-5xl">
                  Professional Pool Care<br />
                  <span className="text-sky-400">& Green Pool Cleanup</span><br />
                  in South Florida
                </h1>
                <p className="mt-5 max-w-md text-sm leading-relaxed text-white/90 sm:text-base">
                  Weekly maintenance, green pool recovery, equipment repairs, filter cleaning, and water treatment. Fast, reliable service with free estimates.
                </p>

                <div className="mt-6 flex flex-wrap gap-x-6 gap-y-4">
                  {TRUST.map((t) => (
                    <div key={t.label} className="flex items-center gap-2">
                      <t.icon className="h-6 w-6 text-white" />
                      <div className="text-xs leading-tight">
                        <div className="font-semibold">{t.label}</div>
                        <div className="text-white/80">{t.sub}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                  <a href={PHONE_HREF} className="flex items-center justify-center gap-3 rounded bg-amber-400 px-6 py-4 font-extrabold text-slate-900 hover:bg-amber-500">
                    <Phone className="h-5 w-5" />
                    <div className="text-left leading-tight">
                      <div className="text-xs">CALL NOW</div>
                      <div className="text-base">{PHONE}</div>
                    </div>
                  </a>
                  <a href="#contact" className="flex items-center justify-center gap-3 rounded border-2 border-white/40 bg-[#0a2547]/70 px-6 py-4 font-extrabold text-white backdrop-blur hover:bg-[#0a2547]">
                    <Calendar className="h-5 w-5" />
                    <div className="text-left leading-tight">
                      <div className="text-base">GET A FREE QUOTE</div>
                      <div className="text-xs font-normal text-white/80">It's Fast & Easy</div>
                    </div>
                  </a>
                </div>
              </div>

              {/* Trust card */}
              <div className="mt-8 w-full max-w-sm rounded-lg bg-white p-4 shadow-2xl lg:absolute lg:right-8 lg:top-1/2 lg:mt-0 lg:-translate-y-1/2">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                  <div className="grid h-9 w-9 place-items-center rounded-full bg-white shadow ring-1 ring-slate-100">
                    <span className="text-base font-bold text-[#4285F4]">G</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-1">
                      <span className="text-lg font-extrabold text-slate-900">5.0</span>
                      <span className="text-amber-400">★★★★★</span>
                    </div>
                    <div className="text-xs text-slate-500">Based on 200+ Google Reviews</div>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-[#0a4d8a]" />
                  <span className="text-sm font-semibold text-slate-800">Family Owned & Operated</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Wave divider */}
        <svg viewBox="0 0 1440 60" className="block h-10 w-full -mt-1 fill-white" preserveAspectRatio="none">
          <path d="M0,30 C360,80 1080,-20 1440,30 L1440,60 L0,60 Z" />
        </svg>
      </section>

      {/* BEFORE / AFTER */}
      <section className="bg-white py-12 lg:py-16">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center gap-3">
              <span className="h-px w-12 bg-slate-300" />
              <h2 className="text-base font-extrabold tracking-wide text-[#0a4d8a] sm:text-lg">FROM GREEN TO CRYSTAL CLEAR</h2>
              <span className="h-px w-12 bg-slate-300" />
            </div>
            <p className="mt-1 font-serif text-2xl italic text-sky-500">in Just Days!</p>
          </div>

          <div className="mt-8 grid gap-5 lg:grid-cols-[1fr_1fr_minmax(0,1.1fr)] lg:items-stretch">
            <div className="relative overflow-hidden rounded-lg shadow-md">
              <img src={beforePool} alt="Before" className="h-64 w-full object-cover sm:h-72" loading="lazy" width={800} height={600} />
              <span className="absolute left-3 top-3 rounded bg-emerald-700 px-3 py-1 text-xs font-bold tracking-wide text-white">BEFORE</span>
            </div>
            <div className="relative overflow-hidden rounded-lg shadow-md">
              <img src={afterPool} alt="After" className="h-64 w-full object-cover sm:h-72" loading="lazy" width={800} height={600} />
              <span className="absolute left-3 top-3 rounded bg-sky-500 px-3 py-1 text-xs font-bold tracking-wide text-white">AFTER</span>
              <div className="absolute left-1/2 top-1/2 hidden h-12 w-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white shadow-lg lg:grid">
                <ArrowRight className="h-6 w-6 text-[#0a4d8a]" />
              </div>
            </div>

            <div className="rounded-lg bg-[#0a2547] p-6 text-white lg:p-7">
              <h3 className="text-xl font-extrabold leading-tight">Your Pool Deserves<br />the Best Care</h3>
              <div className="mt-2 h-0.5 w-10 bg-sky-400" />
              <p className="mt-4 text-sm leading-relaxed text-white/90">
                We keep your pool clean, safe, and swim-ready year-round so you can relax and enjoy.
              </p>
              <ul className="mt-5 space-y-2.5">
                {["Reliable & On-Time Service", "Expert Technicians", "Quality You Can Trust", "Affordable Pricing"].map((b) => (
                  <li key={b} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-5 w-5 text-sky-400" /> {b}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section id="services" className="bg-white pb-12 lg:pb-16">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="text-center">
            <h2 className="text-xl font-extrabold tracking-wide text-[#0a4d8a] sm:text-2xl">OUR POOL SERVICES</h2>
            <div className="mx-auto mt-2 h-0.5 w-16 bg-sky-400" />
          </div>

          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {SERVICES.map((s) => (
              <div key={s.title} className="relative rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
                <s.icon className="h-10 w-10 text-[#0a4d8a]" strokeWidth={1.5} />
                <h3 className="mt-4 text-sm font-extrabold tracking-wide text-slate-900">{s.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-600">{s.desc}</p>
                {s.popular && (
                  <span className="absolute bottom-3 right-3 rounded bg-amber-400 px-2 py-0.5 text-[10px] font-bold text-slate-900">POPULAR</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS + QUOTE */}
      <section id="about" className="bg-white pb-12 lg:pb-16">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="text-center">
            <h2 className="text-xl font-extrabold tracking-wide text-slate-800 sm:text-2xl">WHAT OUR CLIENTS SAY</h2>
            <div className="mx-auto mt-2 h-0.5 w-16 bg-sky-400" />
          </div>

          <div className="mt-8 grid gap-5 lg:grid-cols-[2fr_1fr]">
            <div className="grid gap-5 sm:grid-cols-3">
              {TESTIMONIALS.map((t) => (
                <div key={t.name} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-2">
                    <div className="grid h-7 w-7 place-items-center rounded-full bg-white shadow ring-1 ring-slate-100">
                      <span className="text-sm font-bold text-[#4285F4]">G</span>
                    </div>
                    <span className="text-amber-400">★★★★★</span>
                  </div>
                  <p className="mt-3 text-sm italic leading-relaxed text-slate-700">"{t.text}"</p>
                  <div className="mt-4 flex items-center gap-2">
                    <div className="grid h-8 w-8 place-items-center rounded-full bg-sky-100 text-xs font-bold text-[#0a4d8a]">
                      {t.name[0]}
                    </div>
                    <span className="text-sm font-semibold text-slate-700">— {t.name}</span>
                  </div>
                </div>
              ))}
            </div>

            <div id="contact" className="rounded-lg bg-[#0a2547] p-6 text-white">
              <h3 className="text-lg font-extrabold">GET YOUR FREE QUOTE</h3>
              <form className="mt-4 space-y-3" onSubmit={(e) => e.preventDefault()}>
                <input className="w-full rounded border border-white/20 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400" placeholder="Full Name" />
                <input className="w-full rounded border border-white/20 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400" placeholder="Phone Number" />
                <input className="w-full rounded border border-white/20 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400" placeholder="Email Address" />
                <select className="w-full rounded border border-white/20 bg-white px-3 py-2.5 text-sm text-slate-500">
                  <option>What do you need help with?</option>
                  <option>Weekly Maintenance</option>
                  <option>Green Pool Cleanup</option>
                  <option>Equipment Repair</option>
                  <option>Other</option>
                </select>
                <button className="w-full rounded bg-amber-400 py-3 text-sm font-extrabold tracking-wide text-slate-900 hover:bg-amber-500">
                  GET MY FREE QUOTE
                </button>
                <p className="text-center text-xs text-white/70">No commitment. Fast response!</p>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* BENEFITS BAR */}
      <section className="bg-sky-50 py-8">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 sm:grid-cols-2 lg:grid-cols-4 lg:px-8">
          {BENEFITS.map((b) => (
            <div key={b.title} className="flex items-start gap-3">
              <b.icon className="mt-1 h-7 w-7 shrink-0 text-[#0a4d8a]" strokeWidth={1.5} />
              <div>
                <h4 className="text-sm font-extrabold tracking-wide text-slate-900">{b.title}</h4>
                <p className="text-xs text-slate-600">{b.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#0a2547] text-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-5 lg:px-8">
          <div>
            <img src={logoAsset.url} alt="Sundown Pool Service" className="h-14 w-auto brightness-0 invert" />
            <p className="mt-4 text-sm text-white/80">
              Professional pool cleaning, maintenance and repairs. We keep your pool perfect, so you can enjoy what matters most.
            </p>
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
            <div className="mt-4 flex items-center gap-3">
              <a href="#" className="grid h-8 w-8 place-items-center rounded-full bg-white/10 hover:bg-white/20"><Facebook className="h-4 w-4" /></a>
              <a href="#" className="grid h-8 w-8 place-items-center rounded-full bg-white/10 hover:bg-white/20"><Instagram className="h-4 w-4" /></a>
            </div>
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
