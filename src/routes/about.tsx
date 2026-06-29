import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Phone, Menu, X, Shield, Users, Award, Clock, Handshake, BadgeCheck,
  Heart, Calendar, MapPin, CheckCircle2, Mail, Facebook, Instagram,
} from "lucide-react";
import logoAsset from "@/assets/sundown-logo.png.asset.json";
import technicianImg from "@/assets/about-technician.jpg";
import familyImg from "@/assets/about-family.jpg";

export const Route = createFileRoute("/about")({
  component: AboutPage,
  head: () => ({
    meta: [
      { title: "About Us — Sundown Pool Service | Trusted Pool Care in South Florida" },
      { name: "description", content: "Sundown Pool Service treats every pool like our own. Family-owned, licensed and insured, with years of experience serving homes and businesses across South Florida." },
    ],
  }),
});

const PHONE = "(561) 376-2428";
const PHONE_HREF = "tel:+15613762428";

const NAV = [
  { label: "HOME", href: "/" },
  { label: "SERVICES", href: "/#services" },
  { label: "MAINTENANCE PLANS", href: "/maintenance-plans" },
  { label: "ABOUT US", href: "/about" },
  { label: "SERVICE AREAS", href: "/#areas" },
  { label: "CONTACT", href: "/#contact" },
];

const HERO_BADGES = [
  { icon: Shield, title: "Licensed", sub: "& Insured" },
  { icon: Users, title: "Local &", sub: "Family-Owned" },
  { icon: Award, title: "5-Star", sub: "Service" },
  { icon: Clock, title: "On-Time,", sub: "Every Time" },
];

const STATS = [
  { icon: Users, big: "500+", label: "Happy Customers", sub: "and growing" },
  { icon: Calendar, big: "10+", label: "Years of", sub: "Experience" },
  { icon: MapPin, big: "South Florida", label: "Proudly serving", sub: "our community" },
  { icon: Shield, big: "100%", label: "Satisfaction", sub: "Guaranteed" },
];

const VALUES = [
  { icon: Handshake, title: "Integrity", desc: "We believe in honest communication, fair pricing, and doing the right thing." },
  { icon: BadgeCheck, title: "Quality", desc: "We use the best products, equipment, and techniques to deliver the best results." },
  { icon: Users, title: "Reliability", desc: "We show up on time, every time, and get the job done right." },
  { icon: Heart, title: "Care", desc: "We treat your pool with the same care and attention as our own." },
];

const TESTIMONIALS = [
  { quote: "Sundown Pool Service is the best! Our green pool looked brand new in just a few days. Professional, on time, and very affordable.", name: "Melissa R.", city: "Boca Raton, FL" },
  { quote: "Reliable service every week. They take care of everything so we can just enjoy our pool. Highly recommend!", name: "David L.", city: "Delray Beach, FL" },
  { quote: "Great communication and excellent results. Our pool has never been cleaner!", name: "Sarah K.", city: "Wellington, FL" },
];

function AboutPage() {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Top utility bar */}
      <div className="bg-[#0a2547] text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2 text-xs lg:px-8">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5"><Shield className="h-3.5 w-3.5" /> Licensed & Insured</span>
            <span className="hidden items-center gap-1.5 sm:flex">
              <Award className="h-3.5 w-3.5 text-amber-400" /> 5-Star Rated on Google
              <span className="text-amber-400">★★★★★</span>
            </span>
          </div>
          <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> Serving South Florida</span>
        </div>
      </div>

      {/* NAV */}
      <header className="sticky top-0 z-50 bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 lg:px-8">
          <Link to="/" className="flex items-center">
            <img src={logoAsset.url} alt="Sundown Pool Service" className="h-12 w-auto sm:h-16" />
          </Link>
          <nav className="hidden items-center gap-7 lg:flex">
            {NAV.map((n) => (
              <a
                key={n.label}
                href={n.href}
                className={`text-[13px] font-bold tracking-wide hover:text-[#0a4d8a] ${
                  n.label === "ABOUT US" ? "border-b-2 border-[#0a4d8a] pb-1 text-[#0a4d8a]" : "text-slate-800"
                }`}
              >
                {n.label}
              </a>
            ))}
          </nav>
          <div className="hidden items-center gap-4 lg:flex">
            <a href={PHONE_HREF} className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <Phone className="h-4 w-4 text-[#0a4d8a]" /> {PHONE}
            </a>
            <a href="/#contact" className="rounded bg-amber-400 px-4 py-2.5 text-xs font-extrabold tracking-wide text-slate-900 hover:bg-amber-500">
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
            </div>
          </nav>
        )}
      </header>

      {/* HERO */}
      <section className="bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 lg:grid-cols-2 lg:px-8 lg:py-14">
          <div>
            <p className="text-sm font-bold tracking-[0.2em] text-[#0a4d8a]">ABOUT US</p>
            <h1 className="mt-3 text-3xl font-extrabold leading-tight text-slate-900 sm:text-4xl lg:text-5xl">
              Your Pool. Our Passion.
            </h1>
            <p className="mt-2 text-xl font-bold text-sky-500 sm:text-2xl">Reliable Care You Can Count On.</p>
            <p className="mt-5 max-w-md text-sm leading-relaxed text-slate-600">
              At Sundown Pool Service, we believe a clean, healthy pool brings people together and creates the best moments. That's why we're dedicated to providing professional, honest, and high-quality pool care for homes and businesses across South Florida.
            </p>

            <div className="mt-7 grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-4">
              {HERO_BADGES.map((b) => (
                <div key={b.title} className="flex items-center gap-2">
                  <b.icon className="h-7 w-7 shrink-0 text-[#0a4d8a]" strokeWidth={1.5} />
                  <div className="text-xs leading-tight">
                    <div className="font-bold text-slate-900">{b.title}</div>
                    <div className="text-slate-700">{b.sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="overflow-hidden rounded-lg shadow-md">
            <img src={technicianImg} alt="Sundown pool technician testing water" className="h-full w-full object-cover" width={1280} height={896} />
          </div>
        </div>
      </section>

      {/* OUR STORY */}
      <section className="bg-white pb-12 lg:pb-16">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 lg:grid-cols-2 lg:items-center lg:px-8">
          <div className="overflow-hidden rounded-lg shadow-md">
            <img src={familyImg} alt="Family enjoying their pool at sunset" className="h-full w-full object-cover" loading="lazy" width={1024} height={768} />
          </div>
          <div>
            <p className="text-sm font-bold tracking-[0.2em] text-[#0a4d8a]">OUR STORY</p>
            <h2 className="mt-2 text-2xl font-extrabold text-slate-900 sm:text-3xl">
              Built on Experience. Driven by Excellence.
            </h2>
            <div className="mt-5 space-y-4 text-sm leading-relaxed text-slate-600">
              <p>With years of experience in the pool care industry, Sundown Pool Service was founded with a simple mission: to treat every pool as if it were our own.</p>
              <p>We know that every pool is unique, which is why we customize our services to meet your specific needs. From routine maintenance to complete green pool recovery, we have the knowledge, tools, and dedication to get the job done right.</p>
              <p>We're proud to be a trusted partner for hundreds of satisfied customers throughout South Florida.</p>
            </div>
            <p className="mt-5 font-serif text-xl italic text-sky-500 underline decoration-sky-300 underline-offset-4">
              We care for your pool like it's our own.
            </p>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="bg-[#0a2547] py-10 text-white">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 lg:grid-cols-4 lg:px-8">
          {STATS.map((s) => (
            <div key={s.label} className="flex items-center gap-4">
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-white/10">
                <s.icon className="h-7 w-7 text-sky-300" strokeWidth={1.5} />
              </div>
              <div className="leading-tight">
                <div className="text-2xl font-extrabold sm:text-3xl">{s.big}</div>
                <div className="text-sm font-semibold">{s.label}</div>
                <div className="text-xs text-white/70">{s.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* VALUES */}
      <section className="bg-white py-12 lg:py-16">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="text-center">
            <h2 className="text-xl font-extrabold tracking-wide text-slate-800 sm:text-2xl">OUR VALUES</h2>
            <div className="mx-auto mt-2 h-0.5 w-16 bg-sky-400" />
          </div>
          <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {VALUES.map((v) => (
              <div key={v.title} className="flex flex-col items-center text-center">
                <div className="grid h-16 w-16 place-items-center rounded-full bg-sky-50">
                  <v.icon className="h-8 w-8 text-[#0a4d8a]" strokeWidth={1.5} />
                </div>
                <h3 className="mt-4 text-base font-extrabold text-slate-900">{v.title}</h3>
                <p className="mt-2 max-w-[14rem] text-sm leading-relaxed text-slate-600">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="bg-sky-50 py-12 lg:py-16">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="text-center">
            <h2 className="text-xl font-extrabold tracking-wide text-slate-800 sm:text-2xl">WHAT OUR CLIENTS SAY</h2>
            <div className="mx-auto mt-2 h-0.5 w-16 bg-sky-400" />
          </div>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="rounded-lg bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="grid h-7 w-7 place-items-center rounded-full bg-white shadow ring-1 ring-slate-100">
                    <span className="text-sm font-bold text-[#4285F4]">G</span>
                  </div>
                  <span className="text-amber-400">★★★★★</span>
                </div>
                <p className="mt-3 text-sm italic leading-relaxed text-slate-700">"{t.quote}"</p>
                <div className="mt-4 flex items-center gap-3 border-t border-slate-100 pt-3">
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-sky-100 text-sm font-bold text-[#0a4d8a]">
                    {t.name[0]}
                  </div>
                  <div className="leading-tight">
                    <div className="text-sm font-bold text-slate-800">— {t.name}</div>
                    <div className="text-xs text-slate-500">{t.city}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA BAR */}
      <section className="bg-[#0a2547] py-8 text-white">
        <div className="mx-auto grid max-w-7xl items-center gap-5 px-4 lg:grid-cols-[1fr_auto_auto] lg:px-8">
          <div>
            <h3 className="text-xl font-extrabold sm:text-2xl">Ready for a Clean, Healthy Pool?</h3>
            <p className="mt-1 text-sm text-white/80">Let our experts handle the work so you can enjoy your pool worry-free.</p>
          </div>
          <a href={PHONE_HREF} className="flex items-center justify-center gap-3 rounded bg-amber-400 px-6 py-3.5 font-extrabold text-slate-900 hover:bg-amber-500">
            <Phone className="h-5 w-5" />
            <div className="text-left leading-tight">
              <div className="text-xs">CALL NOW</div>
              <div className="text-base">{PHONE}</div>
            </div>
          </a>
          <a href="/#contact" className="flex items-center justify-center gap-3 rounded border-2 border-white/40 px-6 py-3.5 font-extrabold text-white hover:bg-white/10">
            <Calendar className="h-5 w-5" />
            <div className="text-left leading-tight">
              <div className="text-base">GET A FREE QUOTE</div>
              <div className="text-xs font-normal text-white/80">Fast, Easy & No Obligation</div>
            </div>
          </a>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#0a2547] text-white">
        <div className="mx-auto grid max-w-7xl gap-8 border-t border-white/10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-5 lg:px-8">
          <div>
            <div className="w-fit rounded bg-white p-2">
              <img src={logoAsset.url} alt="Sundown Pool Service" className="h-14 w-auto" />
            </div>
            <p className="mt-4 text-sm text-white/80">
              Professional pool cleaning, maintenance, and repairs. We keep your pool perfect, so you can enjoy what matters most.
            </p>
            <div className="mt-4 flex items-center gap-3">
              <a href="#" aria-label="Facebook" className="grid h-8 w-8 place-items-center rounded-full bg-white/10 hover:bg-white/20"><Facebook className="h-4 w-4" /></a>
              <a href="#" aria-label="Instagram" className="grid h-8 w-8 place-items-center rounded-full bg-white/10 hover:bg-white/20"><Instagram className="h-4 w-4" /></a>
            </div>
          </div>
          <div>
            <h4 className="text-sm font-extrabold tracking-wide">QUICK LINKS</h4>
            <ul className="mt-3 space-y-2 text-sm text-white/80">
              {NAV.map((n) => (
                <li key={n.label}><a href={n.href} className="hover:text-white">{n.label.charAt(0) + n.label.slice(1).toLowerCase()}</a></li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-extrabold tracking-wide">SERVICE AREAS</h4>
            <ul className="mt-3 space-y-2 text-sm text-white/80">
              {["Boca Raton", "Delray Beach", "Boynton Beach", "West Palm Beach", "Wellington", "And Surrounding Areas"].map((c) => (
                <li key={c} className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-sky-300" /> {c}</li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-extrabold tracking-wide">CONTACT US</h4>
            <ul className="mt-3 space-y-2 text-sm text-white/80">
              <li className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-sky-300" /> {PHONE}</li>
              <li className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-sky-300" /> info@sundownpool.com</li>
              <li className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-sky-300" /> South Florida</li>
              <li className="flex items-start gap-2"><Clock className="mt-0.5 h-3.5 w-3.5 text-sky-300" /> <span>Mon – Fri: 7:00am – 6:00pm<br />Sat & Sun: By Appointment</span></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-extrabold tracking-wide">LICENSED & INSURED</h4>
            <div className="mt-3 flex items-start gap-3">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white/10">
                <Shield className="h-6 w-6 text-sky-300" />
              </div>
              <p className="text-sm text-white/80">We are fully licensed and insured for your peace of mind.</p>
            </div>
          </div>
        </div>
        <div className="border-t border-white/10 py-4 text-center text-xs text-white/60">
          © {new Date().getFullYear()} Sundown Pool Service. All Rights Reserved.
        </div>
      </footer>
    </div>
  );
}
