import { useState } from "react";
import {
  Phone, Calendar, FlaskConical, Wrench, ShieldCheck, Check,
  ArrowRight, ClipboardList, Clock, ThumbsUp,
} from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

const PHONE = "(561) 376-2428";
const PHONE_HREF = "tel:+15613762428";

const HERO_BADGES = [
  { icon: Calendar, label: "Reliable", sub: "Scheduling" },
  { icon: FlaskConical, label: "Chemical", sub: "Balance" },
  { icon: Wrench, label: "Equipment", sub: "Check" },
  { icon: ShieldCheck, label: "Peace of", sub: "Mind" },
];

const WHY_CHOOSE = [
  "Consistent, professional care",
  "Prevent costly repairs",
  "Healthy, crystal-clear water",
  "Licensed & Insured Technicians",
  "100% Satisfaction Guaranteed",
];

const TABS = ["ONCE A WEEK", "TWICE A WEEK"] as const;

const PLANS = {
  "ONCE A WEEK": [
    {
      name: "BASIC PLAN",
      desc: "Perfect for pools that are in good condition.",
      features: [
        "Skim surface", "Vacuum pool", "Brush walls",
        "Empty skimmer & pump basket", "Check & adjust chemicals", "Equipment check",
      ],
      cta: "CHOOSE PLAN",
      color: "teal",
    },
    {
      name: "STANDARD PLAN",
      desc: "Our most popular plan for complete pool care.",
      features: [
        "Everything in Basic Plan", "Test & balance chemicals", "Clean tile line",
        "Inspect filter & equipment", "Backwash filter (as needed)",
        "Check salt system (if applicable)", "Report of service",
      ],
      cta: "CHOOSE PLAN",
      color: "navy",
      popular: true,
    },
    {
      name: "PREMIUM PLAN",
      desc: "Maximum care for a perfectly maintained pool.",
      features: [
        "Everything in Standard Plan", "Filter cleaning (as needed)",
        "Salt cell cleaning (as needed)", "Equipment deep inspection",
        "Water level check & adjust", "Priority service", "15% off repairs",
      ],
      cta: "CHOOSE PLAN",
      color: "teal",
    },
  ],
  "TWICE A WEEK": [
    {
      name: "BASIC PLAN",
      desc: "Perfect for pools that are in good condition.",
      features: [
        "Skim surface", "Vacuum pool", "Brush walls",
        "Empty skimmer & pump basket", "Check & adjust chemicals", "Equipment check",
      ],
      cta: "CHOOSE PLAN",
      color: "teal",
    },
    {
      name: "STANDARD PLAN",
      desc: "Our most popular plan for complete pool care.",
      features: [
        "Everything in Basic Plan", "Test & balance chemicals", "Clean tile line",
        "Inspect filter & equipment", "Backwash filter (as needed)",
        "Check salt system (if applicable)", "Report of service",
      ],
      cta: "CHOOSE PLAN",
      color: "navy",
      popular: true,
    },
    {
      name: "PREMIUM PLAN",
      desc: "Maximum care for a perfectly maintained pool.",
      features: [
        "Everything in Standard Plan", "Filter cleaning (as needed)",
        "Salt cell cleaning (as needed)", "Equipment deep inspection",
        "Water level check & adjust", "Priority service", "15% off repairs",
      ],
      cta: "CHOOSE PLAN",
      color: "teal",
    },
  ],
};

const ALL_PLANS = [
  { icon: ShieldCheck, label: "Licensed & Insured", sub: "Technicians" },
  { icon: Clock, label: "On-Time, Every Time", sub: "Service" },
  { icon: ThumbsUp, label: "Satisfaction", sub: "Guaranteed" },
  { icon: Calendar, label: "Easy Communication", sub: "& Updates" },
];

const HOW_IT_WORKS = [
  { n: "1", icon: Calendar, title: "Schedule", desc: "Choose your plan and we'll set up your service schedule." },
  { n: "2", icon: Wrench, title: "We Clean & Check", desc: "Our technician visits and performs a complete service." },
  { n: "3", icon: FlaskConical, title: "We Test & Balance", desc: "We test your water and balance chemicals for perfect results." },
  { n: "4", icon: ArrowRight, title: "You Enjoy", desc: "Relax and enjoy your clean, healthy, crystal-clear pool!" },
];

export function MaintenancePlansPage() {
  useDocumentTitle(
    "Maintenance Plans — Sundown Pool Care",
    "Simple weekly and twice-weekly pool maintenance plans. Professional care, crystal-clear water, and worry-free service in South Florida.",
  );
  const [tab, setTab] = useState<keyof typeof PLANS>("ONCE A WEEK");

  return (
    <div className="w-full overflow-x-hidden bg-white font-body text-brand-ink">
      <SiteHeader active="MAINTENANCE PLANS" />

      {/* HERO */}
      <section className="relative overflow-hidden bg-brand-navy text-white">
        <div className="absolute inset-0 bg-gradient-to-br from-[#1d4f86] via-[#123f70] to-brand-navy" />
        <div className="absolute inset-y-0 right-0 w-[52%] bg-gradient-to-br from-[#8fd6f2] via-[#2f9fdb] to-[#0f6fb2]" />
        <div className="absolute inset-y-0 right-0 w-[52%] bg-gradient-to-r from-brand-navy/85 to-brand-navy/10" />
        <div className="relative mx-auto max-w-[1180px] px-7 pb-24 pt-12">
          <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
            <div>
              <h1 className="mb-1 font-display text-[34px] font-extrabold leading-tight tracking-[-.3px] md:text-[40px]">
                POOL MAINTENANCE PLANS
              </h1>
              <div className="mb-5 font-display text-[24px] font-bold text-brand-blue-bright md:text-[27px]">
                Simple Plans. Crystal Clear Results.
              </div>
              <p className="mb-7 max-w-[470px] text-[16px] leading-[1.6] text-[#d8e6f5]">
                Keep your pool clean, safe, and swim-ready year-round with our professional maintenance plans. We handle the work, so you can enjoy your pool worry-free.
              </p>
              <div className="flex flex-wrap gap-7">
                {HERO_BADGES.map((b) => (
                  <div key={b.label} className="flex items-center gap-2.5 text-[13.5px] font-semibold">
                    <b.icon className="h-7 w-7" strokeWidth={1.7} />
                    <span>{b.label}<br />{b.sub}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="absolute left-1/2 top-[-18px] z-10 flex h-10 w-10 -translate-x-1/2 items-center justify-center rounded-full bg-[#1668b3] shadow-[0_6px_16px_rgba(0,0,0,.3)]">
                <ClipboardList className="h-5 w-5 text-white" />
              </div>
              <div className="rounded-xl bg-white p-6 pt-8 text-brand-navy shadow-[0_18px_40px_rgba(0,0,0,.25)]">
                <h3 className="mb-4 text-center font-display text-[15px] font-bold">WHY CHOOSE OUR PLANS?</h3>
                <ul className="flex flex-col gap-3.5 text-[13px] text-[#42506a]">
                  {WHY_CHOOSE.map((item) => (
                    <li key={item} className="flex items-center gap-2.5">
                      <Check className="h-4 w-4 shrink-0 text-brand-blue-bright" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
        <svg viewBox="0 0 1440 90" preserveAspectRatio="none" className="absolute -bottom-px left-0 block h-14 w-full">
          <path d="M0,60 C360,100 1080,0 1440,55 L1440,90 L0,90 Z" fill="#fff" />
        </svg>
      </section>

      {/* PLANS */}
      <section className="mx-auto max-w-[1080px] px-7 pb-3 pt-8">
        <h2 className="m-0 mb-5 text-center font-display text-[24px] font-extrabold text-brand-navy md:text-[26px]">
          CHOOSE THE PLAN THAT'S RIGHT FOR YOU
        </h2>
        <div className="mb-8 flex justify-center">
          <div className="flex gap-1 rounded-lg border border-[#dce7f2] bg-[#eef3f9] p-1">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`rounded-md px-5 py-2 font-display text-[12px] font-bold tracking-[.5px] transition ${
                  tab === t ? "bg-brand-navy text-white" : "bg-transparent text-brand-navy hover:bg-white"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-5 lg:grid-cols-3">
          {PLANS[tab].map((plan) => (
            <div
              key={plan.name}
              className={`overflow-hidden rounded-xl bg-white shadow-[0_10px_28px_rgba(11,42,91,.07)] transition hover:shadow-[0_20px_44px_rgba(11,42,91,.16)] ${
                plan.popular ? "relative border-2 border-brand-navy lg:-mt-1.5" : "border border-[#e2ebf4]"
              }`}
            >
              {plan.popular && (
                <div className="bg-brand-yellow py-1.5 text-center font-display text-[11px] font-extrabold tracking-widest text-brand-navy-deep">
                  MOST POPULAR
                </div>
              )}
              <div className={`py-3.5 text-center font-display text-[17px] font-bold tracking-[.5px] text-white ${plan.color === "navy" ? "bg-brand-navy" : "bg-[#1a8e9c]"}`}>
                {plan.name}
              </div>
              <div className="p-6 text-center">
                <p className="m-0 mb-5 text-[13px] text-[#6a7688]">{plan.desc}</p>
                <ul className="mb-5 flex flex-col gap-2.5 text-left text-[13px] text-[#3b485e]">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <Check className={`h-4 w-4 shrink-0 ${plan.color === "navy" ? "text-brand-blue" : "text-[#1a8e9c]"}`} />
                      {f}
                    </li>
                  ))}
                </ul>
                <div className="rounded-lg bg-[#f4f8fb] p-4">
                  <a href="/#quote" className={`block rounded-md py-3 text-center font-display text-[13px] font-bold text-white ${plan.color === "navy" ? "bg-brand-navy" : "bg-[#1a8e9c]"}`}>
                    {plan.cta}
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ALL PLANS INCLUDE */}
      <section className="mx-auto max-w-[1080px] px-7 pb-3 pt-10">
        <h2 className="m-0 text-center font-display text-[22px] font-extrabold text-brand-navy">ALL PLANS INCLUDE</h2>
        <div className="mx-auto mt-1.5 h-[3px] w-[60px] rounded bg-brand-blue-bright" />
        <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {ALL_PLANS.map((p) => (
            <div key={p.label} className="flex items-center justify-center gap-3 text-left">
              <p.icon className="h-7 w-7 text-brand-navy" strokeWidth={1.7} />
              <div className="font-display text-[13px] font-bold text-brand-navy">{p.label}<br /><span className="font-normal text-[#6a7688]">{p.sub}</span></div>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="mt-9 bg-brand-mist">
        <div className="mx-auto max-w-[1080px] px-7 py-10">
          <h2 className="m-0 text-center font-display text-[22px] font-extrabold text-brand-navy md:text-[24px]">HOW IT WORKS</h2>
          <div className="mx-auto mt-1.5 h-[3px] w-[60px] rounded bg-brand-blue-bright" />
          <div className="mt-8 grid gap-6 md:grid-cols-7 md:items-start">
            {HOW_IT_WORKS.map((s, i) => (
              <div key={s.title} className={`text-center ${i < HOW_IT_WORKS.length - 1 ? "md:col-span-2" : "md:col-span-1"}`}>
                <div className="relative mx-auto mb-3.5 h-[82px] w-[82px]">
                  <div className="flex h-[82px] w-[82px] items-center justify-center rounded-full border border-[#cfe3f4] bg-white">
                    <s.icon className="h-8 w-8 text-brand-blue" strokeWidth={1.5} />
                  </div>
                  <div className="absolute -left-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full bg-[#1668b3] font-display text-[13px] font-bold text-white">
                    {s.n}
                  </div>
                </div>
                <h4 className="m-0 mb-1.5 font-display text-[13px] font-bold uppercase text-brand-navy">{s.title}</h4>
                <p className="m-0 text-[12px] leading-[1.5] text-[#6a7688]">{s.desc}</p>
                {i < HOW_IT_WORKS.length - 1 && (
                  <div className="hidden px-2 pt-7 text-[22px] text-[#9cc4e4] md:block">›</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden bg-brand-navy">
        <div className="absolute inset-0 bg-[radial-gradient(70%_140%_at_10%_50%,rgba(45,143,212,.35),transparent_60%)]" />
        <div className="relative mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-6 px-7 py-7">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#1668b3]">
              <Phone className="h-7 w-7 text-white" />
            </div>
            <div className="font-display text-[19px] font-extrabold leading-tight text-white md:text-[21px]">
              HAVE QUESTIONS?<br />WE'RE HERE TO HELP!
            </div>
          </div>
          <div className="text-center">
            <div className="text-[14px] text-[#c3d6ef]">Call us or request a free quote today.</div>
            <a href={PHONE_HREF} className="font-display text-[24px] font-extrabold text-white md:text-[26px]">{PHONE}</a>
          </div>
          <a href="/#quote" className="flex items-center gap-2 rounded-lg bg-brand-yellow px-6 py-3.5 font-display text-[13px] font-extrabold tracking-wide text-brand-navy-deep">
            GET A FREE QUOTE <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
