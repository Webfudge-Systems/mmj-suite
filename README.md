# MMJ Suite

Website and internal business software for **Mukund Maid Jewellers** — gold, diamond and silver jewellery. One monorepo, one Strapi API, **npm workspaces + Turborepo**.

## Apps

| App | Path | Package | Port |
| --- | --- | --- | ---: |
| Website (storefront) | `apps/landing` | `@mmj/landing` | 3000 |
| Back Office (inventory) | `apps/inventory` | `@mmj/inventory` | 3001 |
| POS & billing | `apps/pos` | `@mmj/pos` | 3002 |
| CRM & loyalty | `apps/crm` | `@mmj/crm` | 3003 |
| Showroom (salesperson tablets) | `apps/showroom` | `@mmj/showroom` | 3004 |
| **API** (Strapi 5) | `apps/backend` | `backend` | 1337 |

Shared packages: `@webfudge/ui`, `@webfudge/hooks`, `@webfudge/utils`, `@webfudge/config`, `@webfudge/auth`.

## Repository structure

```
mmj-suite/
├── apps/
│   ├── landing/      # Next.js storefront
│   ├── inventory/    # Next.js Back Office: rates now, stock from phase 1
│   ├── pos/          # Next.js counter sales and billing
│   ├── crm/          # Next.js customers and loyalty
│   ├── showroom/     # Next.js tablet app for salespeople
│   └── backend/      # Strapi 5 API
├── packages/
│   ├── ui/           # MMJ theme, fonts, components, app shell, rate board
│   ├── hooks/        # useCurrentRates
│   ├── utils/        # pricing, formatters, API client (tested)
│   ├── config/       # brand, purities, staff roles, constants
│   └── auth/         # AuthProvider, LoginForm, RequireAuth
└── tooling/
    └── tsconfig/     # shared tsconfig presets
```

## Getting started

Node.js **24.x**, npm **>= 9**. Install once from the root:

```bash
npm install
```

Copy the env examples:

- `apps/backend/.env.example` to `apps/backend/.env`, then fill in the secrets. Set `SEED_OWNER_EMAIL` and `SEED_OWNER_PASSWORD` to create an owner account on first boot.
- `apps/<app>/.env.example` to `apps/<app>/.env.local` for each frontend. It holds only `NEXT_PUBLIC_API_URL`.

On an empty database the backend creates the MMJ organization and branch **B1 Rahuri**. Local development uses SQLite; production runs on PostgreSQL (`DATABASE_CLIENT=postgres`, `DATABASE_URL=…`).

### Development

```bash
npm run dev:backend    # API on :1337, admin panel at /admin
npm run dev            # every frontend (no backend)
npm run dev:all        # frontends + backend
npm run dev:inventory  # or :landing, :pos, :crm, :showroom
```

### Build and test

```bash
npm run build          # everything
npm run build:landing  # or :inventory, :pos, :crm, :showroom, :backend
npm test               # pricing and formatter tests
```

## Phase 0: what works

- **Staff and branches.** Every user belongs to an organization and has a staff role (owner, branch manager, cashier, salesperson, stock keeper, karigar manager, accountant) and one or more branches. Accounts are managed in the Strapi admin panel until the Settings screen arrives.
- **Sign-in.** Short-lived access tokens with an httpOnly refresh cookie that rotates on every use. `@webfudge/auth` handles it for every app.
- **Daily rates.** The owner or a branch manager publishes the morning rate in Back Office → Rates & pricing. Cards are never edited; each new card replaces the last. Moves above 3% need the owner to confirm, and a higher purity can never be quoted below a lower one.
- **One price calculation.** `calculatePrice` in `@webfudge/utils/pricing` works in paise and milligrams so every screen agrees to the paisa.
- **Live rate everywhere.** Back Office, POS, CRM and Showroom read the current card and refresh every minute. The storefront's gold-rate page and announcement bar read it with 60-second revalidation, and fall back to the static rates if the API is down.
- **Audit log.** Every create, update and delete on organizations, branches, rate cards and users is recorded with who did it.

### API

| Method | Path | Who |
| --- | --- | --- |
| GET | `/api/rates/current` | Public |
| GET | `/api/rates/history?limit=30` | Any staff |
| POST | `/api/rates` | Owner, branch manager |
| GET | `/api/staff/me` | Any staff |

## Using shared packages

Add the package to the app's `dependencies` (`"@webfudge/ui": "*"`), list it in `transpilePackages` in the app's `next.config.ts`, then import:

```ts
import { Button, RateBoard } from "@webfudge/ui";
import { formatRupees } from "@webfudge/utils/formatters";
import { calculatePrice } from "@webfudge/utils/pricing";
```

Internal apps import the theme in `globals.css`:

```css
@import "tailwindcss";
@import "../../../../packages/ui/src/styles/theme.css";
@source "../../../../packages/ui/src";
```

The backend compiles on its own and cannot import the TypeScript packages. Its copy of the purity and role lists lives in `apps/backend/src/utils/constants.ts`; keep it in step with `packages/config`.

## Storefront notes

Cart and wishlist persist in the browser. Checkout is a demonstration flow — nothing is charged or stored. Product prices still come from the static catalogue in `apps/landing/src/lib/catalog.ts` and `src/data/rates.ts`; they move to live rates when the website is connected to the backend catalogue in phase 4.
