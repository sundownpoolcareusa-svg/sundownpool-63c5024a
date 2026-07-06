import { createFileRoute } from "@tanstack/react-router";
import {
  Phone, Calendar, UserCheck, Clock, BadgeCheck, DollarSign,
  ShieldCheck, ArrowRight, Search, Droplet, Trash2, Wrench,
  FlaskConical, Grid3x3, Sparkles, Waves,
} from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import heroPool from "@/assets/hero-pool.jpg";
import svcSkimmer from "@/assets/svc-skimmer-new.png";
import svcGreen from "@/assets/svc-green-new.png";
import svcFilter from "@/assets/svc-filter-new.png";
import svcRepair from "@/assets/svc-repair-new.png";
import svcWater from "@/assets/svc-water-new.png";
import svcTile from "@/assets/svc-tile-new.png";
import svcSalt from "@/assets/svc-salt-new.png";
import svcStartup from "@/assets/svc-startup-new.png";
import hiw1 from "@/assets/handoff-icons/hiw-1.png";
import hiw2 from "@/assets/handoff-icons/hiw-2.png";
import hiw3 from "@/assets/handoff-icons/hiw-3.png";
import hiw4 from "@/assets/handoff-icons/hiw-4.png";

export const Route = createFileRoute("/services")({
  component: ServicesPage,
  head: () => ({
    meta: [
      { title: "Our Pool Services — Sundown Pool Care" },
      { name: "description", content: "Weekly maintenance, green pool recovery, filter cleaning, equipment repair, water testing and more. Professional pool care in South Florida." },
    ],
  }),
});

const PHONE = "(561) 376-2428";
const PHONE_HREF = "tel:+15613762428";

const HERO_FEATURES = [
  { icon: UserCheck, title: "Experienced Technicians", desc: "Trained professionals you can trust." },
  { icon: Clock, title: "On-Time Service", desc: "We show up when we say we will." },
  { icon: BadgeCheck, title: "Satisfaction Guaranteed", desc: "100% satisfaction every time." },
  { icon: DollarSign, title: "Upfront Pricing", desc: "No hidden fees. Honest & fair." },
];

const SERVICES = [
  { icon: Search, img: svcSkimmer, title: "Weekly Pool Maintenance", desc: "Regular cleaning, water testing, chemical balancing, and equipment checks to keep your pool perfect." },
  { icon: Droplet, img: svcGreen, title: "Green Pool Cleanup", desc: "We remove algae and restore your pool to crystal clear quickly and safely." },
  { icon: Trash2, img: svcFilter, title: "Filter Cleaning", desc: "Deep cleaning for sand, cartridge and DE filters for maximum performance." },
  { icon: Wrench, img: svcRepair, title: "Pool Equipment Repair", desc: "Pump, heater, filter, and salt system repairs. We fix it right the first time." },
  { icon: FlaskConical, img: svcWater, title: "Water Testing & Chemical Balancing", desc: "We test your water and balance chemicals for a safe, clean and healthy pool." },
  { icon: Grid3x3, img: svcTile, title: "Pool Tile Cleaning", desc: "Remove buildup and calcium from tiles to keep your pool looking beautiful." },
  { icon: Sparkles, img: svcSalt, title: "Salt System Service", desc: "Salt cell cleaning, inspection and performance check for longer life and efficiency." },
  { icon: Waves, img: svcStartup, title: "Pool Start-Up", desc: "Opening service includes full inspection, cleaning, and balancing to get your pool ready." },
];

const HOW = [
  { n: "1", img: hiw4, title: "Schedule", desc: "Choose a service and schedule your appointment." },
  { n: "2", img: hiw3, title: "We Inspect", desc: "Our technician inspects your pool and equipment." },
  { n: "3", img: hiw2, title: "We Service", desc: "We clean, balance and service your pool with care." },
  { n: "4", img: hiw1, title: "You Enjoy", desc: "Relax and enjoy your clean, healthy, crystal-clear pool!" },
];

function ServicesPage() {
  return (
    <div className="w-full overflow-x-hidden bg-white font-body text-brand-ink">
      <SiteHeader active="SERVICES" />

      {/* HERO */}
      <section className="relative overflow-hidden bg-brand-navy text-white">
        <img src={heroPool} alt="Pool services" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-[rgba(3,10,24,.9)] via-[rgba(3,10,24,.62)] at-[42%] to-[rgba(3,10,24,.05)]" />
        <div className="relative mx-auto max-w-[1180px] px-7 pb-20 pt-10 md:pt-12">
          <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
            <div>
              <div className="mb-3 text-xs tracking-widest text-[#bcd4ef]">
                <a href="/" className="text-[#bcd4ef] hover:text-white">HOME</a> / SERVICES
              </div>
              <h1 className="mb-2 font-display text-[38px] font-extrabold leading-tight tracking-[-.5px] md:text-[46px]">
                Our Pool Services
              </h1>
              <div className="mb-5 font-display text-[22px] font-bold leading-tight text-brand-blue-bright md:text-[24px]">
                Everything your pool needs.<br />All in one place.
              </div>
              <p className="mb-6 max-w-[440px] text-[16px] leading-[1.6] text-[#d8e6f5]">
                From weekly maintenance to green pool recovery and equipment repairs, we keep your pool clean, safe, and crystal clear year-round.
              </p>
              <div className="flex flex-wrap gap-3.5">
                <a href={PHONE_HREF} className="flex items-center gap-3 rounded-lg bg-brand-yellow px-6 py-4 font-display font-bold text-brand-navy-deep">
                  <Phone className="h-5 w-5" />
                  <span className="leading-tight">
                    CALL NOW<br /><span className="text-[13px] font-semibold">{PHONE}</span>
                  </span>
                </a>
                <a href="/#quote" className="flex items-center gap-3 rounded-lg border-[1.5px] border-white/55 bg-white/10 px-6 py-4 font-display font-bold text-white">
                  <Calendar className="h-5 w-5" />
                  <span className="leading-tight">
                    GET A FREE QUOTE<br /><span className="text-[13px] font-semibold">Fast, Easy &amp; No Obligation</span>
                  </span>
                </a>
              </div>
            </div>
            <div className="rounded-xl bg-white p-6 text-brand-navy shadow-[0_18px_40px_rgba(0,0,0,.22)]">
              <ul className="flex flex-col gap-5">
                {HERO_FEATURES.map((f) => (
                  <li key={f.title} className="flex items-center gap-3">
                    <f.icon className="h-7 w-7 text-brand-blue" strokeWidth={1.8} />
                    <div>
                      <div className="font-display text-sm font-bold">{f.title}</div>
                      <div className="text-xs text-[#6a7688]">{f.desc}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
        <svg viewBox="0 0 1440 90" preserveAspectRatio="none" className="absolute -bottom-px left-0 block h-[60px] w-full">
          <path d="M0,55 C360,105 1080,-10 1440,50 L1440,90 L0,90 Z" fill="#fff" />
        </svg>
      </section>

      {/* SERVICES GRID */}
      <section className="mx-auto max-w-[1180px] px-7 pb-3 pt-10">
        <div className="mb-8 text-center">
          <h2 className="m-0 font-display text-[26px] font-extrabold text-brand-navy md:text-[28px]">OUR POOL SERVICES</h2>
          <div className="mx-auto mt-2.5 h-[3px] w-16 rounded bg-brand-blue-bright" />
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {SERVICES.map((s) => (
            <div key={s.title} className="group flex flex-col overflow-hidden rounded-xl border border-[#e7eef6] bg-white transition duration-200 hover:-translate-y-1 hover:shadow-[0_16px_36px_rgba(11,42,91,.16)]">
              <div className="relative h-[118px] overflow-hidden">
                <img src={s.img} alt={s.title} className="h-full w-full object-cover" />
                <div className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full bg-brand-navy shadow-[0_4px_12px_rgba(0,0,0,.25)]">
                  <s.icon className="h-5 w-5 text-white" strokeWidth={1.8} />
                </div>
              </div>
              <div className="flex flex-1 flex-col p-5 text-center">
                <h4 className="mb-2 font-display text-[15px] font-bold text-brand-navy">{s.title}</h4>
                <p className="m-0 flex-1 text-[12.5px] leading-[1.55] text-[#6a7688]">{s.desc}</p>
                <a href="/#quote" className="mt-4 inline-flex items-center justify-center gap-1.5 font-display text-xs font-bold tracking-[.6px] text-brand-blue transition-all group-hover:gap-2">
                  LEARN MORE <ArrowRight className="h-3 w-3" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* BLUE BANNER */}
      <section className="mx-auto max-w-[1180px] px-7 pt-8">
        <div className="relative flex flex-wrap items-center justify-between gap-6 overflow-hidden rounded-xl bg-gradient-to-r from-[#12508f] to-brand-navy px-6 py-6 md:px-8">
          <div className="flex items-center gap-4">
            <ShieldCheck className="h-10 w-10 text-white" strokeWidth={1.6} />
            <div>
              <div className="font-display text-[18px] font-bold text-white md:text-[20px]">Need a custom service or not sure what you need?</div>
              <div className="text-[14px] text-[#c3d6ef]">Our experts are here to help.</div>
            </div>
          </div>
          <a href="/#quote" className="flex items-center gap-2 rounded-lg bg-brand-yellow px-5 py-3.5 font-display text-[13px] font-extrabold tracking-wide text-brand-navy-deep">
            GET A FREE QUOTE <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="mx-auto max-w-[1080px] px-7 pb-11 pt-12">
        <div className="mb-9 text-center">
          <h2 className="m-0 font-display text-[24px] font-extrabold text-brand-navy md:text-[26px]">HOW IT WORKS</h2>
          <div className="mx-auto mt-2.5 h-[3px] w-16 rounded bg-brand-blue-bright" />
        </div>
        <div className="grid gap-4 md:grid-cols-7 md:items-center">
          {HOW.map((s, i) => (
            <div key={s.title} className={`flex items-center gap-3 ${i < HOW.length - 1 ? "md:col-span-2" : "md:col-span-1"}`}>
              <div className="flex items-center">
                <div className="z-10 flex h-[34px] w-[34px] items-center justify-center rounded-full bg-brand-navy font-display text-[15px] font-bold text-white">
                  {s.n}
                </div>
                <div className="-ml-3 flex h-[62px] w-[62px] items-center justify-center rounded-full bg-[#eef2f7]">
                  <img src={s.img} alt="" className="h-7 w-7" />
                </div>
              </div>
              <div>
                <h4 className="m-0 mb-1 font-display text-[13px] font-bold uppercase tracking-[.3px] text-brand-navy">{s.title}</h4>
                <p className="m-0 text-[12px] leading-[1.45] text-[#6a7688]">{s.desc}</p>
              </div>
              {i < HOW.length - 1 && (
                <div className="hidden px-2 text-[26px] font-bold text-[#1668b3] md:block">›</div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* CTA BAND */}
      <section className="relative overflow-hidden bg-brand-navy">
        <div className="absolute inset-0 bg-[radial-gradient(80%_140%_at_90%_50%,rgba(45,143,212,.35),transparent_60%)]" />
        <div className="relative mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-6 px-7 py-7">
          <div className="flex items-center gap-4">
            <div className="flex h-[46px] w-[46px] items-center justify-center rounded-full bg-[#1668b3]">
              <Phone className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="font-display text-[17px] font-extrabold text-white md:text-[19px]">READY FOR A CLEAN, HEALTHY POOL?</div>
              <div className="text-[14px] text-[#c3d6ef]">Call us today or request your free quote online.</div>
            </div>
          </div>
          <a href={PHONE_HREF} className="flex items-center gap-2 font-display text-[20px] font-extrabold text-white md:text-[23px]">
            <Phone className="h-5 w-5" /> {PHONE}
          </a>
          <a href="/#quote" className="flex items-center gap-2 rounded-lg bg-brand-yellow px-6 py-3.5 font-display text-[13px] font-extrabold tracking-wide text-brand-navy-deep">
            GET A FREE QUOTE <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

export default ServicesPage;
