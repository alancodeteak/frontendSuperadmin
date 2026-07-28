# Restaurant Superadmin

Next.js superadmin panel for the UAE restaurant ecommerce platform.

## Stack

- **Next.js 16** (App Router)
- **React 19**
- **TypeScript**
- **Tailwind CSS 4**
- **Cloudflare Tunnel** → `superadmin.yaadro.online`

## Getting started

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Cloudflare tunnel (public URL)

Uses existing tunnel `yaadro-superadmin-frontend` → `https://superadmin.yaadro.online`.

1. Ensure DNS is routed (once):

```bash
npm run tunnel:dns
```

2. Run Next.js + tunnel together:

```bash
npm run dev:tunnel
```

Or in two terminals: `npm run dev` and `npm run tunnel`.

Browser traffic:

```text
https://superadmin.yaadro.online/api/...
  → Next.js rewrite → https://superadmin-api.yaadro.online/api/...

https://superadmin.yaadro.online/dms-api/...
  → Next.js rewrite → http://localhost:3001/dms-api/...
```

Same-origin `/api` and `/dms-api` avoid CORS through the tunnel.

## Project structure

```text
src/
  app/
    (admin)/          # Admin shell (sidebar layout)
      dashboard/
      restaurants/
      orders/
      users/
      settings/
    login/
  components/
  config/
  lib/                # apiFetch / dmsApiFetch (same-origin)
  types/
cloudflared/
  config.yml          # Tunnel ingress for superadmin.yaadro.online
```

## Scripts

| Command              | Description                          |
| -------------------- | ------------------------------------ |
| `npm run dev`        | Local Next.js on :3000               |
| `npm run tunnel`     | Cloudflare tunnel only               |
| `npm run dev:tunnel` | Next.js + tunnel                     |
| `npm run tunnel:dns` | Point DNS at the named tunnel        |
| `npm run build`      | Production build                     |
| `npm run start`      | Production server                    |
| `npm run lint`       | ESLint                               |

## Environment

| Variable | Purpose |
| -------- | ------- |
| `NEXT_PUBLIC_API_BASE_URL` | Browser API path (`/api`) |
| `API_PROXY_TARGET` | Backend origin for `/api` rewrite |
| `NEXT_PUBLIC_DMS_API_BASE_URL` | Browser DMS path (`/dms-api`) |
| `DMS_API_PROXY_TARGET` | DMS origin for `/dms-api` rewrite |
| `NEXT_PUBLIC_TUNNEL_HOST` | Cloudflare hostname |
| `NEXT_PUBLIC_APP_URL` | Public app URL |
| `NEXT_PUBLIC_DEVELOPMENT_MODE` | `true` skips real OTP |
| `NEXT_PUBLIC_NUMVERIFY_ACCESS_KEY` | Phone carrier lookup |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Maps JS API |
