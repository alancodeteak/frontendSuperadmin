# Yaadro Super Admin (India) — Frontend

React 19 SPA for **superadmin** and **portal** operators: shops, delivery partners, accounts/invoices, reports, and activity dashboards. Built with **Vite**, **Redux Toolkit**, **React Router**, **Tailwind CSS**, **Recharts**, and **Leaflet** (maps).

## Prerequisites

- **Node.js** 20+ (recommended)
- Running **backend API** (default `http://127.0.0.1:8000`) — see `../../backendIndianySuperadmin/README.md`

## Setup

```bash
cd frontendSuperAdminIndia/frontendSuperadminIndia
npm install
```

## Environment variables

Create a `.env` in this directory (optional; defaults match local dev):

| Variable | Purpose |
|----------|---------|
| `VITE_API_BASE_URL` | Backend origin (default `http://127.0.0.1:8000`) |
| `VITE_DELIVERY_PARTNERS_PATH` | API path prefix for delivery partners (default `/delivery-partners/`) |
| `VITE_LOGIN_EMAIL` | Dev default email on admin OTP screen |
| `VITE_PORTAL_LOGIN_EMAIL` | Dev default email on portal OTP screen |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server (HMR) |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Serve `dist/` locally |
| `npm run lint` | ESLint |

## Project layout (high level)

- `src/apis/` — API clients (`auth`, `supermarkets`, `invoices`, `reports`, …)
- `src/pages/` — Route screens (dashboard, shops, invoices, reports, portal, auth)
- `src/components/` — Shared UI (layout, maps, invoice document)
- `src/redux/` — Store, slices, thunks
- `public/` — Static assets (`assets/`, `shopIcon/`, favicon, …)

## Authentication

JWT via OTP (`/login/*`, `/portal/*`). Tokens are stored in `localStorage` under the key configured in `authSlice` and sent as `Authorization: Bearer <token>`.

## Maps

Shop location modal uses **react-leaflet** + icons under `public/shopIcon/`. Ensure shops have latitude/longitude in the API for pins to appear.

## Related docs

- Backend README: `../../backendIndianySuperadmin/README.md`
- Backend API overview: `../../backendIndianySuperadmin/api.md`
- Frontend API handoff notes: `phase2.md` (this folder)

## License

Private — CodeTeak / Yaadro internal use unless stated otherwise.
