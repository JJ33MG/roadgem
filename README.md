# ROADGEM

AI-powered road trip planner. Users describe a destination, dates, budget and travel style; Claude-powered agents research the destination, optimize the route and generate a day-by-day itinerary with an interactive map.

## Tech stack

- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS (Mercury design system)
- **Backend:** Node.js + Express + TypeScript
- **Database:** PostgreSQL
- **AI:** Claude API (`@anthropic-ai/sdk`)
- **Automation:** node-cron scheduled agents
- **Hosting:** Vercel (frontend) + Railway (backend)

## Project structure

```
roadgem/
├── frontend/                # Vite + React + TS + Tailwind app
│   ├── src/
│   │   ├── pages/            # LandingPage, SearchFormPage, TripResultsPage, DashboardPage, ...
│   │   ├── components/
│   │   │   ├── nav/           # Header, MobileMenu, Footer
│   │   │   ├── forms/          # SearchForm, DateRangePicker, BudgetSlider, ...
│   │   │   ├── display/        # TripSummaryCard, ItineraryDayCard, ActivityCard, ...
│   │   │   ├── map/             # TripMap (Google Maps)
│   │   │   └── utility/        # LoadingSpinner, Toast, Modal, ErrorBoundary, ProtectedRoute
│   │   ├── context/           # AuthContext
│   │   ├── hooks/              # useTripGeneration, useTrip, useUserTrips, ...
│   │   ├── lib/                 # apiClient (axios), api (endpoint wrappers)
│   │   ├── types/               # Shared domain types
│   │   └── styles/              # Tailwind entrypoint + design tokens
│   └── ...
├── backend/                  # Express + TS API
│   ├── src/
│   │   ├── routes/             # auth, trips, bookings, user, utils
│   │   ├── controllers/        # Request handlers
│   │   ├── services/            # Business logic (trip generation, bookings, ...)
│   │   ├── agents/               # AI agents (location research, fuel prices, route optimizer, itinerary generator)
│   │   ├── models/               # PostgreSQL data access
│   │   ├── middleware/          # auth (JWT), validation (zod), error handling
│   │   ├── db/migrations/        # SQL schema migrations
│   │   ├── config/                # env, db pool, Claude client
│   │   └── server.ts / app.ts
│   └── ...
├── .env.example              # All environment variables (reference)
└── README.md
```

## Prerequisites

- Node.js 20+
- PostgreSQL 14+
- API keys: Anthropic (Claude), Google Maps/Places, OpenWeather, SendGrid (optional), Stripe (future)

## Setup

### 1. Install dependencies

```bash
cd frontend && npm install
cd ../backend && npm install
```

### 2. Configure environment variables

Copy the example env files and fill in your values:

```bash
cp .env.example backend/.env
cp frontend/.env.example frontend/.env
```

Key variables (see `.env.example` for the full list):

- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` — secret used to sign auth tokens
- `ANTHROPIC_API_KEY` — Claude API key
- `GOOGLE_MAPS_API_KEY` / `GOOGLE_PLACES_API_KEY` — Google Maps & Places
- `VITE_GOOGLE_MAPS_API_KEY` — Google Maps key for the frontend map
- `OPENWEATHER_API_KEY` — weather forecasts
- `BOOKING_COM_AFFILIATE_ID` — affiliate links for hotel bookings
- `SENDGRID_API_KEY` — email notifications

### 3. Create the database and run migrations

```bash
createdb roadgem
cd backend
npm run migrate
```

This applies the SQL files in `backend/src/db/migrations` in order (users, trips, itinerary_items, bookings, agent support tables).

### 4. Run the apps locally

```bash
# Terminal 1 — backend (http://localhost:4000)
cd backend
npm run dev

# Terminal 2 — frontend (http://localhost:5173)
cd frontend
npm run dev
```

The frontend expects the API at `VITE_API_BASE_URL` (default `http://localhost:4000/api`).

### 5. Scheduled AI agents

When `ENABLE_CRON_AGENTS=true`, the backend starts two cron jobs on boot:

- **Location research** (`LOCATION_RESEARCH_CRON`, default `0 2 * * *`) — researches hidden gems for popular destinations and stores insights in `destination_insights`.
- **Fuel price updater** (`FUEL_PRICE_UPDATE_CRON`, default `0 */4 * * *`) — refreshes EU fuel prices in `fuel_price_cache`.

The route optimizer and itinerary generator agents run on-demand as part of `POST /api/trips/generate`.

## API overview

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/signup` | — | Create an account |
| POST | `/api/auth/login` | — | Log in |
| GET | `/api/auth/me` | required | Current user |
| POST | `/api/trips/generate` | optional | Generate a trip (route + itinerary) |
| GET | `/api/trips/:tripId` | — | Trip details (route, stops, itinerary, fuel stations) |
| POST | `/api/trips/:tripId/save` | required | Save a trip to the user's account |
| GET | `/api/user/trips` | required | All saved trips for the user |
| GET | `/api/trips/:tripId/hotel-options` | — | Hotel options for a trip |
| GET | `/api/trips/:tripId/restaurant-options` | — | Restaurant options for a trip |
| POST | `/api/trips/:tripId/book` | required | Book a hotel/restaurant/activity |
| GET | `/api/fuel-prices?lat=&lng=` | — | Nearby fuel stations + prices |
| GET | `/api/weather/:destination` | — | Weather forecast |
| GET | `/api/destinations/suggestions?query=` | — | Destination autocomplete |

## Design system

The UI follows the **Mercury** style reference — a dark "command center" theme:

- Backgrounds: Deep Space `#171721`, Midnight Slate `#1e1e2a`, Graphite `#272735`
- Text: Starlight `#ededf3` (primary), Silver `#c3c3cc` (secondary)
- Accent: Mercury Blue `#5266eb` — reserved for primary CTAs
- Fonts: `arcadiaDisplay` (headlines, weight 360) and `arcadia` (body), both falling back to Inter/Manrope
- Buttons are fully rounded pills (`32px`/`40px`); cards use `0px`/`4px` radii
- Design tokens live in `frontend/tailwind.config.js` and `frontend/src/styles/index.css`

## Next steps

1. **Agents** — implement response parsing in `backend/src/agents/routeOptimizer.agent.ts` and `itineraryGenerator.agent.ts` (currently call Claude but don't parse results into stops/itinerary items yet).
2. **Bookings** — wire `backend/src/services/booking.service.ts` up to Google Places + Booking.com affiliate feed.
3. **Utilities** — implement `backend/src/services/utils.service.ts` (fuel station lookup, weather geocoding, destination autocomplete).
4. **Frontend polish** — add hero image (`frontend/public/images/hero.jpg`) and fuel pin icon (`frontend/public/icons/fuel-pin.svg`).
5. **PDF export** — implement the "Download PDF" action on the trip results page.
6. **Auth hardening** — refresh tokens, password reset flow.
7. **Stripe** — payments for premium features (keys already in `.env.example`).
8. **Deploy** — frontend to Vercel, backend to Railway; set environment variables on both platforms.
