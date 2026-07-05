import { createFileRoute } from "@tanstack/react-router";
import {
  Phone, Calendar, Shield, Star, Clock, ThumbsUp, CheckCircle2,
  Droplets, Wrench, Filter, FlaskConical, Sparkles, Grid3x3,
  CalendarDays, DollarSign, ShieldCheck, MapPin,
} from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import heroBg from "@/assets/hero-pool.jpg";
import beforeGreen from "@/assets/before-pool.jpg";
import afterClear from "@/assets/after-pool.jpg";

export const Route = createFileRoute("/")({
  component: LandingPage,
  head: () => ({
    meta: [
      { title: "Sundown Pool Care — Professional Pool Cleaning in South Florida" },
      { name: "description", content: "Weekly maintenance, green pool cleanup, filter cleaning, and equipment repair. Licensed, insured, 5-star rated pool service in Osprey, Sarasota, Venice and surrounding areas." },
      { property: "og:title", content: "Sundown Pool Care — Professional Pool Cleaning" },
      { property: "og:description", content: "Family owned. 5-star rated. On-time every time. Get a free quote today." },
      { property: "og:image", content: heroBg },
      { name: "twitter:image", content: heroBg },
    ],
  }),
});

const PHONE = "(561) 376-2428";
const PHONE_HREF = "tel:+15613762428";

const TRUST = [
  { icon: Shield, label: "Licensed", label2: "& Insured" },
  { icon: Star, label: "5-Star", label2: "Rated" },
  { icon: Clock, label: "On-Time", label2: "Every Time" },
  { icon: ThumbsUp, label: "100%", label2: "Satisfaction" },
];

const SERVICES = [
  { icon: Sparkles, title: "WEEKLY POOL MAINTENANCE", desc: "Regular cleaning, water testing, chemical balancing, and equipment checks." },
  { icon: Droplets, title: "GREEN POOL CLEANUP", desc: "We remove algae and restore your pool water to be crystal clear.", popular: true },
  { icon: Filter, title: "FILTER CLEANING", desc: "Deep cleaning for sand, cartridge and DE filters for maximum performance." },
  { icon: Wrench, title: "POOL EQUIPMENT REPAIR", desc: "Pump, heater, filter, and salt system repairs. We fix it right the first time." },
  { icon: FlaskConical, title: "WATER TESTING & CHEMICAL BALANCING", desc: "We balance your pool chemicals to keep the water safe, clean and healthy." },
  { icon: Grid3x3, title: "POOL TILE CLEANING", desc: "Remove buildup and calcium from tiles to keep your pool looking beautiful." },
];

const REVIEWS = [
  { initial: "J", name: "Jennifer M.", quote: "Amazing service! My pool was green and they got it crystal clear in just 2 days. Very professional and reliable!" },
  { initial: "M", name: "Mark T.", quote: "Best pool service in South Florida. They are always on time and my pool has never looked better." },
  { initial: "S", name: "Sarah K.", quote: "Great communication and fair pricing. I highly recommend Sundown Pool Care to everyone!" },
];

const FEATURES = [
  { icon: CalendarDays, title: "EASY SCHEDULING", desc: "We work around your schedule." },
  { icon: DollarSign, title: "NO HIDDEN FEES", desc: "Transparent pricing you can trust." },
  { icon: ShieldCheck, title: "SATISFACTION GUARANTEED", desc: "We're not happy until you're happy." },
  { icon: MapPin, title: "LOCAL & TRUSTED", desc: "Proudly serving South Florida communities." },
];

function LandingPage() {
  return (
    <div className="w-full overflow-x-hidden bg-white font-body text-brand-ink">
      <SiteHeader active="HOME" />

      {/* HERO */}
      <section
        className="relative overflow-hidden text-white"
        style={{
          backgroundImage: `linear-gradient(90deg, rgba(3,10,24,.9) 0%, rgba(3,10,24,.68) 40%, rgba(3,10,24,.32) 66%, rgba(3,10,24,.05) 90%), url(${heroBg})`,
          backgroundPosition: "center",
          backgroundSize: "cover",
          backgroundRepeat: "no-repeat",
        }}
      >
        <div className="relative mx-auto max-w-[1180px] px-7 pb-24 pt-16 md:pt-20">
          <div className="max-w-[560px]">
            <h1 className="mb-5 font-display text-[36px] font-extrabold leading-[1.12] tracking-[-.5px] md:text-[47px]">
              Professional Pool Care <span className="text-brand-blue-bright">&amp; Green Pool Cleanup</span> in Southwest Florida
            </h1>
            <p className="mb-6 max-w-[470px] text-[16.5px] leading-[1.6] text-[#d8e6f5]">
              Weekly maintenance, green pool recovery, equipment repairs, filter cleaning, and water treatment. Fast, reliable service with free estimates.
            </p>

            <div className="mb-7 flex flex-wrap gap-6">
              {TRUST.map((t) => (
                <div key={t.label} className="flex items-center gap-2.5 text-[13.5px] font-semibold">
                  <t.icon className="h-5 w-5" strokeWidth={2} />
                  <span>{t.label}<br />{t.label2}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-3.5">
              <a
                href={PHONE_HREF}
                className="flex items-center gap-3 rounded-[9px] bg-brand-yellow px-6 py-4 font-display font-bold text-brand-navy-deep"
              >
                <Phone className="h-5 w-5" />
                <span className="leading-tight">
                  CALL NOW<br /><span className="text-[13px] font-semibold">{PHONE}</span>
                </span>
              </a>
              <a
                href="/#quote"
                className="flex items-center gap-3 rounded-[9px] border-[1.5px] border-white/55 bg-white/10 px-6 py-4 font-display font-bold text-white"
              >
                <Calendar className="h-5 w-5" />
                <span className="leading-tight">
                  GET A FREE QUOTE<br /><span className="text-[13px] font-semibold">It's Fast &amp; Easy</span>
                </span>
              </a>
            </div>
          </div>

          {/* Reviews card */}
          <div className="mt-10 w-full max-w-[280px] rounded-xl bg-white p-5 text-brand-navy shadow-[0_18px_40px_rgba(0,0,0,.25)] lg:absolute lg:right-7 lg:bottom-24 lg:mt-0">
            <div className="mb-2 flex items-center gap-2.5">
              <svg width="26" height="26" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.2a5.3 5.3 0 01-2.3 3.5v2.9h3.7C21.8 18.9 23 15.9 23 12.3z"/>
                <path fill="#34A853" d="M12 24c3.1 0 5.7-1 7.6-2.8l-3.7-2.9c-1 .7-2.3 1.1-3.9 1.1-3 0-5.5-2-6.4-4.7H1.8v3C3.7 21.4 7.6 24 12 24z"/>
                <path fill="#FBBC05" d="M5.6 14.7a7.2 7.2 0 010-4.6v-3H1.8a12 12 0 000 10.6l3.8-3z"/>
                <path fill="#EA4335" d="M12 4.8c1.7 0 3.2.6 4.4 1.7l3.3-3.3C17.7 1.2 15.1 0 12 0 7.6 0 3.7 2.6 1.8 6.4l3.8 3C6.5 6.7 9 4.8 12 4.8z"/>
              </svg>
              <div>
                <span className="font-display text-[22px] font-extrabold">5.0</span>{" "}
                <span className="text-[15px] tracking-widest text-[#fbbc05]">★★★★★</span>
              </div>
            </div>
            <div className="mb-3 text-[11.5px] text-[#6a7688]">Based on 200+ Google Reviews</div>
            <div className="flex items-center gap-2.5 border-t border-[#eef2f7] pt-3 text-[13.5px] font-semibold">
              <CheckCircle2 className="h-5 w-5 text-brand-blue" />
              <span>Family Owned<br />&amp; Operated</span>
            </div>
          </div>
        </div>

        <svg viewBox="0 0 1440 90" preserveAspectRatio="none" className="absolute -bottom-px left-0 block h-16 w-full">
          <path d="M0,50 C360,110 1080,-20 1440,45 L1440,90 L0,90 Z" fill="#fff" />
        </svg>
      </section>

      {/* BEFORE / AFTER */}
      <section className="mx-auto max-w-[1180px] px-7 pb-6 pt-14">
        <div className="mb-8 text-center">
          <h2 className="m-0 font-display text-[28px] font-extrabold tracking-[.5px] text-brand-navy md:text-[30px]">
            FROM GREEN TO CRYSTAL CLEAR
          </h2>
          <div className="mt-1 font-script text-[34px] text-brand-blue">in Just Days!</div>
        </div>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-[1fr_1fr_340px]">
          <div className="relative min-h-[250px] overflow-hidden rounded-xl shadow-[0_10px_26px_rgba(0,0,0,.12)]">
            <img src={beforeGreen} alt="Green pool before service" className="absolute inset-0 h-full w-full object-cover" />
            <span className="absolute left-3.5 top-3.5 rounded bg-[#3a7d1e] px-3.5 py-1 text-xs font-bold tracking-widest text-white">BEFORE</span>
            <span className="absolute bottom-3 right-3.5 font-mono text-[11px] text-white/70">Green Pool</span>
          </div>
          <div className="relative min-h-[250px] overflow-hidden rounded-xl shadow-[0_10px_26px_rgba(0,0,0,.12)]">
            <img src={afterClear} alt="Crystal clear pool after service" className="absolute inset-0 h-full w-full object-cover" />
            <span className="absolute left-3.5 top-3.5 rounded bg-brand-blue px-3.5 py-1 text-xs font-bold tracking-widest text-white">AFTER</span>
            <span className="absolute bottom-3 right-3.5 font-mono text-[11px] text-white/90">Clean Pool</span>
          </div>
          <div className="rounded-xl bg-brand-mist p-6 lg:p-7">
            <h3 className="mb-2 font-display text-[19px] font-extrabold uppercase text-brand-navy">Your Pool Deserves the Best Care</h3>
            <div className="mb-4 h-[3px] w-[52px] rounded bg-brand-blue-bright" />
            <p className="mb-5 text-[14px] leading-[1.6] text-[#4b5b78]">
              We keep your pool clean, safe, and swim-ready year-round so you can relax and enjoy.
            </p>
            <ul className="flex flex-col gap-3 text-[14px] font-semibold text-brand-navy">
              {[
                "Reliable & On-Time Service",
                "Expert Technicians",
                "Quality You Can Trust",
                "Affordable Pricing",
              ].map((t) => (
                <li key={t} className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-4.5 w-4.5 text-brand-blue-bright" /> {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section className="mx-auto max-w-[1180px] px-7 pb-4 pt-12">
        <div className="mb-8 text-center">
          <h2 className="m-0 font-display text-[26px] font-extrabold text-brand-navy md:text-[28px]">OUR POOL SERVICES</h2>
          <div className="mx-auto mt-2.5 h-[3px] w-16 rounded bg-brand-blue-bright" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          {SERVICES.map((s) => (
            <div
              key={s.title}
              className="relative rounded-xl border border-[#e7eef6] bg-white p-6 text-center transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_14px_34px_rgba(11,42,91,.14)]"
            >
              <div className="mb-3.5 flex h-11 items-center justify-center">
                <s.icon className="h-9 w-9 text-brand-blue" strokeWidth={1.8} />
              </div>
              <h4 className="mb-2.5 font-display text-[14.5px] font-bold uppercase leading-[1.3] tracking-[.3px] text-brand-navy">{s.title}</h4>
              <p className="m-0 text-[12.5px] leading-[1.55] text-[#6a7688]">{s.desc}</p>
              {s.popular && (
                <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded bg-brand-yellow px-2.5 py-0.5 text-[10px] font-extrabold tracking-widest text-brand-navy-deep">
                  POPULAR
                </span>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* TESTIMONIALS + FORM */}
      <section id="quote" className="mx-auto max-w-[1180px] px-7 pb-12 pt-12">
        <div className="grid gap-9 lg:grid-cols-[1fr_340px]">
          <div>
            <h2 className="m-0 text-center font-display text-[24px] font-extrabold text-brand-navy md:text-[26px]">WHAT OUR CLIENTS SAY</h2>
            <div className="mx-auto mb-7 mt-1.5 h-[3px] w-16 rounded bg-brand-blue-bright" />
            <div className="grid gap-4 md:grid-cols-3">
              {REVIEWS.map((r) => (
                <div key={r.name} className="rounded-xl border border-[#e7eef6] bg-white p-5 shadow-[0_6px_18px_rgba(11,42,91,.05)]">
                  <div className="mb-3 flex items-center gap-2">
                    <svg width="22" height="22" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M23 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.2a5.3 5.3 0 01-2.3 3.5v2.9h3.7C21.8 18.9 23 15.9 23 12.3z"/>
                      <path fill="#34A853" d="M12 24c3.1 0 5.7-1 7.6-2.8l-3.7-2.9c-1 .7-2.3 1.1-3.9 1.1-3 0-5.5-2-6.4-4.7H1.8v3C3.7 21.4 7.6 24 12 24z"/>
                      <path fill="#FBBC05" d="M5.6 14.7a7.2 7.2 0 010-4.6v-3H1.8a12 12 0 000 10.6l3.8-3z"/>
                      <path fill="#EA4335" d="M12 4.8c1.7 0 3.2.6 4.4 1.7l3.3-3.3C17.7 1.2 15.1 0 12 0 7.6 0 3.7 2.6 1.8 6.4l3.8 3C6.5 6.7 9 4.8 12 4.8z"/>
                    </svg>
                    <span className="text-sm tracking-widest text-[#fbbc05]">★★★★★</span>
                  </div>
                  <p className="mb-4 text-[13px] italic leading-[1.6] text-[#42506a]">{r.quote}</p>
                  <div className="flex items-center gap-3">
                    <div className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-gradient-to-br from-[#8fd0f0] to-brand-blue text-sm font-bold text-white">
                      {r.initial}
                    </div>
                    <div className="text-[13px] font-bold text-brand-navy">– {r.name}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <QuoteForm />
        </div>
      </section>

      {/* FEATURE STRIP */}
      <section className="border-t border-[#dcebf7] bg-brand-mist">
        <div className="mx-auto grid max-w-[1180px] gap-6 px-7 py-9 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="flex items-start gap-3.5">
              <f.icon className="h-7 w-7 shrink-0 text-brand-blue" strokeWidth={1.8} />
              <div>
                <div className="font-display text-[13px] font-bold uppercase tracking-[.4px] text-brand-navy">{f.title}</div>
                <div className="mt-1 text-[12.5px] text-[#5a6b82]">{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

function QuoteForm() {
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); alert("Thanks! We'll be in touch shortly."); }}
      className="rounded-2xl bg-brand-navy p-7 text-white"
    >
      <h3 className="mb-5 font-display text-[20px] font-bold">GET YOUR FREE QUOTE</h3>
      <div className="flex flex-col gap-3">
        <input required placeholder="Full Name" className="rounded-md border border-white/20 bg-white/5 px-3.5 py-3 text-[13.5px] placeholder:text-white/60" />
        <input required placeholder="Phone Number" className="rounded-md border border-white/20 bg-white/5 px-3.5 py-3 text-[13.5px] placeholder:text-white/60" />
        <input required type="email" placeholder="Email Address" className="rounded-md border border-white/20 bg-white/5 px-3.5 py-3 text-[13.5px] placeholder:text-white/60" />
        <select className="rounded-md border border-white/20 bg-white/5 px-3.5 py-3 text-[13.5px] text-[#9fb2cf]">
          <option>What do you need help with?</option>
          <option>Weekly Maintenance</option>
          <option>Green Pool Cleanup</option>
          <option>Equipment Repair</option>
        </select>
        <button className="cursor-pointer rounded-lg bg-brand-yellow px-4 py-3.5 font-display text-sm font-extrabold tracking-wide text-brand-navy-deep">
          GET MY FREE QUOTE
        </button>
        <div className="text-center text-[11.5px] text-[#9fb2cf]">No commitment. Fast response!</div>
      </div>
    </form>
  );
}
