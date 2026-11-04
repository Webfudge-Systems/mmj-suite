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
npm test               # pricing, formatter, CSV, scale and stock-rule tests
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

## Phase 1: Back Office stock

- **Catalogue.** Designs with a category, usual purity, making charge and photos. Design numbers are automatic (`D-NK-0001`, from the category code) or typed. Categories and their codes are in Settings.
- **Receive stock.** One receipt per supplier bill or karigar delivery (`GRN-000001`). Each line is weighed (type it, or connect a USB/serial scale in Chrome or Edge), and becomes one piece with its own tag (`MMJ-G-000001`; S for silver, P for platinum). HUIDs and old tag numbers must be unique.
- **Tags & labels.** Code128 barcodes on a two-flap dumbbell tag (90 × 12 mm) or a 50 × 25 mm sticker. Print with the label printer and paper size set to the label size.
- **Locations.** Showcases, counters and safes, with trays inside (`B1-SC01-T05`). Each tray has a QR label; scanning pieces on a tray's page puts them there.
- **Stock.** Every piece, filterable by status, purity, tray and "waiting for a tray". Each piece shows its price at today's rate and its full history. Corrections need a reason and are recorded with before and after values.
- **Transfers.** Scan pieces out of one branch (`TRF-000001`); they are in transit until the other branch scans them in.
- **Stock audit.** Count a tray, a showcase or the whole branch. Each scan says counted, already counted, belongs elsewhere or unknown. Closing lists missing, misplaced and unknown pieces. A count never changes stock by itself.
- **Branches.** The owner adds branches in Settings. The owner works in every branch; others in the branches on their account.
- **Ledger.** Every change to a piece (received, imported, moved, edited, sent, arrived) is a row in `stock_movements`. Pieces change only through the stock endpoints.

### Loading current stock

Back Office → Receive stock → Import current stock. Export the stock list from the old software as CSV; the import recognises common column names (Tag No, Gross Wt, Purity, Design No, Category, HUID, Tray). It checks every row first and saves nothing if any row is wrong. Each piece gets an MMJ tag and keeps its old tag number, so old tags still scan everywhere. Designs the suite does not know are created from the category and name.

Create the showcases and trays in Locations before importing if the file has a tray column.

### Roles

| Action | Who |
| --- | --- |
| Receive, import, move, transfer, audit, correct pieces | Owner, branch manager, stock keeper |
| Add designs, categories, suppliers | Owner, branch manager, stock keeper |
| See cost prices | Owner, branch manager, stock keeper, accountant |
| Add branches | Owner |
| Look up stock | Any staff |

### API

All under `/api`, signed in as staff.

| Method | Path | Does |
| --- | --- | --- |
| GET, POST, PUT | `/stock/categories`, `/stock/categories/:id` | Categories |
| GET, POST, PUT | `/stock/designs`, `/stock/designs/:id` | Designs |
| GET, POST, PUT | `/stock/suppliers`, `/stock/suppliers/:id` | Suppliers and karigars |
| GET, POST, PUT | `/stock/locations`, `/stock/locations/:id` | Locations; `GET /stock/locations/lookup?code=` opens a scanned tray |
| GET | `/stock/items`, `/stock/items/:id`, `/stock/items/lookup?code=` | Pieces; lookup takes a tag, old tag or HUID |
| PUT | `/stock/items/:id` | Correct a piece's details |
| POST | `/stock/move` | Put scanned pieces into a tray |
| GET, POST | `/stock/receipts`, `/stock/receipts/:id` | Receive pieces |
| POST | `/stock/import` | Import opening stock in batches; `dryRun: true` only checks |
| GET, POST | `/stock/transfers`, `/stock/transfers/:id`, `/stock/transfers/:id/receive` | Branch transfers |
| GET, POST | `/stock/audits`, `/stock/audits/:id`, `/stock/audits/:id/scan`, `/stock/audits/:id/close` | Stock counts |
| GET | `/stock/summary` | Dashboard counts |
| GET, POST, PUT | `/staff/branches`, `/staff/branches/:id` | Branches; adding and editing is owner only |

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
