import { Link } from "@tanstack/react-router";
import { Phone, Mail, MapPin, Clock, ShieldCheck, Facebook, Instagram } from "lucide-react";
import logoWhite from "@/assets/sundown-logo-new-white.png";

const DEFAULT_AREAS = ["Boca Raton", "Delray Beach", "Boynton Beach", "West Palm Beach", "Wellington", "And Surrounding Areas"];

export function SiteFooter({ areas = DEFAULT_AREAS }: { areas?: string[] }) {
  return (
    <footer className="relative overflow-hidden bg-brand-navy font-body text-[#c3d0e6]">
      <div className="pointer-events-none absolute inset-0 [background:radial-gradient(120%_90%_at_15%_0%,rgba(35,120,200,.20),rgba(35,120,200,0)_60%)]" />
      <div className="relative mx-auto grid max-w-[1180px] gap-8 px-7 py-14 md:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1.35fr_1.4fr_1.15fr]">
        <div>
          <img src={logoWhite} alt="Sundown Pool Care" className="mb-4 h-[90px] w-auto" />
          <p className="mb-5 max-w-[250px] text-[13.5px] leading-[1.7] text-[#a9bad6]">
            Professional pool cleaning, green pool cleanup, maintenance, and repairs. We keep your pool perfect, so you can enjoy what matters most.
          </p>
          <div className="flex gap-2.5">
            {[Facebook, Instagram].map((Icon, i) => (
              <a
                key={i}
                href="#"
                className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-white/10 text-white"
              >
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>

        <div>
          <h4 className="mb-4 font-display text-[13px] font-bold tracking-[1.5px] text-white">QUICK LINKS</h4>
          <ul className="flex flex-col gap-2.5 text-[13.5px]">
            <li><Link to="/" className="text-[#b4c4de] hover:text-white">Home</Link></li>
            <li><Link to="/services" className="text-[#b4c4de] hover:text-white">Services</Link></li>
            <li><Link to="/maintenance-plans" className="text-[#b4c4de] hover:text-white">Maintenance Plans</Link></li>
            <li><Link to="/about" className="text-[#b4c4de] hover:text-white">About Us</Link></li>
            <li><a href="/#quote" className="text-[#b4c4de] hover:text-white">Contact</a></li>
          </ul>
        </div>

        <div>
          <h4 className="mb-4 font-display text-[13px] font-bold tracking-[1.5px] text-white">SERVICE AREAS</h4>
          <ul className={`grid gap-x-4 gap-2.5 text-[13.5px] ${areas.length > 6 ? "grid-cols-2" : "grid-cols-1"}`}>
            {areas.map((a) => (
              <li key={a} className="flex items-center gap-2 text-[#b4c4de]">
                <MapPin className="h-3 w-3 shrink-0 fill-[#7fb6e6] text-[#7fb6e6]" /> {a}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="mb-4 font-display text-[13px] font-bold tracking-[1.5px] text-white">CONTACT US</h4>
          <ul className="flex flex-col gap-3 text-[13.5px]">
            <li className="flex items-center gap-2.5 text-[#b4c4de]"><Phone className="h-4 w-4 text-[#7fb6e6]" /> (561) 376-2428</li>
            <li className="flex items-center gap-2.5 text-[#b4c4de]"><Mail className="h-4 w-4 text-[#7fb6e6]" /> info@sundownpoolcare.com</li>
            <li className="flex items-center gap-2.5 text-[#b4c4de]"><MapPin className="h-4 w-4 text-[#7fb6e6]" /> South Florida</li>
            <li className="flex items-start gap-2.5 text-[#b4c4de]">
              <Clock className="mt-0.5 h-4 w-4 text-[#7fb6e6]" />
              <span>Mon – Fri: 7:00am – 6:00pm<br />Sat &amp; Sun: By Appointment</span>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="mb-4 font-display text-[13px] font-bold tracking-[1.5px] text-white">LICENSED &amp; INSURED</h4>
          <div className="flex items-start gap-3.5">
            <ShieldCheck className="h-14 w-14 text-[#7fb6e6]" strokeWidth={1.5} />
            <p className="mt-0.5 text-[13px] leading-[1.6] text-[#a9bad6]">
              We are fully licensed and insured for your peace of mind.
            </p>
          </div>
        </div>
      </div>

      <div className="relative border-t border-white/10">
        <p className="px-5 py-4 text-center text-[12.5px] text-[#8ea1c2]">© {new Date().getFullYear()} Sundown Pool Care. All Rights Reserved.</p>
      </div>
    </footer>
  );
}
