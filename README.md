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
npm test               # pricing, formatter, CSV, scale, stock-rule and billing tests
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

## Phase 2: POS & Billing

- **New bill.** Scan tags or open an estimate from the tablets. The server prices every line at today's rate (metal, making, stones, hallmark, 3% GST split into CGST and SGST) and recalculates it when the invoice is issued, so the browser never decides the amount.
- **Discounts** come off the making charge, up to a limit per role (owner 100%, branch manager 50%, cashier 10% by default).
- **Old gold in exchange.** Weighed, tested (fineness), valued at today's 24KT rate (999 for silver) less the shop's deduction (2% by default), and taken off the bill. Seller ID proof is required.
- **Advances and rate booking.** An advance can book today's rate for a purity and weight (at least 10% of its value). When the customer buys, booked grams are billed at the booked rate if the metal has risen, and at today's rate if it has fallen.
- **Split payments** across cash, UPI, card, bank transfer and cheque. They must add up exactly.
- **Invoices** are numbered per financial year (`MMJ/2627/000001`) and print as an A4 tax invoice with seller GSTIN, buyer PAN, HSN 7113, HUID, weights, rate, CGST/SGST and the amount in words. Pieces become sold.
- **Cancelling** an invoice (owner or branch manager, with a reason) returns the pieces to stock, restores used advances and credit notes, and puts what the customer paid on a credit note.
- **Returns** take pieces back from an invoice for a credit note (less the return deduction, 0% by default). Credit notes can pay a new bill or be paid out.
- **Old gold purchase** buys metal outright, with ID proof.
- **Day close** shows cash, UPI, card and bank totals taken and paid out, the cash that should be in the drawer, and records the count. A mismatch needs a note.
- **Customers** by mobile number, with their bills, advances and credit notes.

### Counter rules (confirm with the CA)

| Rule | Default | Setting key |
| --- | --- | --- |
| PAN required when a customer's purchases in a day reach | ₹2,00,000 | `panThreshold` |
| Cash from one customer in a day must stay below | ₹2,00,000 | `cashReceiptLimit` |
| Cash paid out to one person (old gold, refunds) at most | ₹10,000 | `cashPayoutLimit` |
| Hallmark charge per HUID piece | ₹45 | `hallmarkChargePerPiece` |
| Old gold deduction | 2% | `oldGoldDeductionPercent` |
| Return deduction | 0% | `returnDeductionPercent` |
| Making discount limits | manager 50%, cashier 10% | `discountLimits` |
| Billing needs today's rate | yes | `requireTodayRate` |

Settings live in the organization's `settings` JSON in the admin panel.

## Phase 3: Showroom tablets

- **Pairing.** A manager creates a six-digit code in Back Office › Settings › Showroom tablets; the tablet types it once and keeps a secret token. Unpairing locks the tablet out at once.
- **PIN sign-in.** Salespeople tap their name and type a 4–6 digit PIN (set in Settings › Staff & tablet PINs). Five wrong tries lock that person for ten minutes. The tablet locks itself after ten idle minutes.
- **Collection.** Every design with pieces on the floor, filtered by category, metal, price at today's rate, weight, and this branch or all branches.
- **Design page.** Each piece's price today with its breakdown, and exactly where it is: showcase › tray › slot, or which salesperson has it.
- **Take out / put back.** Taking a piece out marks it as in that salesperson's hands; nobody else can take it. "In my hands" lists everything still out.
- **Customer's tray.** Pieces the customer is considering, kept through a reload. Sending it to billing creates an estimate the counter bills.
- **Installable.** Add to home screen on the tablet for a full-screen app.

### API

| Method | Path | Who |
| --- | --- | --- |
| GET, POST, PUT | `/sales/customers`, `/sales/customers/:id` | Counter and sales staff |
| GET, POST | `/sales/estimates`, `/sales/estimates/:id`, `/sales/estimates/:id/cancel` | Counter and sales staff |
| POST | `/sales/quote` | Any staff (price only) |
| GET, POST | `/sales/invoices`, `/sales/invoices/:id` | Counter |
| POST | `/sales/invoices/:id/cancel` | Owner, branch manager |
| GET, POST | `/sales/old-gold`, `/sales/old-gold/quote` | Counter |
| GET, POST | `/sales/advances`, `/sales/advances/:id/refund` (refund: managers) | Counter |
| POST | `/sales/returns` | Counter |
| GET, POST | `/sales/credit-notes`, `/sales/credit-notes/:id/refund` (refund: managers) | Counter |
| GET, POST | `/sales/day`, `/sales/day/close` | Counter |
| GET, PUT | `/staff/organization` (PUT: owner) | Invoice details |
| GET, PUT | `/staff/team`, `/staff/team/:id/pin` | Managers; anyone for their own PIN |
| GET, POST | `/floor/devices`, `/floor/devices/:id/revoke` | Managers |
| POST, GET, POST | `/floor/pair`, `/floor/people`, `/floor/pin` | The tablet (device token, no sign-in) |
| GET, POST | `/floor/designs`, `/floor/designs/:id`, `/floor/pick`, `/floor/put-back`, `/floor/held` | Any staff |

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
