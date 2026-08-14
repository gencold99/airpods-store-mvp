# Bright Future — Design Handoff

## Brand direction
Independent premium technology retailer: quiet confidence, bright surfaces, precise typography, product-first composition. No Apple imitation, no marketplace density, no decorative 3D.

## Tokens
- Background `#F7F9FC`, surface `#FFFFFF`, soft `#EEF2F7`
- Ink `#101319`, muted `#657080`, border `#E1E7EF`
- Accent `#4D6FFF`, strong accent `#3154E8`
- Radius 20px cards / 999px pills; restrained shadows via borders and contrast

## Screens
- `/`: product-led hero answers what/why/how, featured products, trust, rationale.
- `/shop`: discovery-first grid, sorting/filter controls, availability and price placeholders.
- `/products/[slug]`: gallery slot, purchase panel, variant, delivery, warranty, specifications.
- `/cart`: transparent items, quantity, promo, delivery and total; empty state.
- `/checkout`: guest flow with visible progress and explicit payment states.
- `/admin`: operational frontend MVP with mock sections.

## Responsive rules
At <=760px, one-column layout, compact navigation, product-first hero art above text, filter controls become drawer-ready, and purchase actions remain within thumb reach.

## Interaction and motion
Use short opacity/translate transitions only for feedback. Respect `prefers-reduced-motion`; never block purchase or navigation.

## Designer → Coder decision
Start with a coherent token system and replaceable asset slots. Business unknowns remain visibly labeled rather than fabricated.
