Replace the current site logo asset with the newly uploaded "Sundown Pool Care" logo image, keeping all existing sizes and layout exactly as they are.

### What will change
- Update `src/assets/sundown-logo.png.asset.json` to point to the new high-resolution logo file you just uploaded.
- Keep every existing logo size in the codebase unchanged (header, footer, mobile/desktop variants, auth page, admin panel, invoices, estimates).
- Preserve white backgrounds where they already exist (header, footer, auth card).
- Do not touch any CSS/Tailwind sizing classes or layout spacing.

### What will NOT change
- No color, font, spacing, or component changes.
- No changes to login form, navigation, hero section, or invoice/estimate templates.
- No resizing of the logo anywhere.

### Verification
- Run `bunx tsc --noEmit` to confirm no build/type errors after the asset swap.
- Confirm the new logo renders on the homepage, login page, and footer without size changes.