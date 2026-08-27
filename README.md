# MoodSync (Next.js 16 — App Router + TypeScript)

Single Next.js app: React UI + `/api` backend.

## Setup

1. Copy `.env.example` → `.env.local` and fill values
2. Set OAuth redirects to this origin
3. Run:

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Structure

- `app/` — App Router pages + `app/api/[[...path]]` API catch-all
- `components/`, `screens/` — client UI (TypeScript)
- `api/` — browser fetch helpers
- `lib/express-app.ts` — API business logic (Express, mounted via App Router)
- `lib/express-adapter.ts` — Next Request → Express bridge
- `schema.sql` — database schema
tesrt
