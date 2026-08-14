# AirPods Store MVP

Bright Future — frontend-first, backend-ready e-commerce MVP for original AirPods.
The UI talks to domain models through a repository/provider layer, so the mock data
layer can be replaced by a real API without rewriting screens.

## Start

```bash
npm ci        # npm install if you have no lockfile yet
npm run dev
```

## Validation

The same four commands CI runs, in the same order:

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

## CI

`.github/workflows/ci.yml` runs install → typecheck → lint → test → build on every
pull request. Two details worth knowing:

- Install uses `npm ci` when `package-lock.json` exists and falls back to
  `npm install` with a warning when it does not, so the pipeline is reproducible as
  soon as the lockfile is committed. The npm download cache is keyed on the lockfile
  hash instead of `setup-node`'s default cache, which fails hard without a lockfile.
- When the job fails on a pull request, the tail of the captured output is posted as a
  PR comment. A red check with no readable reason turns every fix into a guess.

`.github/workflows/lockfile.yml` generates `package-lock.json` with
`npm install --package-lock-only` and commits it back to the branch. npm resolves the
dependency tree against the registry, so the lockfile cannot be produced in an offline
environment; CI is the one place with a real npm. It runs on changes to `package.json`
or to the workflow itself, or manually, and is a no-op when the lockfile is already in
sync. The lockfile commit is pushed with `GITHUB_TOKEN`, which by design does not start
a new workflow run — the next commit is what validates it.

## Architecture

- `app/` — App Router routes: `/`, `/shop`, `/products/[slug]`, `/cart`, `/checkout`,
  `/order/confirmation`, `/admin`
- `app/components/` — shared UI primitives, including one overlay implementation used by
  both the quick view modal and the mobile filter drawer
- `lib/domain.ts`, `lib/money.ts` — typed domain models and `Result` contracts; money is
  stored as integer kopecks with an explicit "unknown" state
- `lib/repositories.ts` — repository interfaces and mock implementations
- `lib/payment.ts`, `lib/delivery.ts`, `lib/analytics.ts` — provider abstractions
- `lib/config.ts` — business values in configuration rather than scattered in copy
- `*.test.ts(x)` — risk-based tests (Vitest + React Testing Library) next to the code

## Product-truth rules

- A product without a verified price is sold "по запросу": it cannot be added to the
  cart and the CTA opens a price request. Placeholder numbers are never shown as prices.
- The shown total covers goods only. Delivery is stated as confirmed after the order.
- An order exists only after a successful payment authorization. The confirmation page
  refuses anything that is not a paid order handed off by checkout.
- `/admin` is a prototype: `noindex`, denied in production unless `ADMIN_PREVIEW_ENABLED`
  is set for the build, and the nav link renders only when the route is reachable.

## Known limitations

- Payment is a mock provider and there is no backend, so nothing is charged and no order
  is persisted server-side.
- The checkout → confirmation handoff lives in `sessionStorage` behind a short-lived
  one-time token with a strict runtime parser. That stops forged and replayed
  confirmations in the browser, but it is not a server-side receipt.
- Prices, product highlights, specs, photos, delivery cost and warranty terms are
  business data. Those slots render honest empty states instead of invented content.
- ESLint 8 is end-of-life; moving to ESLint 9 requires a flat-config migration and is
  deliberately not bundled with this increment.
- The desktop filter toolbar is still a single row; the two-row layout from the design
  spec is the next step there.
