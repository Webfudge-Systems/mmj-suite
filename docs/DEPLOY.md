# Deploying the MMJ Suite

Production runs from the `master` branch of `Webfudge-Systems/mmj-suite`.

| What | Where | Address |
| --- | --- | --- |
| Backend (Strapi 5) + PostgreSQL | Railway | `https://api.mukundmaidjewellers.in` |
| Website | Vercel, root `apps/landing` | `https://www.mukundmaidjewellers.in` |
| Back Office | Vercel, root `apps/inventory` | `https://office.mukundmaidjewellers.in` |
| POS & Billing | Vercel, root `apps/pos` | `https://pos.mukundmaidjewellers.in` |
| CRM & Loyalty | Vercel, root `apps/crm` | `https://crm.mukundmaidjewellers.in` |
| Showroom tablets | Vercel, root `apps/showroom` | `https://showroom.mukundmaidjewellers.in` |

All apps sit under one domain on purpose. Sign-in uses an httpOnly cookie set by `api.`; browsers send it to the API from `office.`, `pos.` and the others only because they are the same site. Default `*.vercel.app` and `*.up.railway.app` addresses are different sites, so sign-in would fail in Safari and any browser that blocks third-party cookies.

## 1. Railway: backend

Project with two services: **PostgreSQL** (Railway's template) and **backend** from the GitHub repo.

Backend service settings:

- Source: `Webfudge-Systems/mmj-suite`, branch `master`
- Root directory: `/` (the repo root, so npm workspaces and the lockfile are used)
- Config file: `/railway.json` at the repo root, applied to the backend service (build `npm run build -w backend` after Railway's own install, start `npm run start -w backend`, health check `/api/rates/current`)
- Volume: mounted at `/app/apps/backend/public/uploads` (design photos)
- Custom domain: `api.mukundmaidjewellers.in`

Variables:

| Name | Value |
| --- | --- |
| `NODE_ENV` | `production` |
| `DATABASE_CLIENT` | `postgres` |
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
| `DATABASE_SSL` | `false` (private network) |
| `PUBLIC_URL` | `https://api.mukundmaidjewellers.in` |
| `IS_PROXIED` | `true` |
| `DEFAULT_ORGANIZATION` | `mmj` |
| `CORS_ORIGINS` | `https://www.mukundmaidjewellers.in,https://mukundmaidjewellers.in,https://office.mukundmaidjewellers.in,https://pos.mukundmaidjewellers.in,https://crm.mukundmaidjewellers.in,https://showroom.mukundmaidjewellers.in` |
| `APP_KEYS` | four random strings, comma separated |
| `API_TOKEN_SALT`, `ADMIN_JWT_SECRET`, `TRANSFER_TOKEN_SALT`, `JWT_SECRET`, `ENCRYPTION_KEY` | a random string each |
| `SEED_OWNER_EMAIL`, `SEED_OWNER_PASSWORD`, `SEED_OWNER_NAME` | the owner's real account, set by the owner. Used once, on the first boot of the empty database. Remove the password afterwards. |

Generate each secret with `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`. Never reuse the local development values.

Right after the first deploy, open `https://api.mukundmaidjewellers.in/admin` and create the admin account. Until an admin exists, anyone who finds that page can create one.

## 2. Vercel: five projects

One project per app, all from the same repo and branch `master`:

| Project | Root directory | Domain |
| --- | --- | --- |
| `mmj-landing` | `apps/landing` | `www.mukundmaidjewellers.in` (+ `mukundmaidjewellers.in` redirecting to it) |
| `mmj-office` | `apps/inventory` | `office.mukundmaidjewellers.in` |
| `mmj-pos` | `apps/pos` | `pos.mukundmaidjewellers.in` |
| `mmj-crm` | `apps/crm` | `crm.mukundmaidjewellers.in` |
| `mmj-showroom` | `apps/showroom` | `showroom.mukundmaidjewellers.in` |

Framework: Next.js. Vercel detects the npm workspace and installs from the repo root; keep the default install and build commands. Each project needs one variable:

| Name | Value |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | `https://api.mukundmaidjewellers.in` |

Turn on "Include files outside the root directory" (it is on by default for monorepos), since the apps import `packages/*`.

## 3. DNS at the domain registrar

| Type | Name | Value |
| --- | --- | --- |
| A | `@` | `76.76.21.21` (Vercel) |
| CNAME | `www` | `cname.vercel-dns.com` |
| CNAME | `office` | `cname.vercel-dns.com` |
| CNAME | `pos` | `cname.vercel-dns.com` |
| CNAME | `crm` | `cname.vercel-dns.com` |
| CNAME | `showroom` | `cname.vercel-dns.com` |
| CNAME | `api` | the target Railway shows when the custom domain is added |

Vercel and Railway show the exact records when each domain is added; use theirs if they differ from this table.

## 4. After deploying

1. Create the Strapi admin at `/admin`.
2. Sign in to the Back Office as the owner. In Settings, fill in the invoice details (legal name, GSTIN, branch address), add the second branch, and set PINs for staff.
3. Create staff accounts with their roles in the admin panel (Content Manager › User: staff role, organization, branches).
4. Publish the morning rate.
5. Pair each showroom tablet from Settings › Showroom tablets, then add the showroom app to the tablet's home screen.

## Staging

Same setup on a `staging` branch, with its own Railway project and database, Vercel preview domains such as `staging-office.mukundmaidjewellers.in`, and a matching `CORS_ORIGINS`.
