import { createFileRoute } from "@tanstack/react-router";
import {
  Phone, Calendar, Shield, Users, Award, Clock, Handshake,
  BadgeCheck, Heart, MapPin, CheckCircle2,
} from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import technicianImg from "@/assets/about-technician-new.png";
import familyImg from "@/assets/about-family-new.png";

export const Route = createFileRoute("/about")({
  component: AboutPage,
  head: () => ({
    meta: [
      { title: "About Us — Sundown Pool Care | Trusted Pool Care in South Florida" },
      { name: "description", content: "Sundown Pool Care treats every pool like our own. Family-owned, licensed and insured, with years of experience serving homes and businesses across South Florida." },
    ],
  }),
});

const PHONE = "(561) 376-2428";
const PHONE_HREF = "tel:+15613762428";

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
  { quote: "Sundown Pool Care is the best! Our green pool looked brand new in just a few days. Professional, on time, and very affordable.", name: "Melissa R.", city: "Boca Raton, FL" },
  { quote: "Reliable service every week. They take care of everything so we can just enjoy our pool. Highly recommend!", name: "David L.", city: "Delray Beach, FL" },
  { quote: "Great communication and excellent results. Our pool has never been cleaner!", name: "Sarah K.", city: "Wellington, FL" },
];

function AboutPage() {
  return (
    <div className="w-full overflow-x-hidden bg-white font-body text-brand-ink">
      <SiteHeader active="ABOUT US" />

      {/* HERO */}
      <section className="bg-gradient-to-b from-[#f3f9fd] to-[#eaf4fb]">
        <div className="mx-auto grid max-w-[1180px] items-center gap-10 px-7 py-12 lg:grid-cols-2">
          <div>
            <div className="mb-3 font-display text-[13px] font-bold tracking-[2px] text-brand-blue">ABOUT US</div>
            <h1 className="m-0 font-display text-[36px] font-extrabold leading-[1.1] text-brand-navy md:text-[42px]">
              Your Pool. Our Passion.
            </h1>
            <div className="mb-5 font-display text-[22px] font-bold text-brand-blue-bright md:text-[26px]">
              Reliable Care You Can Count On.
            </div>
            <p className="m-0 mb-7 max-w-[480px] text-[15.5px] leading-[1.7] text-[#42506a]">
              At Sundown Pool Care, we believe a clean, healthy pool brings people together and creates the best moments. That's why we're dedicated to providing professional, honest, and high-quality pool care for homes and businesses across South Florida.
            </p>
            <div className="flex flex-wrap gap-0 border-t border-[#d6e6f2] pt-5">
              {HERO_BADGES.map((b, i) => (
                <div key={b.title} className={`flex items-center gap-2.5 pr-4 text-[12.5px] font-bold text-brand-navy ${i > 0 ? "border-l border-[#d6e6f2] pl-4" : ""}`}>
                  <b.icon className="h-6 w-6" strokeWidth={1.7} />
                  <span>{b.title}<br />{b.sub}</span>
                </div>
              ))}
            </div>
          </div>
          <img src={technicianImg} alt="Sundown pool technician testing water" className="h-[360px] w-full rounded-[14px] object-cover shadow-[0_20px_46px_rgba(11,42,91,.18)]" />
        </div>
      </section>

      {/* OUR STORY */}
      <section className="mx-auto grid max-w-[1180px] items-center gap-10 px-7 py-14 lg:grid-cols-[0.9fr_1.1fr]">
        <img src={familyImg} alt="Family enjoying their pool" className="h-[320px] w-full rounded-[14px] object-cover shadow-[0_16px_40px_rgba(11,42,91,.16)]" />
        <div>
          <div className="mb-2 font-display text-[13px] font-bold tracking-[2px] text-brand-blue">OUR STORY</div>
          <h2 className="m-0 mb-4 font-display text-[24px] font-extrabold text-brand-navy md:text-[28px]">
            Built on Experience. Driven by Excellence.
          </h2>
          <div className="space-y-3.5 text-[14.5px] leading-[1.7] text-[#42506a]">
            <p>With years of experience in the pool care industry, Sundown Pool Care was founded with a simple mission: to treat every pool as if it were our own.</p>
            <p>We know that every pool is unique, which is why we customize our services to meet your specific needs. From routine maintenance to complete green pool recovery, we have the knowledge, tools, and dedication to get the job done right.</p>
            <p>We're proud to be a trusted partner for hundreds of satisfied customers throughout South Florida.</p>
          </div>
          <div className="mt-4 inline-block border-b-2 border-brand-blue-bright pb-1 font-script text-[26px] text-brand-blue">
            We care for your pool like it's our own.
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="relative overflow-hidden bg-brand-navy text-white">
        <div className="absolute inset-0 bg-gradient-to-br from-[#123f70] to-brand-navy" />
        <div className="absolute inset-0 bg-[repeating-linear-gradient(115deg,rgba(255,255,255,.04)_0_2px,transparent_2px_24px)]" />
        <div className="relative mx-auto grid max-w-[1180px] gap-6 px-7 py-10 sm:grid-cols-2 lg:grid-cols-4">
          {STATS.map((s, i) => (
            <div key={s.label} className={`flex items-center gap-4 ${i < STATS.length - 1 ? "lg:border-r lg:border-white/10 lg:pr-4" : ""}`}>
              <s.icon className="h-10 w-10 text-[#7fb6e6]" strokeWidth={1.5} />
              <div>
                <div className="font-display text-[26px] font-extrabold md:text-[30px]">{s.big}</div>
                <div className="text-[12.5px] text-[#c3d6ef]">{s.label}<br />{s.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* VALUES */}
      <section className="mx-auto max-w-[1080px] px-7 py-12">
        <h2 className="m-0 text-center font-display text-[24px] font-extrabold text-brand-navy">OUR VALUES</h2>
        <div className="mx-auto mt-1.5 h-[3px] w-[60px] rounded bg-brand-blue-bright" />
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {VALUES.map((v) => (
            <div key={v.title} className="text-center px-2">
              <div className="mx-auto mb-4 flex h-[74px] w-[74px] items-center justify-center rounded-full bg-brand-mist">
                <v.icon className="h-8 w-8 text-brand-blue" strokeWidth={1.6} />
              </div>
              <h4 className="m-0 mb-2 font-display text-[15px] font-bold text-brand-navy">{v.title}</h4>
              <p className="m-0 text-[12.5px] leading-[1.6] text-[#6a7688]">{v.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="mt-11 bg-brand-mist">
        <div className="mx-auto max-w-[1120px] px-7 py-11">
          <h2 className="m-0 text-center font-display text-[22px] font-extrabold text-brand-navy md:text-[24px]">WHAT OUR CLIENTS SAY</h2>
          <div className="mx-auto mt-1.5 h-[3px] w-[60px] rounded bg-brand-blue-bright" />
          <div className="mt-7 grid gap-5 md:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="rounded-xl bg-white p-5 shadow-[0_8px_22px_rgba(11,42,91,.07)]">
                <div className="mb-3 flex items-center gap-2">
                  <svg width="22" height="22" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M23 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.2a5.3 5.3 0 01-2.3 3.5v2.9h3.7C21.8 18.9 23 15.9 23 12.3z"/>
                    <path fill="#34A853" d="M12 24c3.1 0 5.7-1 7.6-2.8l-3.7-2.9c-1 .7-2.3 1.1-3.9 1.1-3 0-5.5-2-6.4-4.7H1.8v3C3.7 21.4 7.6 24 12 24z"/>
                    <path fill="#FBBC05" d="M5.6 14.7a7.2 7.2 0 010-4.6v-3H1.8a12 12 0 000 10.6l3.8-3z"/>
                    <path fill="#EA4335" d="M12 4.8c1.7 0 3.2.6 4.4 1.7l3.3-3.3C17.7 1.2 15.1 0 12 0 7.6 0 3.7 2.6 1.8 6.4l3.8 3C6.5 6.7 9 4.8 12 4.8z"/>
                  </svg>
                  <span className="text-sm tracking-widest text-[#fbbc05]">★★★★★</span>
                </div>
                <p className="m-0 mb-5 text-[13px] leading-[1.6] text-[#42506a]">"{t.quote}"</p>
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-[#8fd0f0] to-brand-blue text-[15px] font-bold text-white">
                    {t.name[0]}
                  </div>
                  <div>
                    <div className="text-[13.5px] font-bold text-brand-navy">– {t.name}</div>
                    <div className="text-xs text-[#6a7688]">{t.city}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
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

export default AboutPage;
