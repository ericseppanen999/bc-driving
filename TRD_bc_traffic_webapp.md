# Technical Requirements Document (TRD)
## BC + Vancouver Traffic Cams Web App (V1)

Last updated: 2026-03-09

---

## 1. Objective

Build a small personal-use web app for Eric, friends, and family that shows:

1. Vancouver traffic cameras
2. DriveBC / BC highway cameras
3. Current road events such as accidents, incidents, construction, closures, weather warnings, and road conditions
4. Saved/favorite cameras for fast access
5. A simple map and a simple camera grid

This is **not** a social app, not a live-video streaming platform, and not a full navigation product. V1 is a read-only traffic conditions dashboard.

---

## 2. Product scope

### In scope for V1
- Public web app
- Read-only map of cameras and events
- Vancouver traffic cameras from official City of Vancouver sources
- DriveBC events from the official Open511 API
- DriveBC / BC highway camera metadata from the official public dataset
- Search / filter by region, road, event type, and favorites
- Favorites saved locally in browser storage
- Camera detail drawer / modal
- Periodic refresh with caching
- Resilient provider adapters and graceful degradation

### Out of scope for V1
- Accounts / authentication
- Push notifications
- Route ETA / directions
- Google Maps billing-dependent routing
- Full mobile native apps
- Historical analytics
- User-generated content
- Video recording or archiving

---

## 3. Source systems and external data providers

### 3.1 DriveBC Open511 API
Use as the authoritative source for BC road events.

**Official base URL**
- `https://api.open511.gov.bc.ca/`

**Primary resource**
- `https://api.open511.gov.bc.ca/events`

**Other documented resources**
- `/jurisdiction`
- `/jurisdictiongeography`
- `/areas`

**Documented behavior**
- Default events response size is 50.
- Max request limit is 500.
- Pagination uses `limit` and `offset`.
- Supports XML and JSON representations.

**Documented event filters**
- `status`
- `severity`
- `jurisdiction`
- `event_type`
- `event_subtype`
- `created`
- `updated`
- `road_name`
- `area_id`
- `bbox`
- `geography`
- `tolerance`
- `in_effect_on`

**Recommended app query patterns**
- All active events:  
  `GET /events?status=ACTIVE&limit=500`
- Vancouver area by bounding box:  
  `GET /events?status=ACTIVE&bbox=<xmin>,<ymin>,<xmax>,<ymax>&limit=500`
- Nearby events to user location (10 km max per docs):  
  `GET /events?status=ACTIVE&geography=POINT(<lat> <lng>)&tolerance=10000&limit=200`
- Major events only:  
  `GET /events?status=ACTIVE&severity=MAJOR&limit=200`
- Highway-specific query:  
  `GET /events?status=ACTIVE&road_name=Highway 1&limit=200`

### 3.2 DriveBC Highway Cameras dataset
Use as the authoritative source for BC highway camera metadata.

**Official dataset**
- Dataset name: `DriveBC HighwayCams`
- Download resource referenced publicly as `webcams.csv`

**Dataset description**
The public metadata states the dataset includes location, web addresses, highway, compass orientation, update frequency in seconds, hosting credit, and camera identifier.

**Required design decision**
Treat this source as **camera metadata only**, not as a guaranteed stable image-delivery API. The implementation must support either:
1. direct image URLs from the dataset when present, or
2. provider link pages that must be opened in the browser, or
3. a future adapter-specific transformation if the dataset points to HTML pages rather than direct image assets.

### 3.3 City of Vancouver camera data
Use the City of Vancouver as the authoritative source for Vancouver camera locations and camera page links.

#### Primary source: open data dataset
- Dataset identifier: `web-cam-url-links`

The dataset states:
- it includes official publicly available web cams, mostly traffic cameras
- locations are approximate
- images themselves are updated approximately every 5 minutes

#### Secondary source: official traffic camera website
- Site: `https://trafficcams.vancouver.ca/`

The traffic camera site states:
- the city has traffic cameras at major intersections
- images are updated approximately every 10 to 15 minutes
- the site includes a browse-all-intersections index and per-intersection pages

**Important implementation note**
There is a source inconsistency between the open-data dataset page (~5 min) and the trafficcams site (~10–15 min). V1 must not promise a tighter SLA than the slower official surface. UI copy should say:

> Camera images are provided by public agencies and may update every few minutes; some Vancouver camera pages indicate 10–15 minute refresh intervals.

---

## 4. External endpoint strategy

### 4.1 Supported provider adapters
Implement the app using provider adapters behind internal contracts.

#### Adapter A: DriveBC events adapter
Status: **hard requirement**

Use documented Open511 endpoints directly.

#### Adapter B: DriveBC highway camera adapter
Status: **hard requirement**

Primary ingestion path:
- scheduled fetch of public camera metadata dataset

The adapter must normalize:
- camera id
- provider
- label / name
- highway / route
- latitude / longitude
- orientation
- update interval seconds
- page URL
- image URL if available

#### Adapter C: Vancouver camera adapter
Status: **hard requirement**

Use this retrieval order:

1. **Primary**: Vancouver open-data dataset API
2. **Fallback**: scrape official `trafficcams.vancouver.ca` browse/index pages and per-intersection pages

### 4.2 Vancouver dataset API endpoint plan
Because the dataset is hosted on Opendatasoft and the public page exposes the dataset identifier `web-cam-url-links`, implement **both** the modern and fallback patterns below.

#### Preferred endpoint pattern (Opendatasoft Explore API v2.1)
Expected dataset records endpoint:
- `GET https://opendata.vancouver.ca/api/explore/v2.1/catalog/datasets/web-cam-url-links/records`

Expected useful query params:
- `limit`
- `offset`
- `select`
- `where`
- `order_by`

#### Fallback endpoint pattern (documented Opendatasoft Search API v1)
- `GET https://opendata.vancouver.ca/api/records/1.0/search/?dataset=web-cam-url-links`

Expected useful query params:
- `rows`
- `start`
- `fields`
- `format=json`
- `format=geojson`

**Implementation requirement**
At startup and in CI integration tests, the backend must probe both Vancouver patterns and select the first working adapter path. Do not hard-crash if the preferred pattern fails.

### 4.3 Camera page parsing
The app must support parsing per-camera or per-intersection HTML pages when structured APIs are unavailable or incomplete.

For Vancouver:
- expect per-intersection pages such as `https://trafficcams.vancouver.ca/<cameraPage>.htm`
- expect multiple directional images per page (North/East/South/West where available)
- parse image elements and labels if needed

For DriveBC:
- the dataset or linked pages may lead to camera pages rather than raw images
- parse cautiously and cache results

---

## 5. Functional requirements

### 5.1 Map screen
The home screen must include a map with:
- camera markers
- event markers
- optional clustering for dense Vancouver camera areas
- toggle layers:
  - Vancouver cameras
  - BC highway cameras
  - incidents/events

### 5.2 Camera grid
A companion list/grid view must show:
- saved favorites first
- camera preview image if available
- camera label
- source provider
- route / area metadata when available
- last refreshed time from app cache

### 5.3 Search and filters
Support:
- text search by camera name or highway/intersection
- filter by provider (`vancouver`, `drivebc`)
- filter by region preset:
  - Downtown
  - North Shore
  - Burnaby
  - Highway 1
  - Sea to Sky
  - All
- filter by event type:
  - Incident
  - Construction
  - Weather condition
  - Road condition
  - Special event
- filter to favorites only

### 5.4 Event details
For each event show when present:
- headline
- event type
- severity
- status
- description
- road name
- affected area / district
- start and end / schedule windows when present
- provider deep link if available

### 5.5 Camera details
For each camera show:
- display name
- provider
- location
- preview image(s)
- orientation / direction when available
- source page link
- approximate update interval note
- save/remove favorite

### 5.6 Favorites
Favorites are V1 local only.

Requirements:
- persist in `localStorage`
- support add/remove favorite
- support reorder favorites on the client
- support shareable URL state later, but not required for V1

---

## 6. Non-functional requirements

### 6.1 Availability
- Degrade gracefully when one provider is down
- App still works if only one provider returns data
- Show stale-data banners instead of blank screens whenever possible

### 6.2 Performance
Targets:
- first meaningful paint < 3s on broadband desktop
- map interaction should remain responsive with several hundred markers
- backend provider fetches should be cached

### 6.3 Caching
Minimum cache policy:
- DriveBC events: 60–120 seconds
- Vancouver camera metadata: 15 minutes
- DriveBC camera metadata: 30–60 minutes
- camera image fetches: do **not** aggressively proxy full-size images unless necessary

### 6.4 Legal / terms / attribution
Must:
- retain source attribution in the UI footer/about section
- link to provider source pages
- avoid representing images as owned by the app
- avoid storing or archiving camera images server-side unless license review is completed

### 6.5 Security
- no auth secrets required for V1
- sanitize all scraped/provider strings before display
- rate-limit backend public API routes
- SSRF protections if backend fetches arbitrary URLs from provider data

### 6.6 Observability
Implement:
- structured logs
- provider health endpoint
- last successful sync timestamps by provider
- error counters by provider adapter

---

## 7. System architecture

### 7.1 Recommended stack
- **Frontend**: Next.js 15 + TypeScript + React
- **Map**: Leaflet + React Leaflet
- **Backend**: Next.js route handlers or a small Fastify/FastAPI service
- **Validation**: Zod
- **State/query**: TanStack Query
- **Styling**: Tailwind CSS
- **Persistence**: none server-side for V1, optional SQLite later
- **Deploy**: Vercel (frontend) + lightweight backend/runtime if separate

### 7.2 Architecture pattern
Use a thin BFF/service layer:

`Browser -> App API -> Provider adapters -> External public sources`

Never let the browser call every provider directly. Reasons:
- CORS unpredictability
- central caching
- schema normalization
- fallback behavior
- easier future auth / routing features

### 7.3 Internal data model

#### Camera
```ts
interface Camera {
  id: string;                  // stable internal id: provider + source id/hash
  provider: 'vancouver' | 'drivebc';
  sourceId?: string;
  name: string;
  latitude: number;
  longitude: number;
  area?: string;
  roadName?: string;
  orientation?: string;
  pageUrl?: string;
  imageUrl?: string;
  imageUrls?: Array<{ label?: string; url: string }>;
  updateIntervalSeconds?: number;
  attribution?: string;
  raw?: unknown;
}
```

#### TrafficEvent
```ts
interface TrafficEvent {
  id: string;
  provider: 'drivebc';
  sourceId: string;
  headline: string;
  description?: string;
  eventType:
    | 'CONSTRUCTION'
    | 'SPECIAL_EVENT'
    | 'INCIDENT'
    | 'WEATHER_CONDITION'
    | 'ROAD_CONDITION';
  eventSubtype?: string;
  severity?: 'MINOR' | 'MODERATE' | 'MAJOR' | string;
  status: 'ACTIVE' | 'ARCHIVED';
  roadName?: string;
  areaId?: string;
  latitude?: number;
  longitude?: number;
  geometry?: GeoJSON.Geometry;
  created?: string;
  updated?: string;
  start?: string;
  end?: string;
  url?: string;
  raw?: unknown;
}
```

---

## 8. App API specification

All frontend traffic data must be consumed through internal app endpoints.

### 8.1 `GET /api/health`
Returns:
- app status
- provider status summary
- last sync timestamps

### 8.2 `GET /api/cameras`
Query params:
- `provider=vancouver|drivebc`
- `bbox=xmin,ymin,xmax,ymax`
- `q=...`
- `favoritesOnly=true|false` (frontend convenience only; may also be client-side)
- `limit`

Returns normalized `Camera[]`.

### 8.3 `GET /api/cameras/:id`
Returns one normalized camera with optional parsed image variants.

### 8.4 `GET /api/events`
Query params:
- `bbox=xmin,ymin,xmax,ymax`
- `lat`
- `lng`
- `radiusMeters`
- `eventType`
- `severity`
- `roadName`
- `limit`

Behavior:
- if `bbox` is provided, translate to DriveBC `bbox`
- if `lat/lng/radiusMeters` provided, translate to Open511 `geography` + `tolerance`
- cap radius to 10000 meters to match documented DriveBC behavior

### 8.5 `GET /api/bootstrap`
Single page-load bootstrap endpoint returning:
- map camera subset for default area
- active events for default area
- provider health
- config metadata

Use to reduce waterfall requests on first load.

---

## 9. Provider adapter requirements

### 9.1 Common adapter contract
```ts
interface ProviderAdapter<T> {
  name: string;
  healthcheck(): Promise<ProviderHealth>;
  fetchAll(): Promise<T[]>;
  fetchByBbox?(bbox: BBox): Promise<T[]>;
  fetchById?(id: string): Promise<T | null>;
}
```

### 9.2 DriveBC events adapter
Requirements:
- support `status=ACTIVE`
- support `bbox`
- support `geography` + `tolerance`
- normalize geometry to GeoJSON
- preserve raw payload for debugging
- respect pagination if result count exceeds single call limit

### 9.3 Vancouver camera adapter
Requirements:
- probe preferred v2.1 endpoint first
- fallback to Search API v1 if v2.1 fails
- fallback again to trafficcams site scrape if dataset access fails or returns incomplete records
- parse multiple image directions on detail page where possible
- tolerate missing coordinates or approximate coordinates

### 9.4 DriveBC camera adapter
Requirements:
- ingest camera metadata dataset
- infer stable internal ids
- preserve `pageUrl` and `imageUrl` separately when possible
- if only page URL is available, defer image extraction until detail fetch

---

## 10. UX requirements

### 10.1 Layout
Desktop-first responsive web app with:
- top bar
- left filters/search sidebar
- center map
- right drawer or bottom panel for details

### 10.2 Mobile behavior
- map full width
- bottom sheet for camera/event details
- collapsible filters

### 10.3 Default region
Open the map centered on Metro Vancouver / Vancouver proper.

### 10.4 Empty / degraded states
Examples:
- “DriveBC events are temporarily unavailable. Showing cameras only.”
- “Camera image unavailable right now. Open the official source page.”
- “Coordinates are approximate for some Vancouver cameras.”

---

## 11. Testing requirements

### 11.1 Unit tests
- provider payload normalization
- bbox translation
- local favorites store
- filter helpers

### 11.2 Integration tests
- DriveBC `/events` live contract test
- Vancouver dataset probe test
- Vancouver scrape fallback test
- camera detail page parser test

### 11.3 Smoke / E2E tests
Using Playwright:
- home page loads
- default map renders
- events appear
- camera detail opens
- favorite persists across reload
- provider outage banner displays under mocked failure

---

## 12. Deployment requirements

### 12.1 Environment variables
```bash
APP_DEFAULT_LAT=49.2827
APP_DEFAULT_LNG=-123.1207
APP_DEFAULT_ZOOM=11
CACHE_TTL_EVENTS_SECONDS=90
CACHE_TTL_VANCOUVER_CAMERAS_SECONDS=900
CACHE_TTL_DRIVEBC_CAMERAS_SECONDS=1800
```

No provider API keys required in V1.

### 12.2 Hosting
Prefer:
- Vercel for frontend + API routes if runtime limits are acceptable
- otherwise split frontend and backend

### 12.3 Scheduled refresh
Optional but recommended:
- warm caches every 2–5 minutes for events
- warm camera metadata every 15–60 minutes

---

## 13. Future hooks (not V1)

Keep interfaces ready for:
- route ETA adapter
- Google Maps Routes API adapter
- Mapbox Directions / OSRM alternative
- user accounts and cloud-synced favorites
- alerting / saved commute watches
- route corridor incident highlighting

---

## 14. Implementation sequence

### Phase 1
- project scaffold
- provider adapter contracts
- DriveBC events adapter
- Vancouver dataset adapter
- basic map and markers

### Phase 2
- DriveBC camera adapter
- camera detail modal
- favorites
- bootstrap endpoint

### Phase 3
- scrape fallbacks
- health checks
- observability
- Playwright tests
- deployment

---

## 15. Open risks and mitigation

### Risk 1: Vancouver API surface ambiguity
Mitigation:
- support both Opendatasoft v2.1 and v1 endpoint shapes
- add scrape fallback
- add contract tests in CI

### Risk 2: Camera pages may expose HTML not direct images
Mitigation:
- separate metadata fetch from image extraction
- cache parsed detail results
- always expose source-page fallback link

### Risk 3: External source downtime
Mitigation:
- independent provider adapters
- stale cache banners
- health endpoint

### Risk 4: Terms/licensing nuances
Mitigation:
- keep attribution visible
- avoid permanent image storage in V1
- review provider terms before adding archival or republishing features

---

## 16. Acceptance criteria

The V1 build is complete when:
1. the app loads in browser and centers on Vancouver
2. active DriveBC events render on the map
3. Vancouver cameras render on the map
4. BC highway cameras render on the map
5. clicking a camera shows image(s) or official source link
6. users can save favorites locally
7. provider failures do not crash the app
8. CI includes unit + integration + E2E coverage for main flows

---

## 17. Notes for the implementer

### Strong recommendation
Do **not** add Google Maps / ETA in V1. It adds cost, keys, and billing complexity without improving the core “check cams + incidents quickly” use case.

### Strong recommendation
Use **Leaflet + OpenStreetMap** in V1.

### Strong recommendation
Normalize all external data server-side and never leak provider-specific schema into React components.

---

## 18. Research notes / provenance

This TRD is based on the following official/public documentation surfaces:
- DriveBC Open511 documentation and examples
- City of Vancouver traffic camera pages
- City of Vancouver `web-cam-url-links` open dataset page
- DriveBC HighwayCams public dataset metadata
- Opendatasoft official API docs for records access patterns

Where an exact working URL pattern could not be directly exercised from the research environment, the endpoint shape above is intentionally marked as an **implementation probe requirement** rather than an unverified hardcoded certainty.
