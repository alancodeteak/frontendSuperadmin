# Yaadro Restaurant Superadmin

Next.js superadmin panel for the UAE restaurant ecommerce platform (**Yaadro**). Manage shops, riders, POS links, billing, analytics, and reports against the `admin-api` (`/api/v2`).

**Public URL:** [https://superadmin.yaadro.online](https://superadmin.yaadro.online)

---

## Stack

| Layer | Technology |
| ----- | ---------- |
| Framework | **Next.js 16** (App Router) |
| UI | **React 19**, **Tailwind CSS 4**, Base UI / shadcn-style components |
| Data | **TanStack Query**, **TanStack Table** |
| Charts | **Visx**, GSAP / Motion animations |
| Maps | **Google Maps** JavaScript API |
| Search | **Meilisearch** (optional) with live API fallback |
| Auth | Email OTP via admin-api |
| Exports | **jsPDF**, **SheetJS (xlsx)** |
| Tunnel | **Cloudflare Tunnel** → `superadmin.yaadro.online` |

---

## Features

### Authentication
- Email + OTP login for super admins
- Session storage with auth gate around admin routes
- Development mode can skip real OTP when `NEXT_PUBLIC_DEVELOPMENT_MODE=true`

### Dashboard (`/dashboard`)
- KPI cards: restaurants, orders, revenue, support tickets, and more
- Charts: revenue, Yaadro revenue, order trends, restaurant performance, subscriptions
- Activity feeds: latest restaurants, recent activity, shop ops activity
- System health snapshot
- Range filters: today / 7 days / 30 days

### Shops (`/shops`)
- Searchable, filterable shop list with status badges and profile photos
- Shops map modal (all shops on a map)
- **Create shop wizard** (`/shops/new`) with:
  - Multi-step flow: Basics → Address → Features → Review
  - Step progress UI
  - Auto shop ID (`NAME_YYYYMMDD_XXXX`) and suggested login ID
  - Local draft persistence (fields only; password not saved)
  - Profile photo upload (drag & drop, JPEG/PNG/WebP)
  - Google Maps address picker (search, pin drag, coordinates)
  - Feature flags (ecom, confirmation, scheduled orders, merge, returns, tickets)
  - Confirm modal with loading, slow/background task, and success states
- **Shop detail** (`/shops/[shopId]`) tabs:
  - **Overview** — profile hero (map + photo), edit details, reset password, soft/hard delete, force logout
  - **Features** — ecom and ops feature toggles
  - **Products** — catalog table from shop data
  - **Delivery** — delivery settings 
  - **Subscription** — view active plan and create subscriptions
  - **Promotion** — promotion settings
  - **Riders** — list, create, edit, block/unblock, restore, reset password, delete
  - **POS** — attach POS template link, sync status, link features

### POS (`/pos`)
- POS template list and detail
- Attach / manage shop ↔ POS links from the shop POS tab

### Reports (`/reports`)
- Shop reports via DMS API proxy
- PDF and Excel preview / download tooling

### Analytics (`/analytics`)
- Tabs: Restaurants, Tickets, Customers, Subscriptions
- Restaurant performance (orders, revenue, on-time %)
- Support tickets with image thumbnails and detail modal (gallery / carousel)
- Customer and subscription analytics
- PDF export per tab

### Invoices (`/invoice`)
- Invoice list with filters
- Invoice detail view (`/invoice/[invoiceId]`)

### Settings (`/settings`)
- App / cookie preference related settings surfaces

### Layout & UX chrome
- Left icon sidebar (Dashboard, Shops, POS, Reports, Analytics, Invoice, Settings)
- Top bar with page actions, shops map shortcut, notifications
- Resizable right sidebar: global search, quick links, latest restaurants, admin task checklist
- Cookie consent notice and preferences
- Toast notifications (center-bottom)
- Loading / empty / error states shared across pages

### Search
- Right-sidebar global search for shops, riders, POS, invoices, and pages
- Meilisearch when configured; otherwise federated live admin-api queries
- Optional reindex from the search UI

---

## Getting started

```bash
npm install
cp .env.example .env.local
# Edit .env.local with your keys / proxy targets
npm run dev
```

Open [http://localhost:3002](http://localhost:3002) (dev server uses port **3002**).

### Cloudflare tunnel (public URL)

Named tunnel: `yaadro-superadmin-frontend` → `https://superadmin.yaadro.online`.

1. Ensure DNS is routed (once):

```bash
npm run tunnel:dns
```

2. Run Next.js + tunnel together:

```bash
npm run dev:tunnel
```

Or in two terminals: `npm run dev` and `npm run tunnel`.

### API proxying (same-origin)

Browser traffic stays same-origin to avoid CORS through the tunnel:

```text
https://superadmin.yaadro.online/api/...
  → Next.js rewrite → API_PROXY_TARGET/api/...
  (default: https://superadmin-api.yaadro.online)

https://superadmin.yaadro.online/dms-api/...
  → Next.js rewrite → DMS_API_PROXY_TARGET/dms-api/...
  (default: http://localhost:3001)

https://superadmin.yaadro.online/health
  → API health check
```

Local App Router routes such as `/api/search/*` are served by Next.js first; other `/api/*` paths proxy to admin-api.

---

## Project structure

```text
src/
  app/
    (admin)/                 # Authenticated admin shell
      dashboard/
      shops/                 # List, create wizard, detail tabs
      pos/
      reports/
      analytics/
      invoice/
      settings/
    api/search/              # Suggest + sync (Meilisearch / fallback)
    login/
    cookies/
  components/
    analytics/               # Ticket images + detail dialog
    charts/                  # Visx chart primitives
    dashboard/               # KPIs, charts, right sidebar, search
    shops/                   # Wizard, maps, photo, riders, profile
    layout/                  # Top bar, page shell, notifications
    ui/                      # Shared UI (table, dialog, step-progress, …)
  config/                    # Site + nav config
  constants/
  hooks/
  lib/
    api/                     # admin-api clients (shops, riders, billing, …)
    queries/                 # React Query definitions
    search/                  # Meilisearch + federated search
    mock-data.ts             # Dev mocks when development mode is on
  types/
cloudflared/
  config.yml                 # Tunnel ingress for superadmin.yaadro.online
public/
  images/ icons/ animations/
```

---

## Scripts

| Command | Description |
| ------- | ----------- |
| `npm run dev` | Next.js on port **3002** |
| `npm run tunnel` | Cloudflare tunnel only |
| `npm run dev:tunnel` | Next.js + tunnel |
| `npm run tunnel:dns` | Point DNS at the named tunnel |
| `npm run build` | Production build |
| `npm run start` | Production server |
| `npm run lint` | ESLint |

---

## Environment

Copy `.env.example` → `.env.local`.

| Variable | Purpose |
| -------- | ------- |
| `NEXT_PUBLIC_API_BASE_URL` | Browser API path (default `/api`) |
| `API_PROXY_TARGET` | Backend origin for `/api` rewrite (no `/api` suffix) |
| `NEXT_PUBLIC_DMS_API_BASE_URL` | Browser DMS path (default `/dms-api`) |
| `DMS_API_PROXY_TARGET` | DMS origin for `/dms-api` rewrite |
| `NEXT_PUBLIC_TUNNEL_HOST` | Cloudflare hostname |
| `NEXT_PUBLIC_APP_URL` | Public app URL |
| `NEXT_PUBLIC_APP_NAME` | Display name |
| `NEXT_PUBLIC_DEVELOPMENT_MODE` | `true` enables mock/dev auth shortcuts |
| `NEXT_PUBLIC_NUMVERIFY_ACCESS_KEY` | Phone carrier lookup (optional) |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Maps JS API (shop address / map views) |
| `MEILISEARCH_HOST` | Meilisearch host (optional) |
| `MEILISEARCH_API_KEY` | Meilisearch API key |
| `MEILISEARCH_INDEX_SUPERADMIN` | Index name (default `superadmin`) |

Do **not** commit `.env.local` or real secrets.

---

## Backend contract

This UI targets **admin-api** (`/api/v2`) for shops, riders, POS, billing, analytics, and auth. Shop reports may call **dms-api** via the DMS proxy.

Useful references in the repo:

- `admin-api.postman_collection (1).json` — API examples
- `.env.example` — required env vars

---

## Development notes

- Prefer matching existing page patterns (`PageShell`, `TopBarSlot`, `DataTable`, shared states).
- Shop create uses **POST** for core fields, then **PATCH** for feature flags and photo upload.
- Drafts for the create wizard are stored in `localStorage` under `yaadro:shop-create-draft` (password excluded).
- This Next.js version may differ from older docs; check `node_modules/next/dist/docs/` and deprecation notices when changing framework APIs.
