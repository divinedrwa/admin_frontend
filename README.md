# Society Admin Frontend (Next.js)

Admin web application for society operations. This UI talks to the backend API under `/api` and supports both:

- Society admin login (`/login`)
- Platform super-admin login (`/super-admin/login`)

## Stack

- Next.js (App Router)
- React
- TypeScript
- Tailwind CSS
- Axios

## Prerequisites

- Node.js 18+ (recommended)
- Backend API reachable (local default: `http://localhost:4000/api`)

## Local Setup

```bash
cd frontend
npm install
```

Create `.env.local` (optional but recommended):

```bash
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

Run dev server:

```bash
npm run dev
```

App URL: `http://localhost:3000`

## Scripts

- `npm run dev` - start development server on port `3000`
- `npm run build` - production build
- `npm run start` - run production server on port `3000`

## Environment Variables

- `NEXT_PUBLIC_API_URL` - backend API base URL (must include `/api`)
  - default fallback in code: `http://localhost:4000/api`
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` - Supabase publishable/anon key for browser + SSR clients
- `NEXT_PUBLIC_SUPABASE_TABLE` - public table name used by `/supabase-example`
- `NEXT_PUBLIC_SUPABASE_QUERY` - select clause used by `/supabase-example` (example: `id,name,created_at`)
- `NEXT_PUBLIC_SUPABASE_LIMIT` - max rows shown by `/supabase-example` (clamped to `1..50`)

## Supabase Setup

1. Add these values to `frontend/.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<your-publishable-key>
NEXT_PUBLIC_SUPABASE_TABLE=todos
NEXT_PUBLIC_SUPABASE_QUERY=id,name,created_at
NEXT_PUBLIC_SUPABASE_LIMIT=10
```

2. In the Supabase SQL Editor, run `frontend/supabase/bootstrap.sql`.
3. Start the frontend with `npm run dev`.
4. Open `http://localhost:3000/supabase-example` to verify:
   - SSR client initializes
   - browser client initializes
   - the configured public table returns rows

`bootstrap.sql` creates a minimal `public.todos` table, enables RLS, adds a read policy for `anon` and `authenticated`, and seeds a few rows so the example page can confirm connectivity immediately.

## Authentication Model

This frontend uses separate API clients/sessions:

- `src/lib/api.ts`
  - Tenant/admin API client
  - Reads token from `localStorage` key `token`
  - Sets `Authorization: Bearer <token>`
  - Sends `X-Society-Id` for tenant-scoped requests
  - On `401`, clears session and redirects to `/login` (except public auth paths)

- `src/lib/apiSuper.ts`
  - Super-admin API client
  - Reads token from `localStorage` key `super_admin_token`
  - On `401`, redirects to `/super-admin/login`

Related route guard hook:

- `src/hooks/useAuth.ts`

## Important Routes

- `/login` - society admin login
- `/super-admin/login` - platform super-admin login
- `/dashboard` - main admin dashboard

## Build and Deploy

### Build locally

```bash
cd frontend
npm run build
npm run start
```

### Vercel (recommended)

Set env var:

- `NEXT_PUBLIC_API_URL=https://<your-backend-domain>/api`

### Railway/Render/Other Node hosts

- Root directory: `frontend`
- Build: `npm install && npm run build`
- Start: `npm run start`
- Expose port `3000` (or platform default)

## Troubleshooting

- Blank data / API failures:
  - verify `NEXT_PUBLIC_API_URL`
  - verify backend is running and reachable
- Redirect loop to login:
  - check token state in localStorage
  - confirm backend returns valid `401/403` semantics
- CORS/browser errors:
  - confirm backend CORS allows frontend domain

## Related Docs

- Frontend development guide: [`docs/DEVELOPMENT.md`](./docs/DEVELOPMENT.md)
- Frontend feature map: [`docs/FEATURES.md`](./docs/FEATURES.md)
- Monorepo root docs: [`../README.md`](../README.md)
