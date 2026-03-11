# BC Driving

BC Driving is a Next.js 15 traffic dashboard for Vancouver cameras, DriveBC highway cameras, and DriveBC Open511 events. The app normalizes provider data behind internal API routes, caches provider fetches in memory, exposes health information, and persists favorites locally.

## Stack

- Next.js 15 App Router
- TypeScript
- Tailwind CSS
- Leaflet + React Leaflet
- TanStack Query
- Zod
- Vitest + Playwright

## Run

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

## Key routes

- `GET /api/bootstrap`
- `GET /api/cameras`
- `GET /api/cameras/:id`
- `GET /api/events`
- `GET /api/health`

## Notes

- Vancouver camera adapter probes Opendatasoft v2.1 first, then v1, then falls back to scraping the traffic camera site.
- DriveBC camera metadata is treated as metadata first; image extraction is lazy on detail fetch.
- When providers are unavailable, the app serves stale cache or baked-in fallback fixtures so the UI still renders.
