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

## Security implementation (frontend)

This section documents the security-focused features implemented in this frontend codebase. Infrastructure items (TLS certificates, Cloudflare/Nginx headers) are documented in `../../SECURITY_DEPLOYMENT.md`.

### Secure requests (HTTPS + timeouts)

- **Shared HTTP client**: `src/apis/httpClient.js`
  - Adds request timeouts (AbortController).
  - Enforces **HTTPS-only in production** (or any environment when `VITE_REQUIRE_HTTPS=true`).
- **Cached GET hardening**: `src/apis/cachedGet.js`
  - Enforces HTTPS-only for cached GET requests in production.
  - Triggers the same global unauthorized handling on `401`.

### Global unauthorized handling (401)

- When any API call returns **401 Unauthorized**, the app:
  - clears the local session, and
  - redirects to the correct login screen (admin `/` or portal `/portal/login`).
- Implemented via:
  - an event emitted by `httpClient` (`UNAUTHORIZED_EVENT`), and
  - a listener component in `src/routes/AppRouter.jsx` (`UnauthorizedBridge`).

### Input validation & sanitization (client-side)

- **Zod validation layer**
  - Helpers: `src/validation/validate.js`
  - Schemas:
    - `src/validation/schemas/authSchemas.js` (email, OTP)
    - `src/validation/schemas/invoiceSchemas.js` (invoice status, transaction reference, notes, delete-note command, search)
- Validation is applied in key flows:
  - OTP login (`src/pages/auth/OtpLoginPage.jsx`)
  - Invoice status change + notes timeline (`src/pages/accounts/InvoiceDetailPage.jsx`)
  - Invoice search normalization (`src/pages/accounts/InvoicesListPage.jsx`)
- Notes sanitization policy (client-side):
  - trims whitespace, enforces length limits,
  - rejects obvious HTML tags in notes text.

### Auth storage options (reduce persistence)

`src/redux/slices/authSlice.js` supports configurable session persistence:

- `VITE_AUTH_STORAGE=local` (default): store session in `localStorage`
- `VITE_AUTH_STORAGE=session`: store session in `sessionStorage`
- `VITE_AUTH_STORAGE=none`: do not persist session (in-memory only)

### Environment variables (security-related)

Add these to your `.env` (optional):

- `VITE_REQUIRE_HTTPS=true` to force HTTPS API base URL checks outside production too.
- `VITE_AUTH_STORAGE=session` or `VITE_AUTH_STORAGE=none` to reduce token persistence.

## Maps

Shop location modal uses **react-leaflet** + icons under `public/shopIcon/`. Ensure shops have latitude/longitude in the API for pins to appear.

## Related docs

- Backend README: `../../backendIndianySuperadmin/README.md`
- Backend API overview: `../../backendIndianySuperadmin/api.md`
- Frontend API handoff notes: `phase2.md` (this folder)

## License

Private — CodeTeak / Yaadro internal use unless stated otherwise.
