import { createFileRoute } from "@tanstack/react-router";
import {
  Phone, Calendar, MapPin, Clock, ShieldCheck, UserCheck,
  Search, Check, ArrowRight, ThumbsUp, DollarSign, Heart,
} from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import heroBg from "@/assets/service-area-new.png";
import mapImg from "@/assets/service-area-map.png";

export const Route = createFileRoute("/service-areas")({
  component: ServiceAreasPage,
  head: () => ({
    meta: [
      { title: "Service Areas — Sundown Pool Care | Sarasota & Surrounding Areas" },
      { name: "description", content: "Professional pool cleaning, green pool cleanup, equipment repair, and weekly maintenance throughout Sarasota County and surrounding areas." },
    ],
  }),
});

const PHONE = "(561) 376-2428";
const PHONE_HREF = "tel:+15613762428";

const AREAS = [
  "Sarasota", "Siesta Key", "Lakewood Ranch", "Longboat Key",
  "Bradenton", "Palmer Ranch", "Venice", "North Port",
  "Nokomis", "Englewood", "Osprey", "Parrish",
];

const TRUST = [
  { icon: UserCheck, label: "Local Pool", sub: "Experts" },
  { icon: Clock, label: "Fast", sub: "Response" },
  { icon: ShieldCheck, label: "Licensed &", sub: "Insured" },
  { icon: Calendar, label: "On-Time,", sub: "Every Time" },
  { icon: ThumbsUp, label: "100%", sub: "Satisfaction" },
];

const WHY = [
  { icon: UserCheck, title: "Experienced Technicians", desc: "Trained professionals you can trust." },
  { icon: Search, title: "Top Quality Service", desc: "We use the best products and equipment." },
  { icon: Clock, title: "On-Time, Every Time", desc: "We respect your time and schedule." },
  { icon: DollarSign, title: "Transparent Pricing", desc: "No hidden fees. Honest & fair." },
  { icon: Heart, title: "Local & Family-Owned", desc: "We care about our community." },
];

function ServiceAreasPage() {
  return (
    <div className="w-full overflow-x-hidden bg-white font-body text-brand-ink">
      <SiteHeader active="SERVICE AREAS" />

      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-r from-[#dff0fb] to-[#bfe0f4]">
        <img src={heroBg} alt="Sarasota pool service area" className="absolute right-0 top-0 h-full w-[58%] object-cover" />
        <div className="absolute left-0 top-0 h-full w-[52%] bg-gradient-to-r from-[#eef7fd] to-transparent" />
        <div className="relative mx-auto max-w-[1180px] px-7 pb-4 pt-12">
          <div className="max-w-[520px]">
            <h1 className="m-0 mb-4 font-display text-[34px] font-extrabold leading-[1.08] text-brand-navy md:text-[44px]">
              Proudly Serving <span className="text-brand-blue">Sarasota &amp; Surrounding Areas</span>
            </h1>
            <p className="m-0 mb-6 max-w-[440px] text-[15.5px] leading-[1.6] text-[#3d4d63]">
              Professional pool cleaning, green pool cleanup, equipment repair, and weekly maintenance throughout Sarasota County.
            </p>
            <div className="flex flex-wrap gap-3.5">
              <a href={PHONE_HREF} className="flex items-center gap-3 rounded-lg bg-[#123f70] px-5 py-3.5 font-display font-bold text-white">
                <Phone className="h-5 w-5" />
                <span className="leading-tight">
                  CALL NOW<br /><span className="text-[12.5px] font-semibold">{PHONE}</span>
                </span>
              </a>
              <a href="/#quote" className="flex items-center gap-3 rounded-lg border-[1.5px] border-[#cfe0ef] bg-white px-5 py-3.5 font-display font-bold text-brand-navy">
                <Calendar className="h-5 w-5 text-brand-blue" />
                <span className="leading-tight">
                  GET A FREE QUOTE<br /><span className="text-[12.5px] font-semibold">Fast, Easy &amp; No Obligation</span>
                </span>
              </a>
            </div>
          </div>
        </div>
        {/* trust strip */}
        <div className="relative mt-8 bg-gradient-to-r from-[#0a2450] to-[#123f70]">
          <div className="mx-auto grid max-w-[1180px] gap-4 px-7 py-4 sm:grid-cols-2 lg:grid-cols-5">
            {TRUST.map((t, i) => (
              <div key={t.label} className={`flex items-center gap-3 text-white ${i < TRUST.length - 1 ? "lg:border-r lg:border-white/10 lg:pr-3" : ""}`}>
                <t.icon className="h-7 w-7 text-[#8fc0ea]" strokeWidth={1.6} />
                <span className="text-[13px] font-bold">{t.label}<br />{t.sub}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SERVICE AREA + MAP */}
      <section className="mx-auto grid max-w-[1180px] gap-10 px-7 py-12 lg:grid-cols-[0.85fr_1.15fr]">
        <div>
          <div className="mb-2 font-display text-[13px] font-bold tracking-[2px] text-brand-blue">OUR SERVICE AREA</div>
          <h2 className="m-0 mb-4 font-display text-[26px] font-extrabold leading-tight text-brand-navy md:text-[30px]">
            We Bring Expert Pool Care to You
          </h2>
          <p className="m-0 mb-6 text-[14.5px] leading-[1.7] text-[#42506a]">
            No matter where you are in Sarasota County, our team is just around the corner and ready to keep your pool clean, safe, and beautiful.
          </p>
          <div className="flex flex-col gap-5">
            {[
              { icon: MapPin, title: "WIDE COVERAGE", desc: "Serving Sarasota and surrounding communities." },
              { icon: Clock, title: "FAST RESPONSE", desc: "We respond quickly and show up on time." },
              { icon: UserCheck, title: "RELIABLE SERVICE", desc: "On-time, every time. Your satisfaction is our priority." },
              { icon: ShieldCheck, title: "LICENSED & INSURED", desc: "Fully licensed and insured for your peace of mind." },
            ].map((b) => (
              <div key={b.title} className="flex gap-3.5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-mist">
                  <b.icon className="h-5 w-5 text-brand-blue" strokeWidth={1.7} />
                </div>
                <div>
                  <div className="font-display text-[14px] font-bold text-brand-navy">{b.title}</div>
                  <div className="text-[13px] text-[#6a7688]">{b.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Map */}
        <div className="relative h-[490px] overflow-hidden rounded-[14px] shadow-[0_16px_40px_rgba(11,42,91,.14)]">
          <img src={mapImg} alt="Map of Sarasota County service area" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute right-4 top-4 w-[210px] rounded-[10px] bg-[#1668b3] p-4 text-white shadow-[0_8px_20px_rgba(0,0,0,.2)]">
            <div className="mb-1 font-display text-[14px] font-bold leading-tight">Serving Sarasota County &amp; Beyond!</div>
            <div className="text-[12px] text-[#d6e6f5]">Our team is local, experienced, and ready to help.</div>
          </div>
          <div className="absolute bottom-4 right-4 w-[250px] rounded-[10px] bg-white p-4 shadow-[0_8px_22px_rgba(0,0,0,.18)]">
            <div className="mb-3 font-display text-[13px] font-bold text-brand-navy">AREAS WE SERVE</div>
            <div className="grid grid-cols-2 gap-2 text-[12px] text-[#42506a]">
              {AREAS.map((a) => (
                <div key={a} className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-brand-blue" />
                  {a}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* NOT SURE BANNER */}
      <section className="mx-auto max-w-[1180px] px-7 pb-3">
        <div className="flex flex-wrap items-center gap-6 rounded-xl border border-[#d6e8f6] bg-[#eaf4fc] p-5">
          <div className="h-16 w-16 shrink-0 rounded-full bg-gradient-to-br from-[#8fd6f2] to-[#2f9fdb]" />
          <div className="min-w-[220px] flex-1">
            <div className="font-display text-[17px] font-bold text-brand-navy md:text-[19px]">Not sure if we service your area?</div>
            <div className="text-[14px] text-[#42506a]">Contact us today and we'll be happy to let you know if we can help!</div>
          </div>
          <div className="flex items-center gap-2 border-l border-[#cfe0ef] pl-5">
            <Phone className="h-6 w-6 text-brand-blue" />
            <div>
              <a href={PHONE_HREF} className="font-display text-[20px] font-extrabold text-brand-blue md:text-[22px]">{PHONE}</a>
              <div className="text-xs text-[#6a7688]">Call or Text</div>
            </div>
          </div>
          <a href="/#quote" className="flex items-center gap-2 rounded-lg bg-brand-yellow px-5 py-3.5 font-display text-[12.5px] font-extrabold tracking-wide text-brand-navy-deep">
            <Calendar className="h-4 w-4" />
            GET A FREE QUOTE
          </a>
        </div>
      </section>

      {/* WHY CHOOSE */}
      <section className="mx-auto max-w-[1120px] px-7 py-12">
        <h2 className="m-0 text-center font-display text-[22px] font-extrabold text-brand-navy md:text-[24px]">WHY CHOOSE SUNDOWN POOL CARE?</h2>
        <div className="mx-auto mt-1.5 h-[3px] w-[60px] rounded bg-brand-blue-bright" />
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
          {WHY.map((w) => (
            <div key={w.title} className="text-center px-1.5">
              <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-brand-mist">
                <w.icon className="h-7 w-7 text-brand-blue" strokeWidth={1.6} />
              </div>
              <h4 className="m-0 mb-1.5 font-display text-[13px] font-bold uppercase tracking-[.3px] text-brand-navy">{w.title}</h4>
              <p className="m-0 text-[12px] leading-[1.55] text-[#6a7688]">{w.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA BAND */}
      <section className="relative overflow-hidden bg-brand-navy">
        <div className="absolute inset-0 bg-[repeating-linear-gradient(115deg,rgba(255,255,255,.04)_0_2px,transparent_2px_24px)]" />
        <div className="relative mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-6 px-7 py-7">
          <div>
            <div className="font-display text-[21px] font-bold text-white md:text-[23px]">Ready for a Clean, Healthy Pool?</div>
            <div className="text-[14px] text-[#c3d6ef]">Let our experts handle the work so you can enjoy your pool worry-free.</div>
          </div>
          <div className="flex flex-wrap gap-3.5">
            <a href={PHONE_HREF} className="flex items-center gap-3 rounded-lg bg-brand-yellow px-6 py-3.5 font-display font-bold text-brand-navy-deep">
              <Phone className="h-5 w-5" />
              <span className="leading-tight">
                CALL NOW<br /><span className="text-[12.5px] font-semibold">{PHONE}</span>
              </span>
            </a>
            <a href="/#quote" className="flex items-center gap-3 rounded-lg border-[1.5px] border-white/55 bg-transparent px-6 py-3.5 font-display font-bold text-white">
              <Calendar className="h-5 w-5" />
              <span className="leading-tight">
                GET A FREE QUOTE<br /><span className="text-[12.5px] font-semibold">Fast, Easy &amp; No Obligation</span>
              </span>
            </a>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

export default ServiceAreasPage;
