# AGENT_INSTRUCTION.md
## BC + Vancouver Traffic Cams Web App — Codex Build Instructions

Last updated: 2026-03-10

This file tells Codex exactly how to implement the project end to end from the TRD. The source TRD is the primary product spec and should be treated as the authority for scope, requirements, and acceptance criteria. See the uploaded TRD for the full technical requirements. fileciteturn0file0

---

## 1. Mission

Build a production-quality V1 web app for personal use that shows:

- Vancouver traffic cameras
- BC highway / DriveBC cameras
- Active DriveBC traffic events, including incidents, construction, closures, weather conditions, and similar warnings
- A map-centric UI
- A camera grid / list
- Favorites persisted locally in the browser

This is a read-only dashboard. Do not add auth, comments, uploads, accounts, push notifications, route ETA, or any paid Google Maps dependency in V1.

---

## 2. Product boundaries

### Must build
- Responsive web app
- Map with layers for:
  - Vancouver cameras
  - DriveBC cameras
  - DriveBC events
- Search and filtering
- Camera detail modal / drawer
- Event detail modal / drawer
- Local favorites using `localStorage`
- Backend/API layer that normalizes all external provider data
- Provider health reporting
- Graceful degradation when one upstream provider fails
- Tests for core flows

### Must not build
- User accounts
- Sign-in
- Database-backed favorites
- Live video archiving
- Background jobs requiring external infra beyond simple scheduled warmups
- Route planning / ETA
- Google Maps billing-enabled APIs
- Overengineered admin tooling

---

## 3. Required implementation philosophy

### 3.1 Keep provider logic off the client
The browser must not directly depend on provider-specific schemas or call all upstream public sources itself. All provider access should go through internal app endpoints.

### 3.2 Normalize aggressively
React components should consume stable internal shapes only. External APIs and scraped HTML are messy and unstable, so normalize everything in the server layer.

### 3.3 Design for breakage
Public data sources may fail, change, or become partial. Adapters must:
- expose health
- fail independently
- return stale cached data when possible
- avoid taking down the whole app

### 3.4 Prefer simple infra
This should deploy cleanly to Vercel or a similarly lightweight platform. Use fileless / memory cache first, with interfaces that allow Redis or SQLite later if needed.

---

## 4. Required stack

Use the following unless a specific implementation issue forces a narrow substitution:

- **Framework:** Next.js 15 App Router
- **Language:** TypeScript
- **UI:** React
- **Styling:** Tailwind CSS
- **Map:** Leaflet + React Leaflet
- **Validation:** Zod
- **Data fetching/state:** TanStack Query
- **Testing:** Vitest for unit/integration, Playwright for E2E
- **Lint/format:** ESLint + Prettier
- **Package manager:** pnpm preferred, npm acceptable if consistency is maintained

Do not switch to a heavy backend framework unless absolutely necessary.

---

## 5. External provider requirements

Implement three provider adapters.

### 5.1 DriveBC events adapter
Use DriveBC Open511 `/events` as the authoritative source for events. Support at minimum:
- `status=ACTIVE`
- `bbox`
- `geography` + `tolerance`
- `severity`
- `road_name`
- `limit` and `offset`

Normalize event payloads into the internal `TrafficEvent` shape from the TRD. fileciteturn0file0

### 5.2 Vancouver cameras adapter
Use the Vancouver `web-cam-url-links` dataset first. Probe both likely Opendatasoft access patterns:
- Explore API v2.1 style
- Records/Search API v1 style

If dataset access fails or is incomplete, fall back to scraping `trafficcams.vancouver.ca` index and detail pages.

### 5.3 DriveBC cameras adapter
Use the public DriveBC HighwayCams dataset as camera metadata. Treat it as metadata, not as a guaranteed stable image API. Preserve source page URLs and image URLs separately when possible.

---

## 6. Repo structure to create

Create a repo structure approximately like this:

```text
bc-traffic-cams/
  app/
    api/
      bootstrap/route.ts
      cameras/route.ts
      cameras/[id]/route.ts
      events/route.ts
      health/route.ts
    globals.css
    layout.tsx
    page.tsx
  components/
    layout/
    map/
    cameras/
    events/
    filters/
    ui/
  lib/
    api/
    cache/
    config/
    providers/
      drivebc-events.ts
      drivebc-cameras.ts
      vancouver-cameras.ts
      shared.ts
    normalization/
    geo/
    storage/
    utils/
    types/
  public/
  tests/
    unit/
    integration/
    e2e/
  scripts/
  README.md
  AGENT_INSTRUCTION.md
  DECISIONS.md
  TRD.md
  package.json
  tsconfig.json
  playwright.config.ts
  vitest.config.ts

Small deviations are fine if the architecture remains clean.

7. Internal types

Create shared internal types for the normalized domain model. Use the TRD model as the source of truth. At minimum define:

Camera

TrafficEvent

ProviderHealth

BBox

BootstrapResponse

All component props and API responses should use these normalized shapes.

8. Required internal API routes

Implement these routes:

GET /api/health

Return:

app status

provider health summary

last successful sync timestamps

cache freshness metadata if available

GET /api/cameras

Support:

provider

bbox

q

limit

Return normalized Camera[].

GET /api/cameras/:id

Return one normalized camera and parsed image variants if available.

GET /api/events

Support:

bbox

lat

lng

radiusMeters

eventType

severity

roadName

limit

Translate appropriately into DriveBC event queries. Respect the documented tolerance cap behavior from the TRD. fileciteturn0file0

GET /api/bootstrap

Return a single bootstrap payload for first page load containing:

default Vancouver-centered camera subset

default active events

provider health

configuration metadata

9. Caching requirements

Implement a small cache abstraction. Start with in-memory cache that supports TTL and can later be swapped.

Target TTLs:

DriveBC events: around 60–120 seconds

Vancouver camera metadata: around 15 minutes

DriveBC camera metadata: around 30–60 minutes

Do not aggressively proxy full-size images unless required for compatibility.

The cache abstraction should support:

get

set

delete

stale metadata / timestamps if convenient

10. UI requirements
10.1 Primary layout

Build a clean, fast, desktop-first UI with:

top navigation/header

left sidebar for search and filters

central map

right-side drawer or bottom panel for camera/event details

10.2 Main user journeys

Support these core flows:

Open app and see Vancouver-centered map

Toggle camera/event layers

Click a camera marker and view details

Click an event marker and view details

Search by highway/intersection name

Save a camera as favorite

Reload and still see favorites

10.3 Filters

Implement:

provider filter

favorites only

event type filter

region presets:

Downtown

North Shore

Burnaby

Highway 1

Sea to Sky

All

10.4 Degraded states

Add good empty/error states such as:

provider unavailable

camera image unavailable

approximate location notice

stale data banner

11. Favorites implementation

Favorites are local-only in V1.

Requirements:

persist using localStorage

add/remove favorite

load favorites on app startup

show favorites first in grid/list when relevant

no backend persistence

Wrap local storage in a small client utility with validation.

12. Adapter design requirements

Each provider adapter should implement a common contract or close equivalent, including:

healthcheck

fetch all / default set

fetch by bounding box when practical

fetch by id when practical

Adapters must:

validate external payloads with Zod or equivalent runtime parsing

preserve raw provider payload for debugging where useful

never leak raw provider shapes directly to UI components

emit structured errors

13. Vancouver-specific behavior

Because Vancouver’s open-data surface may vary, implement adapter probing:

Try Opendatasoft Explore API v2.1 pattern

If that fails, try records/search v1 pattern

If that fails or data is incomplete, scrape the official traffic camera website

Build a small parser for Vancouver camera detail pages that can extract:

page title or intersection name

one or more image URLs

directional labels when available

Do not assume every page shape is identical. Fail soft and preserve the source page link.

14. DriveBC camera behavior

The DriveBC camera dataset may point to pages rather than direct image assets. Design accordingly:

metadata fetch should be separate from image extraction

image extraction can happen lazily on detail fetch

if no direct image can be derived, show the official source page link

Do not block the list/map experience on image parsing.

15. Map behavior

Use Leaflet with marker clustering if necessary for dense areas.

Requirements:

map centers on Vancouver by default

render camera markers and event markers distinctly

toggle layer visibility

support bounding-box-based fetching when useful

keep the map responsive with several hundred markers

Do not over-customize the map before the core data flows work.

16. Accessibility and UX polish

Implement reasonable accessibility:

keyboard-closable dialogs/drawers

visible focus states

button labels / aria labels where needed

readable contrast

Keep styling clean and fast. This app is utility-first, not marketing-heavy.

17. Observability and health

Implement:

structured logs

provider health summary

last successful provider sync times

light instrumentation around provider failures

/api/health should be good enough for debugging a broken provider quickly.

18. Security requirements

Even though this is a simple app, still enforce:

sanitization of scraped/provider strings before display

SSRF-aware URL fetching patterns

request timeouts for upstream providers

defensive handling of malformed HTML/data

rate limiting on internal public API routes if practical

Do not create generic URL proxy endpoints.

19. Testing requirements
Unit tests

Write tests for:

normalization logic

bbox parsing / translation

query param helpers

favorites storage utility

cache utility

Integration tests

Write tests for:

DriveBC events adapter contract

Vancouver adapter probe logic

Vancouver fallback scrape parser

camera detail fetch behavior

Where live-source contract tests are flaky, isolate them clearly and make them optional or resilient.

E2E tests

Using Playwright, cover:

home page render

markers show up

camera detail opens

favorite persists after reload

mocked provider outage shows graceful banner

20. Performance requirements

Aim for:

fast first render

minimal waterfalls

a bootstrap API to reduce initial client fetch overhead

no repeated provider calls on every UI interaction if cacheable

Use /api/bootstrap for initial load where sensible.

21. Environment and config

Add environment support for:

default map lat/lng/zoom

cache TTLs

optional feature flags for scrape fallback and provider health display

Use sensible defaults matching the TRD. fileciteturn0file0

22. Deliverables Codex should produce

Codex should generate:

working Next.js app

normalized provider adapters

internal API routes

responsive UI

tests

README with setup/run/deploy steps

.env.example

comments only where actually helpful

clean linted code

23. Suggested implementation order

Use this order unless blocked:

Phase 1

scaffold project

set up types, config, cache abstraction

implement DriveBC events adapter

implement Vancouver cameras dataset adapter

build bootstrap route

render map with markers

Phase 2

implement DriveBC cameras adapter

build camera/event details UI

add search/filtering

add favorites

Phase 3

add Vancouver fallback scraping

add provider health

improve degraded states

add tests

finalize README and deployment polish

24. Definition of done

The build is done when:

app centers on Vancouver on first load

active DriveBC events render

Vancouver cameras render

DriveBC cameras render

clicking a camera shows usable detail or source link

favorites persist locally across reloads

a broken provider does not crash the app

tests cover main flows

repo is deployable with clear setup docs

25. Things Codex should avoid

Avoid:

introducing auth or user management

adding a database before needed

coupling React components to raw provider payloads

relying on only one Vancouver API pattern

adding Google Maps / ETA in V1

storing camera imagery permanently

premature microservices or excessive abstraction

26. Final instruction to Codex

Implement the smallest clean architecture that satisfies the TRD completely, favors stability over novelty, and is easy for a single developer to deploy and maintain.

When forced to choose, prefer:

resilience over cleverness

normalized internal contracts over raw provider convenience

simple UI clarity over flashy visuals

graceful fallback over hard failure
