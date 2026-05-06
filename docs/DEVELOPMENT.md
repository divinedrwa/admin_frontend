# Admin frontend — development

## Prerequisites

- **Node.js** 18+ (same major as backend is fine)

## Frontend admin (`frontend/`)

```bash
cd frontend
npm install
# Optional: echo 'NEXT_PUBLIC_API_URL=http://localhost:4000/api' > .env.local
npm run dev    # http://localhost:3000
```

**API client:** `src/lib/api.ts` — attaches `Bearer` token from `localStorage`; 401 clears token and redirects to `/login`.

**Super admin area:** `/super-admin/login` uses `src/lib/apiSuper.ts` (separate session from society admin).

## Related

- **API & database setup:** [../../backend/docs/DEVELOPMENT.md](../../backend/docs/DEVELOPMENT.md)
- **Monorepo index:** [../../DEVELOPMENT.md](../../DEVELOPMENT.md)
