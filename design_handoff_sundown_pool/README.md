# Handoff: Sundown Pool Care — Website (5 pages)

## Overview
A complete marketing website for **Sundown Pool Care** (aka "Aussie Pool Care"), a South Florida pool-service company. Five pages: Home, Services, Maintenance Plans, About Us, Service Areas. Palette is navy + sky-blue + gold, with a recreated wave logo. Phone number used everywhere: **(561) 376-2428**.

## About the Design Files
The files in `designs/` are **design references built as HTML** (a custom `.dc.html` component format — each opens in a browser via `support.js`). They are prototypes showing the intended look and behavior — **NOT production code to copy directly**.

**Your task:** recreate these designs **inside the existing repository** — which is a **React 19 + TanStack Router + Tailwind CSS v4 + shadcn/ui (Radix)** app connected to Lovable. The repo ALREADY has the page + component scaffold; edit those files so the rendered site matches these mockups pixel-for-pixel. Do **not** drop the raw HTML in.

### Existing repo structure to edit (already present)
```
src/routes/index.tsx              → Home
src/routes/services.tsx           → Services
src/routes/maintenance-plans.tsx  → Maintenance Plans
src/routes/about.tsx              → About Us
src/routes/service-areas.tsx      → Service Areas
src/components/SiteHeader.tsx     → shared header (nav)
src/components/SiteFooter.tsx     → shared footer
src/components/AppLogo.tsx        → wave logo
src/assets/*.jpg / *.png          → real photos already in repo (hero-pool, before/after, svc-*, about-*, logos)
src/styles.css                    → Tailwind v4 theme tokens
```
Keep TanStack Router file-based routing, the shadcn/ui components, and `@/` import alias. Use `lucide-react` for icons (already a dependency) instead of the inline SVGs in the mockups. Use the real photos already in `src/assets/` — do not reintroduce the gradient placeholders.

> ⚠️ Lovable sync: this repo is connected to Lovable. Do not force-push / rebase pushed commits. Keep the branch in a working state — commits sync back to the Lovable editor.

## Fidelity
**High-fidelity (hifi).** Final colors, typography, spacing, and interactions below are exact. Recreate pixel-perfectly using the repo's Tailwind theme + shadcn components.

## Design Tokens
**Colors**
- Navy (primary/dark bg, headings): `#0b2a5b`
- Deep navy (top bar / darkest): `#0a2450` / `#0a2340`
- Sky blue (accent, links, active nav): `#2a8fd4`  ·  lighter accent `#37a7e6`
- Logo gradient blues: `#3f9ae0` (top wave), `#0e5aa7` (bottom wave); footer white + `#7fb6e6`
- Gold (CTA buttons): `#f5b301`, text on gold `#0b2340`
- Teal (Basic/Premium plan headers): `#1a8e9c`
- Body text: `#26364d` / `#42506a`; muted `#6a7688`
- Card border: `#e7eef6` / `#e2ebf4`; light section bg: `#eef6fc` / `#eaf4fc`; hairline `#eef2f7`
- Before/green pool gradient: `#6e7d3a→#3c5a2a`; after/clean: `#8fd6f2→#0f6fb2`

**Typography**
- Headings/nav/buttons/prices: **Montserrat** (600/700/800)
- Body: **Open Sans** (400/500/600/700)
- Accent script (e.g. "in Just Days!", signature line): **Caveat** (600/700)
- Hero H1 ~47px/800; section H2 ~26-30px/800; card titles ~14-15px/700; body 13-16px.

**Radius/shadow**
- Cards `border-radius: 12px`; pills/badges 6-8px; buttons 8-9px.
- Card shadow `0 8-18px 22-40px rgba(11,42,91,.07-.16)`; hover lifts `translateY(-3px/-4px)` + stronger shadow.

**Layout**
- Content max-width **1180px**, side padding 28px. Section vertical padding ~40-54px.

## Shared components

### SiteHeader (`src/components/SiteHeader.tsx`)
- White bar, bottom hairline `#eef2f7`, compact vertical padding (~2px).
- Left: wave logo (see AppLogo) + wordmark — "AUSSIE" (Montserrat 800, 25px, navy) over "POOL CARE" (Montserrat 600, 14px, `#2a8fd4`, letter-spacing 3px).
- Center nav (Montserrat 600, 13.5px, navy; hover/active `#2a8fd4`): **HOME · SERVICES ▾ · MAINTENANCE PLANS · ABOUT US · SERVICE AREAS · CONTACT**. Active link gets a 2px bottom border in `#2a8fd4`. All inner pages use this same single-row layout (no top utility bar).
- Right: gold **GET A FREE QUOTE** button (calendar icon) → links to Home `#quote` anchor.
- Responsive: below 860px the nav wraps and centers.

### SiteFooter (`src/components/SiteFooter.tsx`)
- Navy `#0a2a5c` bg, subtle blue radial glow top-left. 5 columns (→ 2 cols ≤860px → 1 col ≤560px):
  1. Logo + blurb + 4 round social buttons (f, ig, G, ✉).
  2. **QUICK LINKS**: Home, Services, Maintenance Plans, About Us, Contact.
  3. **SERVICE AREAS**: list with map-pin icons. Editable plain text — Home/other pages: Boca Raton, Delray Beach, Boynton Beach, West Palm Beach, Wellington, "And Surrounding Areas". (Service Areas page uses the Sarasota list — see below.)
  4. **CONTACT US**: phone (561) 376-2428, info@aussiepoolcare.com, location, hours (Mon–Fri 7:00am–6:00pm, Sat & Sun by appointment).
  5. **LICENSED & INSURED**: shield/star badge + reassurance line.
- Bottom bar: "© 2024 Aussie Pool Care. All Rights Reserved." centered, top hairline `rgba(255,255,255,.09)`.

### AppLogo (`src/components/AppLogo.tsx`)
Two stacked wave paths in an SVG (viewBox `0 0 52 40`): top wave `#3f9ae0`, bottom wave `#0e5aa7` (white + `#7fb6e6` on dark footer). Paths:
`M3 24 C 12 10, 32 8, 49 18 C 34 13, 16 15, 8 27 Z` and `M3 31 C 13 18, 33 16, 49 25 C 34 20, 17 22, 9 33 Z`.

## Screens / Views

### 1. Home (`index.tsx`)
- **Hero** (full-bleed): background = `hero-pool.jpg` with a left-to-right dark gradient overlay `linear-gradient(90deg, rgba(3,10,24,.9) 0%, .68 40%, .32 66%, .05 90%)` for legibility. Content constrained to 1180px, padding 70px/96px.
  - H1 (max 560px): "Professional Pool Care **& Green Pool Cleanup** in Southwest Florida" — the middle clause in `#37a7e6`. Subtext paragraph in `#d8e6f5`.
  - 4 trust items (icon + 2-line label): Licensed & Insured / 5-Star Rated / On-Time Every Time / 100% Satisfaction.
  - Two buttons: gold **CALL NOW (561) 376-2428** (tel: link) and outline **GET A FREE QUOTE** (→ `#quote`).
  - Floating white Google-review card (bottom-right on desktop; stacks below hero ≤860px): "5.0 ★★★★★", "Based on 200+ Google Reviews", "Australian Owned & Operated" with check icon.
  - White SVG wave divider at the bottom edge.
- **Before/After band**: heading "FROM GREEN TO CRYSTAL CLEAR" + Caveat "in Just Days!". Grid `1fr 1fr 340px`: green-pool image (BEFORE badge), clean-pool image (AFTER badge, circular → arrow), navy info card "Your Pool Deserves the Best Care" with 4 checkmark bullets. Use `before-pool.jpg` / `after-pool.jpg`.
- **Our Pool Services**: heading + 64px accent underline. 6-column grid of service cards (→ 2 col ≤560px). Each card: photo header with a navy round icon badge (top-right), uppercase title, short description. "Green Pool Cleanup" card has a gold **POPULAR** badge. Cards lift on hover. Photos: svc-skimmer/green/filter/repair/water/tile.jpg. Titles: Weekly Pool Maintenance · Green Pool Cleanup · Filter Cleaning · Pool Equipment Repair · Water Testing & Chemical Balancing · Pool Tile Cleaning.
- **Testimonials + Quote form** (`id="quote"`): left = "WHAT OUR CLIENTS SAY" 3 review cards (Google glyph + 5 gold stars, italic quote, round avatar initial + name). Right = navy card "GET YOUR FREE QUOTE" with inputs Full Name / Phone / Email, a select ("What do you need help with?"), and gold submit **GET MY FREE QUOTE**.
- **Feature strip**: light-blue band, 4 items (Easy Scheduling, No Hidden Fees, Satisfaction Guaranteed, Local & Trusted).
- Footer.

### 2. Services (`services.tsx`)
- **Hero** (full-bleed photo + dark gradient, upload/hero image): breadcrumb HOME / SERVICES, H1 "Our Pool Services", blue sub "Everything your pool needs. All in one place.", paragraph, CALL NOW + GET A FREE QUOTE buttons. Right: white card with 4 rows (Experienced Technicians, On-Time Service, Satisfaction Guaranteed, Upfront Pricing). Wave divider.
- **Our Pool Services**: 4-column grid of **8** cards (photo header + navy round icon + title + description + "LEARN MORE →"). Services: Weekly Pool Maintenance, Green Pool Cleanup, Filter Cleaning, Pool Equipment Repair, Water Testing & Chemical Balancing, Pool Tile Cleaning, Salt System Service, Pool Start-Up. Photos: svc-*.jpg.
- **Blue banner**: gradient navy rounded card — "Need a custom service or not sure what you need?" + gold **GET A FREE QUOTE →**.
- **How It Works**: horizontal 4 steps separated by blue "›" chevrons (stacks vertical ≤860px, hide chevrons). Each step = navy number circle (34px) overlapping a light `#eef2f7` icon circle (62px) + title + description. Steps: 1 Schedule (calendar) · 2 We Inspect (technician/search) · 3 We Service (flask) · 4 You Enjoy (swimmer). **Icons are custom PNGs in `designs/assets/hiw/1..4.png`** (1=swimmer, 2=flask, 3=technician, 4=calendar) — either copy those into `src/assets/` or substitute matching `lucide-react` icons (CalendarDays, UserSearch, FlaskConical, Waves).
- **CTA band** (navy): "READY FOR A CLEAN, HEALTHY POOL?" + phone + gold quote button.
- Footer.

### 3. Maintenance Plans (`maintenance-plans.tsx`)
- **Hero** (navy → blue split, right side photo): H1 "POOL MAINTENANCE PLANS", blue sub "Simple Plans. Crystal Clear Results.", paragraph, 4 inline feature items (Reliable Scheduling, Chemical Balance, Equipment Check, Peace of Mind). Right: white "WHY CHOOSE OUR PLANS?" card with 5 checkmark rows. Wave divider.
- **Plans**: heading + a **frequency toggle** segmented control with two options: **ONCE A WEEK / TWICE A WEEK** (navy active pill, navy text inactive). Use shadcn Tabs or a state toggle.
  - 3 plan cards: **BASIC** (teal header), **STANDARD** (navy header, gold "MOST POPULAR" ribbon, 2px navy border, slightly raised), **PREMIUM** (teal header). Each: icon, one-line description, checkmark feature list, and a **CHOOSE PLAN** button (Basic/Premium teal, Standard navy). **No prices are shown** (they were intentionally removed).
  - Feature lists — Basic: Skim surface, Vacuum pool, Brush walls, Empty skimmer & pump basket, Check & adjust chemicals, Equipment check. Standard: Everything in Basic + Test & balance chemicals, Clean tile line, Inspect filter & equipment, Backwash filter, Check salt system, Report of service. Premium: Everything in Standard + Filter cleaning, Salt cell cleaning, Equipment deep inspection, Water level check, Priority service, 15% off repairs.
- **All Plans Include**: 4 items (Licensed & Insured Technicians, On-Time Every Time, Satisfaction Guaranteed, Easy Communication & Updates).
- **How It Works** (light-blue band): 4 steps (Schedule, We Clean & Check, We Test & Balance, You Enjoy) — same horizontal pattern.
- **CTA band**: "HAVE QUESTIONS? WE'RE HERE TO HELP!" + phone + gold quote button.
- Footer.

### 4. About Us (`about.tsx`)
- **Hero** (light-blue bg): eyebrow "ABOUT US", H1 "Your Pool. Our Passion.", blue sub "Reliable Care You Can Count On.", intro paragraph, 4 divided inline badges (Licensed & Insured, Local & Family-Owned, 5-Star Service, On-Time Every Time). Right: photo `about-technician.jpg` (rounded 14px, big shadow).
- **Our Story**: left photo `about-family.jpg`; right eyebrow "OUR STORY", H2 "Built on Experience. Driven by Excellence.", 3 paragraphs, and a Caveat signature line "We care for your pool like it's our own." with blue underline.
- **Stats band** (navy, striped): 4 divided stats — 500+ Happy Customers · 10+ Years of Experience · South Florida · 100% Satisfaction (icon on left of each).
- **Our Values**: 4 items in circles (Integrity, Quality, Reliability, Care).
- **Testimonials** (light-blue band): 3 Google-review cards with avatar + name + city.
- **CTA band** (navy): "Ready for a Clean, Healthy Pool?" + CALL NOW + outline GET A FREE QUOTE.
- Footer.

### 5. Service Areas (`service-areas.tsx`)
- **Hero**: left text on light bg, right side a photo (`hero-pool.jpg` or map). H1 "Proudly Serving **Sarasota & Surrounding Areas**" (accent blue), paragraph, CALL NOW (navy) + GET A FREE QUOTE (white) buttons.
  - Below hero: dark-navy **trust strip** with 5 divided items (Local Pool Experts, Fast Response, Licensed & Insured, On-Time Every Time, 100% Satisfaction).
- **Service Area + Map**: left = eyebrow "OUR SERVICE AREA", H2 "We Bring Expert Pool Care to You", paragraph, 4 icon rows (Wide Coverage, Fast Response, Reliable Service, Licensed & Insured). Right = a **map image area** (490px tall, rounded) — in the repo, embed a real map image (Google Static Maps of Sarasota County or a screenshot). Overlay two cards: top-right blue "Serving Sarasota County & Beyond!" mini-card with logo; bottom-right white "AREAS WE SERVE" card with a 2-col checkmark list.
- **Not-sure banner**: light-blue rounded card "Not sure if we service your area?" + phone (561) 376-2428 (Call or Text) + gold GET A FREE QUOTE.
- **Why Choose**: 5 circle-icon items (Experienced Technicians, Top Quality Service, On-Time Every Time, Transparent Pricing, Local & Family-Owned).
- **CTA band** (navy): "Ready for a Clean, Healthy Pool?" + CALL NOW + outline quote.
- Footer. **On this page the footer's SERVICE AREAS column lists the Sarasota set** (2 columns): Sarasota, Siesta Key, Lakewood Ranch, Longboat Key, Bradenton, Palmer Ranch, Venice, North Port, Nokomis, Englewood, Osprey, Parrish — and location "Sarasota, FL".

## Interactions & Behavior
- **All GET A FREE QUOTE / GET MY FREE QUOTE buttons** navigate to the Home page quote form (`/#quote`). CALL NOW buttons are `tel:5613762428`. These links were audited — none should be dead (`#`).
- Service/plan cards lift on hover (`translateY`, deeper shadow). "LEARN MORE" arrow nudges right on hover.
- Maintenance frequency toggle switches active state between Once/Twice a Week (purely visual now that prices are removed; wire to state if you later re-add per-frequency content).
- Quote form: standard React state; validate name/phone/email; on submit show a success toast (sonner is available). Hook to Supabase if desired (repo already has `@supabase/supabase-js`).
- **Responsive**: multi-column grids collapse to 2 cols ≤860px and 1 col ≤560px; hero side-cards stack; nav wraps/centers; hero H1 scales down to ~30px on phones. (Use Tailwind `md:`/`lg:` breakpoints instead of the raw media queries in the mocks.)

## State Management
- Local component state only: maintenance frequency toggle, quote-form fields + submit status. No global store needed. Optional: submit the quote form to Supabase (table exists pattern in `src/lib/db.ts`).

## Assets
- **Photos already in the repo** (`src/assets/`): `hero-pool.jpg`, `before-pool.jpg`, `after-pool.jpg`, `svc-skimmer/green/filter/repair/water/tile/salt/startup.jpg`, `about-family.jpg`, `about-technician.jpg`, `pool.jpg`, and Sundown logos. **Prefer these over the gradient placeholders in the mockups.**
- **How-It-Works icons**: `designs/assets/hiw/1.png` (swimmer), `2.png` (flask), `3.png` (technician), `4.png` (calendar) — transparent PNGs. Copy into `src/assets/` or replace with `lucide-react`.
- **Service card icons** (small, optional): `designs/assets/svc/1..6.png`.
- **Map** (Service Areas): supply a real Sarasota-County map image (Google Static Maps or screenshot); the mock uses an illustrated placeholder.
- Icons throughout: replace the mockups' inline SVGs with `lucide-react` equivalents.

## Files (in this bundle, under `designs/`)
- `Home.dc.html`, `Services.dc.html`, `Maintenance Plans.dc.html`, `About Us.dc.html`, `Service Areas.dc.html` — the five page designs.
- `Header.dc.html`, `Footer.dc.html` — shared header/footer designs.
- `support.js`, `image-slot.js` — runtime for the `.dc.html` format (so you can open the files in a browser to see them render). **Not for production.**
- `assets/hiw/`, `assets/svc/` — icon PNGs. `hero-home.png` — the Home hero photo.

**To view a design:** serve the `designs/` folder over HTTP (e.g. `npx serve designs`) and open each `.dc.html` — they render exactly as intended. Opening via `file://` will not load the shared header/footer.
