# MMJ Strapi

CMS for Mukund Maid Jewellers. TypeScript, SQLite, Strapi 5. Not wired to the Next.js app yet — the client still reads dummy data from `client/src/data`.

```
npm run develop
```

Admin: http://localhost:1337/admin

## Content types

Collection types, matching the storefront dummy data:

| Type | Notes |
| --- | --- |
| Product | Gold, diamond, silver, platinum or bullion. Draft and publish. Weights, making, hallmark and stones. Relations to category and collection. |
| Category | Ornament taxonomy. |
| Collection | Named exhibition of pieces. |
| Stone | Gem type used across the catalogue. |
| Journal post | Workshop notes. Draft and publish. |
| Review | Customer review. Draft and publish. |
| Gold rate | Per-gram counter rate for a metal and purity. |
| Store | Showroom address, hours and map. |

Single type:

| Type | Notes |
| --- | --- |
| Global | Site identity, announcement, contact, nav, promises, FAQs. |

Shared components live in `src/components/shared` (nav link, FAQ, promise, SEO, footer column, social link, showroom hours). Product-specific components (hallmark, stone detail, spec, size) live in `src/components/product`.

Public `find` / `findOne` is granted on bootstrap so the storefront can read later without extra admin work. Create and update stay behind the admin login.

Do not point the Next app at Strapi until the dummy data layer in `client/src/lib/catalog.ts` is swapped for fetches.
