# MMJ Suite

Website and internal business software for **Mukund Maid Jewellers** — gold, diamond and silver jewellery. One monorepo, one Strapi API, **npm workspaces + Turborepo**.

## Apps

| App | Path | Package | Port |
| --- | --- | --- | ---: |
| Website (storefront) | `apps/landing` | `@mmj/landing` | 3000 |
| Inventory management | `apps/inventory` | `@mmj/inventory` | 3001 |
| POS & billing | `apps/pos` | `@mmj/pos` | 3002 |
| CRM & loyalty | `apps/crm` | `@mmj/crm` | 3003 |
| **API** (Strapi 5) | `apps/backend` | `backend` | 1337 |

Shared packages: `@webfudge/ui`, `@webfudge/hooks`, `@webfudge/utils`, `@webfudge/config`, `@webfudge/auth`.

## Repository structure

```
mmj-web-v2/
├── apps/
│   ├── landing/      # Next.js storefront
│   ├── inventory/    # Next.js — stock, items, purchase, karigar
│   ├── pos/          # Next.js — counter sales and billing
│   ├── crm/          # Next.js — customers and loyalty
│   └── backend/      # Strapi 5 API
├── packages/
│   ├── ui/           # components, layouts, feedback, themes
│   ├── hooks/        # shared React hooks
│   ├── utils/        # formatters, api helpers, pricing
│   ├── config/       # brand, theme, constants
│   └── auth/         # auth components and services
└── tooling/
    └── tsconfig/     # shared tsconfig presets
```

## Getting started

Node.js **24.x**, npm **>= 9**. Install once from the root:

```bash
npm install
```

### Development

```bash
npm run dev            # every frontend (no backend)
npm run dev:all        # frontends + backend
npm run dev:landing
npm run dev:inventory
npm run dev:pos
npm run dev:crm
npm run dev:backend    # http://localhost:1337/admin
```

### Build

```bash
npm run build          # everything
npm run build:landing  # or :inventory, :pos, :crm, :backend
```

## Using shared packages

Add the package to the app's `dependencies` (`"@webfudge/ui": "*"`), list it in `transpilePackages` in the app's `next.config.ts`, then import:

```ts
import { Button } from "@webfudge/ui";
import { formatCurrency } from "@webfudge/utils/formatters";
```

## Storefront notes

Cart and wishlist persist in the browser. Checkout is a demonstration flow — nothing is charged or stored. Prices are derived from net weight, the day's rate, making charges and GST. Do not point the storefront at Strapi until the dummy data layer in `apps/landing/src/lib/catalog.ts` is swapped for fetches.

Content types in the backend (product, category, collection, stone, journal post, review, gold rate, store, global) are defined; public read is granted on first boot.
