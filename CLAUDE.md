# RoadGem — Agent Context

Read VISION.md for the full product vision. This file covers the technical context agents need to work effectively.

---

## Project Structure

```
roadgem/
├── frontend/          # React 18 + TypeScript + Vite + Tailwind CSS
│   └── src/
│       ├── pages/         # Route-level pages
│       ├── components/    # Shared UI components
│       │   ├── display/   # Cards, images, maps
│       │   ├── forms/     # Search, inputs
│       │   ├── nav/       # Header, Footer
│       │   └── utility/   # Modal, Spinner, ErrorBoundary
│       ├── hooks/         # Data-fetching and state hooks
│       ├── lib/           # API client (apiClient.ts, api.ts)
│       ├── context/       # AuthContext (user, token, refreshUser)
│       ├── styles/        # index.css — Mercury design system
│       └── types/         # Shared TypeScript types
├── backend/           # Node.js + Express + TypeScript
│   └── src/
│       ├── routes/        # Express routers
│       ├── utils/         # claude.ts, places.ts, affiliates.ts, weather.ts, tavily.ts
│       ├── middleware/    # auth.ts (requireAuth, optionalAuth)
│       └── server.ts      # App entry point
├── VISION.md          # Product vision and roadmap
└── CLAUDE.md          # This file
```

---

## Running Locally

**Frontend** (port 5173):
```
cd frontend && npm run dev
```

**Backend** (port 5000):
```
cd backend && npm run dev
```
The backend `npm run dev` script now includes `--project tsconfig.json` — this is required for correct TypeScript resolution with Stripe.

**Important**: Backend must be started from the `backend/` directory so `dotenv` finds `.env`.

---

## Backend API Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/auth/signup | — | Create account |
| POST | /api/auth/login | — | Login, returns JWT |
| GET | /api/auth/me | required | Get current user |
| POST | /api/trips/generate | optional | Generate + save trip |
| GET | /api/trips/:id | — | Get trip details |
| GET | /api/user/trips | required | Get user's saved trips |
| GET | /api/subscription/status | required | Get tier + expiry |
| POST | /api/subscription/upgrade | required | Upgrade to premium (direct, no Stripe) |
| POST | /api/subscription/downgrade | required | Downgrade to free |
| POST | /api/stripe/create-checkout-session | required | Start Stripe checkout (requires keys) |
| POST | /api/stripe/webhook | — | Stripe event handler |
| GET | /api/photos | — | Google Places photo URLs |
| GET | /api/accommodations | — | Nearby hotels/hostels/campsites |
| GET | /api/destinations/suggestions | — | Autocomplete |

---

## Environment Variables (backend/.env)

```
PORT=5000
FRONTEND_URL=http://localhost:5173
CLAUDE_API_KEY=...           # Anthropic API key
CLAUDE_MODEL=claude-sonnet-4-6
GOOGLE_MAPS_API_KEY=...      # Google Places + Maps JS API
OPENWEATHER_API_KEY=...      # OpenWeatherMap
TAVILY_API_KEY=...           # Tavily web search (hidden gems)
DATABASE_URL="file:./dev.db"
JWT_SECRET=...
STRIPE_SECRET_KEY=sk_test_YOUR_KEY_HERE       # Add when Stripe verified
STRIPE_WEBHOOK_SECRET=whsec_YOUR_KEY_HERE     # Add when Stripe verified
STRIPE_PRICE_ID=price_YOUR_ID_HERE            # Add when Stripe verified
BOOKING_AFFILIATE_ID=        # Add when registered
AIRBNB_AFFILIATE_ID=         # Add when registered
```

---

## Design System (Mercury)

All styles are in `frontend/src/styles/index.css`.

**Colors**:
- `mercury-blue`: #af50ff (primary accent, CTAs, icons)
- `deep-space`: #090909 (hero backgrounds)
- `midnight-slate`: #0c0c10 (page background)
- `starlight`: #f7f9fa (primary text)
- `silver`: #828384 (secondary text)
- `graphite`: #454545 (borders, surfaces)
- `plum`: #7f56d9 (secondary accent)

**Key CSS classes**:
- `.btn-primary` — filled purple button
- `.btn-header` — ghost button
- `.card` — standard content card
- `.glass-panel` — glassmorphic panel
- `.section` — max-width container with padding
- `.text-gradient-accent` — starlight→mercury-blue gradient text
- `.text-serif-accent` — italic accent text

**Typography**:
- `font-display` — headings
- `font-body` — body text
- `font-mono` — labels, badges, monospace

---

## Subscription Model

- **Free**: 1 saved trip, no hidden gems
- **Premium**: €9/month, unlimited trips, hidden gems, PDF export, 5+ stops
- Tier stored on `User.subscriptionTier` ("free" | "premium")
- Stripe integration ready — awaiting company verification
- Direct upgrade fallback at `POST /api/subscription/upgrade` for dev/testing

---

## Affiliate Revenue Streams

Currently integrated:
- **Booking.com** — hotel search links (set `BOOKING_AFFILIATE_ID` in .env)
- **Airbnb** — home rental links (set `AIRBNB_AFFILIATE_ID` in .env)
- **Viator** — activity booking links (injected per activity in trip results)

Planned:
- **GetYourGuide** — tours and experiences
- **TheFork** — restaurant reservations
- **Auto Europe / Rentalcars.com** — car rental
- **TravelInsurance.com** — travel insurance

---

## Key Conventions

- **Never cache empty results** — photo and nearby-place caches only store successful responses
- **Always use `VITE_BACKEND_URL`** (not `baseURL`) for constructing image URLs in frontend — baseURL already contains `/api`, photo paths start with `/api/...`, combining them creates double `/api/api/`
- **Claude prompt location constraint** — every itinerary prompt explicitly states activities must be in the destination city, not mixed from other locations
- **Premium gates** — hidden gems are blurred/locked for free users in `TripResultsPage.tsx`
- **Backend CWD matters** — start backend from `roadgem/backend/` directory for dotenv to load `.env`

---

## Known Pending Items

- [ ] Stripe keys (waiting for company verification)
- [ ] Booking.com + Airbnb affiliate IDs (sign up at their partner programs)
- [ ] GetYourGuide affiliate integration
- [ ] TheFork restaurant reservation links
- [ ] Deploy to Vercel + Railway
- [ ] PostgreSQL migration for production
- [ ] Multi-language support (NL, EN, FR, DE)
- [ ] Mobile app (React Native)
- [ ] SEO / blog content
