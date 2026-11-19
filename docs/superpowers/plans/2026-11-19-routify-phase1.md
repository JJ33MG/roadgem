# Routify Phase 1 (Look and Planning) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the RoadGem frontend as Routify in Hallmark's Ribbon theme, with the new trip planner (kilometres a day, gems a day, gems switch, sleep types, filters), a stats endpoint the AI Agency Brain reads, and a preview on Railway.

**Architecture:** The React/Vite frontend gets a token-based design system (Ribbon) and new page components; the Express backend accepts the new planner fields through one validated parser and passes them to the itinerary prompt. A root Dockerfile builds both, and Express serves the built frontend in the preview service. The Brain (repo `ai-workflow`) reads `GET /api/stats` daily.

**Tech Stack:** React 18, Vite 5, Tailwind 3, TypeScript; Express, Prisma 5, PostgreSQL; vitest (+ @testing-library/react, jsdom) added for tests; vite-plugin-pwa; Hallmark 2.0 (`/home/user/nutlope/hallmark/skills/hallmark`).

**Spec:** `docs/superpowers/specs/2026-11-19-routify-redesign-design.md`

## Global Constraints

- Brand name in every visible place: **Routify** (header, footer, titles, PDF, error boundary). Never "Roadgem"/"RoadGem" in UI copy.
- Ribbon theme, dawn colourway; tokens copied verbatim from `references/themes/ribbon.md` § Tokens; fonts Instrument Sans 400/500 (heads) and Figtree 400/500 (body).
- Hallmark Floor (`SKILL.md` § The Floor, rules 1 to 14) on every page: colours and fonts only through tokens; no eyebrows or tracked caps; no middle-dot meta strings; no emoji icons; no invented numbers; `:focus-visible` on every control; `prefers-reduced-motion` fallback; `overflow-x: clip` on html and body.
- Accessibility for all ages: body text ≥ 18px, controls ≥ 48px tall, contrast ≥ 4.5:1.
- Planner defaults: 350 km a day (range 100 to 800, step 25), 3 gems a day (range 1 to 6), gems on, sleep in campsites and hotels.
- Sleep types: `campsite`, `hotel`, `holiday_home` (shown as "Airbnb and holiday homes").
- English copy, sentence case, ≤ 80 words per screen.
- Existing API routes keep working; no route or component tree deleted without replacing it in the same task.

## Review Focus

1. Kilometres a day larger than the whole route (Madrid to Toledo, 70 km, 350 km/day, 3 days): no day is padded with driving; nights stay at the destination. Test in Task 3.
2. Days × kilometres a day shorter than the route (Madrid to Brussels, 1,580 km, 3 days, 350 km/day): the planner tells the traveller before generating ("about 5 days at 350 km a day") instead of silently ignoring the setting. Test in Task 2.
3. Gems switched off: no gem cards, no "more gems with Plus" prompt, no gem map pins. Test in Task 5.
4. Phone width 390px: planner, filters sheet and trip page have no horizontal scroll and every control is reachable. Checked in Task 8 (render check at 390 and 1280).
5. Stats endpoint with no token or a wrong token: 401 and no data. Test in Task 6.

---

### Task 1: Ribbon design system and test tooling

**Files:**
- Create: `frontend/src/styles/tokens.css` (from `node <hallmark>/scripts/theme.mjs scaffold ribbon --dealt "1/3, seed routify-road-trip-planner-9f6e·51acb6c3·2026-11-19·r0"`), `frontend/src/styles/base.css` (scaffold output)
- Create: `frontend/src/components/ui/Button.tsx`, `Toggle.tsx`, `Switch.tsx`, `SliderField.tsx`, `Panel.tsx`, `index.ts`
- Modify: `frontend/index.html` (fonts link from ribbon.md § Build hint, title "Routify"), `frontend/src/styles/index.css` (imports tokens and base first, stamp lines at the top), `frontend/tailwind.config.js` (colours and fonts map to the CSS variables; old palette names removed)
- Modify: `frontend/package.json` (devDeps vitest, @testing-library/react, @testing-library/jest-dom, jsdom; script `"test": "vitest run"`), `frontend/vite.config.ts` (test env jsdom)
- Test: `frontend/src/components/ui/ui.test.tsx`
- Also: copy `/home/user/nutlope/hallmark/skills/hallmark` to `.claude/skills/hallmark` so later sessions have it.

**Interfaces:**
- Produces: `Button({variant: 'primary'|'secondary', ...button props})`, `Toggle({pressed: boolean, onChange(pressed: boolean), children})` renders `button[aria-pressed]`, `Switch({checked, onChange(checked), label})` renders `button[role=switch][aria-checked]`, `SliderField({label, value, min, max, step, unit, onChange(value: number)})` renders a labelled `input[type=range]` and the value text `${value} ${unit}`, `Panel({children})`.

- [ ] **Step 1:** Write `ui.test.tsx`: `Toggle` flips `aria-pressed` and calls `onChange(true)`; `Switch` sets `aria-checked` and toggles on click and on Space; `SliderField` with `value=350 unit="km"` shows "350 km" and its range input is labelled "Kilometres a day"; `Button variant="primary"` has min-height 48px via class.
- [ ] **Step 2:** Run `cd frontend && npx vitest run src/components/ui` → FAIL (modules missing).
- [ ] **Step 3:** Scaffold tokens/base, wire fonts, Tailwind and the five components (pill controls and machined panel per ribbon.md § Surfaces and § Controls).
- [ ] **Step 4:** Run `npx vitest run src/components/ui` → PASS; `npm run build` → succeeds.
- [ ] **Step 5:** Commit `feat(ui): Ribbon design system and base controls`.

### Task 2: Trip plan state and request

**Files:**
- Create: `frontend/src/lib/tripPlan.ts`, test `frontend/src/lib/tripPlan.test.ts`
- Modify: `frontend/src/types/index.ts` (`TripSearchParams` gains the fields below)

**Interfaces:**
- Produces:
  - `type StayType = 'campsite' | 'hotel' | 'holiday_home'`
  - `interface TripPlan { from: string; to: string; days: number; kmPerDay: number; gemsPerDay: number; gemsEnabled: boolean; stayTypes: StayType[]; filters: string[] }`
  - `const DEFAULT_PLAN: TripPlan` (values from Global Constraints, `days: 5`)
  - `const FILTER_GROUPS: { id: string; label: string; options: { id: string; label: string }[] }[]` (24 options in groups: Who, Pace, Interests, Stays, Access, Car; quick-row ids `family`, `friends`, `old_towns`, `nature`, `step_free`)
  - `function suggestedDays(routeKm: number, kmPerDay: number): number` → `Math.max(1, Math.ceil(routeKm / kmPerDay))`
  - `function toGenerateRequest(plan: TripPlan, startDate: Date): TripSearchParams` (adds `kmPerDay`, `gemsPerDay`, `gemsEnabled`, `stayTypes`, `filters`; maps `stayTypes` to the existing `accommodationTypes`; `endDate = startDate + days`)

- [ ] **Step 1:** Tests: `toGenerateRequest(DEFAULT_PLAN, new Date('2026-06-04'))` has `kmPerDay: 350, gemsPerDay: 3, gemsEnabled: true, stayTypes: ['campsite','hotel'], days: 5, endDate: '2026-06-09'`; `suggestedDays(1580, 350) === 5`; `suggestedDays(70, 350) === 1`; every quick-row id exists in `FILTER_GROUPS`; `FILTER_GROUPS` has 24 options with unique ids.
- [ ] **Step 2:** Run `npx vitest run src/lib/tripPlan.test.ts` → FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat(plan): trip plan state with km a day, gems and filters`.

### Task 3: Backend accepts the new planner fields

**Files:**
- Create: `backend/src/utils/tripRequest.ts`, test `backend/src/utils/tripRequest.test.ts`
- Modify: `backend/src/routes/trips.ts:34-100` (use the parser; skip all gem lookups when `gemsEnabled` is false), `backend/src/utils/claude.ts:12-60` (`generateTripItinerary` takes `options: { kmPerDay; gemsPerDay; gemsEnabled; stayTypes; filters }` and adds the prompt rules below)
- Modify: `backend/package.json` (devDep vitest, script `"test": "vitest run"`)

**Interfaces:**
- Produces: `parseGenerateBody(body: unknown): { ok: true; value: GenerateRequest } | { ok: false; error: string }` where `GenerateRequest` = the existing fields plus `kmPerDay: number` (clamped 100 to 800, default 350), `gemsPerDay: number` (clamped 1 to 6, default 3), `gemsEnabled: boolean` (default true), `stayTypes: ('campsite'|'hotel'|'holiday_home')[]` (unknown values dropped; empty → `['campsite','hotel']`), `filters: string[]` (max 30, each ≤ 40 chars).
- Prompt rules (exact intent): each day's driving ends near `kmPerDay` km, never more than 20% over; when the whole route is shorter than one day's distance, stay at the destination and do not add driving; overnight stops are towns that have the chosen stay types; with gems off, return no gem or detour suggestions; with gems on, about `gemsPerDay` short stops per day spread along that day's road.

- [ ] **Step 1:** Tests: missing `startLocation` → `{ok:false}`; `kmPerDay: 5000` → 800; `kmPerDay: "abc"` → 350; `stayTypes: ['castle']` → `['campsite','hotel']`; `gemsEnabled: false` stays false; 40 filters → 30.
- [ ] **Step 2:** Run `cd backend && npx vitest run src/utils/tripRequest.test.ts` → FAIL.
- [ ] **Step 3:** Implement the parser, wire the route and the prompt.
- [ ] **Step 4:** Run → PASS; `npm run build` → succeeds.
- [ ] **Step 5:** Commit `feat(api): km a day, gems switch and stay types in trip generation`.

### Task 4: Layout, homepage and planner

**Files:**
- Create: `frontend/src/components/planner/PlannerPanel.tsx`, `FiltersSheet.tsx`, test `planner.test.tsx`
- Modify: `frontend/src/components/nav/Header.tsx`, `Footer.tsx`, `MobileMenu.tsx`, `ErrorBoundary.tsx` (Routify), `frontend/src/pages/LandingPage.tsx` (rewritten), `frontend/src/pages/SearchFormPage.tsx` (renders `PlannerPanel` full width)
- Remove from the landing page: `GlobeView`, the AI-agents pill, emoji travel-style tiles.

**Interfaces:**
- Consumes: Task 1 components; Task 2 `TripPlan`, `DEFAULT_PLAN`, `FILTER_GROUPS`, `toGenerateRequest`, `suggestedDays`; existing `useTripGeneration`.
- Produces: `PlannerPanel({ initial?: TripPlan, onSubmit(plan: TripPlan) })`, `FiltersSheet({ open, selected: string[], onChange(ids: string[]), onClose })` (a dialog with groups, a clear button and "Show trips"; focus trapped; Esc closes).

The homepage follows the approved Ribbon preview (artifact `Ribbon.dc.html`): band hero with the head "Your road trip, set just right." and the sentence "Set the pace and the detours. Routify plans the days, beds and gems.", the planner panel, the five-day example rows with one photo, the community teaser (challenge card, a posted photo, "Found a new gem?"), footer with photo credits. Photos: the Wikimedia files in `frontend/public/photos/` with credits in the footer.

- [ ] **Step 1:** Tests: `PlannerPanel` shows "350 km", "3" gems, the gems switch checked, Campsites and Hotels pressed; submitting calls `onSubmit` with `DEFAULT_PLAN` values and the typed From/To; switching gems off hides the gems slider; with route km known as 1,580 and 3 days at 350 km a day, a note "About 5 days at 350 km a day" appears; `FiltersSheet` lists 24 options and Esc calls `onClose`.
- [ ] **Step 2:** Run `npx vitest run src/components/planner` → FAIL.
- [ ] **Step 3:** Implement the panel, the sheet, header/footer and the homepage.
- [ ] **Step 4:** Run → PASS; `npm run build` → succeeds.
- [ ] **Step 5:** Commit `feat(home): Routify homepage and planner in Ribbon`.

### Task 5: Trip results page

**Files:**
- Modify: `frontend/src/pages/TripResultsPage.tsx` (restyled, same data), `frontend/src/components/display/ItineraryDayCard.tsx`, `AccommodationCard.tsx`, `RentalCarCard.tsx`, `TripMap.tsx` (Ribbon colours via tokens)
- Test: `frontend/src/pages/TripResultsPage.test.tsx`

Layout: summary head (route, days, distance), day tabs, per day: gems with their detour, then "Sleep in <town>" with buttons per chosen stay type (Booking.com for hotels and campsites, Airbnb for holiday homes, existing builders), the map beside on desktop and below on phone, the rental-car box, the Plus prompt only when gems are on.

- [ ] **Step 1:** Tests with a fixture trip: renders each day head "Madrid to Burgos"; with `gemsEnabled: false` there is no element with text "gem" and no Plus prompt; stay buttons follow `stayTypes` (`['holiday_home']` shows only "Airbnb and holiday homes").
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement; the trip stores `gemsEnabled` and `stayTypes` from the request (Task 3 saves them on the Trip JSON it already writes).
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat(trip): trip page in Ribbon with stays per chosen type`.

### Task 6: Stats endpoint and affiliate click tracking

**Files:**
- Modify: `backend/prisma/schema.prisma` (model `AffiliateClick { id String @id @default(cuid()); partner String; tripId String?; userId String?; createdAt DateTime @default(now()); @@index([createdAt]) }`), new migration
- Create: `backend/src/routes/stats.ts`, `backend/src/routes/track.ts`, tests `backend/src/routes/stats.test.ts`
- Modify: `backend/src/server.ts` (mount `/api/stats`, `/api/track`), frontend affiliate links call `POST /api/track/click` (`navigator.sendBeacon`) before opening

**Interfaces:**
- Produces: `GET /api/stats` with header `x-stats-token` equal to env `STATS_TOKEN` → `{ generatedAt, users: { total, last7d }, trips: { total, last7d }, plus: number, affiliateClicks: { last7d, byPartner: Record<string, number> }, community: { pending, approved } }`; otherwise 401 `{ error: 'Unauthorized' }`. `POST /api/track/click` body `{ partner: string (≤ 30), tripId?: string }` → 204.
- Produces: `buildStats(prisma, now: Date)` in `stats.ts` (exported for the test).

- [ ] **Step 1:** Tests (prisma mocked): no header → 401; wrong token → 401; `STATS_TOKEN` unset → 401 even with a header; right token → shape above; `buildStats` counts `last7d` from `now`.
- [ ] **Step 2:** Run `npx vitest run src/routes/stats.test.ts` → FAIL.
- [ ] **Step 3:** Implement routes, model, migration, beacon calls.
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat(stats): stats for the AI Agency Brain and affiliate click tracking`.

### Task 7: Login, sign-up, pricing and PWA

**Files:**
- Modify: `frontend/src/pages/LoginPage.tsx`, `SignupPage.tsx`, `PricingPage.tsx` (Ribbon; Free €0: 1 saved trip, 3 gems per trip; Plus €9/month: unlimited trips, every gem, PDF)
- Modify: `frontend/package.json` (dep `vite-plugin-pwa`), `frontend/vite.config.ts` (manifest: name "Routify", short_name "Routify", theme colour = `--color-accent` value, display `standalone`, icons 192 and 512)
- Create: `frontend/public/icons/icon-192.png`, `icon-512.png` (the wordmark's R on the accent, generated with sharp)

- [ ] **Step 1:** Test `frontend/src/pages/PricingPage.test.tsx`: shows "€0" and "€9" and the Plus features; no element with class containing "gradient".
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement. **Step 4:** Run → PASS; `npm run build` → `dist/manifest.webmanifest` and `dist/sw.js` exist.
- [ ] **Step 5:** Commit `feat: auth and pricing in Ribbon, installable as an app`.

### Task 8: Preview on Railway and the Hallmark sweep

**Files:**
- Create: `Dockerfile` (root: build frontend with `VITE_BACKEND_URL=""`, build backend, copy `frontend/dist` to `backend/public`), `.dockerignore`
- Modify: `backend/src/server.ts` (when `SERVE_FRONTEND=true`: `express.static('public')` and an SPA fallback for non-`/api` routes)

Railway (project `renewed-growth`): new service `routify-preview` from `JJ33MG/roadgem`, branch `claude/artifact-session-ookvec`, root `/`, Dockerfile builder; variables reference the `roadgem` service's (`DATABASE_URL`, `CLAUDE_API_KEY`, `CLAUDE_MODEL`, `GOOGLE_MAPS_API_KEY`, `OPENWEATHER_API_KEY`, `TAVILY_API_KEY`, `JWT_SECRET`, `REDIS_URL`) plus `SERVE_FRONTEND=true`, `STATS_TOKEN` (random 48 chars), `FRONTEND_URL` = its own domain; a generated domain.

- [ ] **Step 1:** Deploy; `curl https://<preview>/api/health` → 200; `/` returns the Routify homepage HTML.
- [ ] **Step 2:** Run `node .claude/skills/hallmark/scripts/sloplint.mjs --url https://<preview>/ --render` and for `/plan` and a generated trip → fix every FAIL, waive or fix every REFLEX.
- [ ] **Step 3:** Screenshots at 1280×800 and 390×844 of home, planner (filters open) and trip page: no horizontal scroll, hero text and action visible at 1280×800.
- [ ] **Step 4:** Commit `chore: preview service and Hallmark sweep`.

### Task 9: Routify in the AI Agency Brain (repo `/home/user/ai-workflow`)

**Files:**
- Create: `src/integrations/routify.ts`, `src/agents/routify.ts`, test `test/routify.test.ts`
- Modify: `src/agents/index.ts`, `src/scheduler.ts` (daily 08:10), `src/config.ts` (`routify: { url: ROUTIFY_URL, statsToken: ROUTIFY_STATS_TOKEN }`), `src/lib/health.ts` (check "Routify"), `src/agents/ceo.ts` briefing data (a Routify line), `src/dashboard.ts` (business `roadgem` shows the latest stats)

**Interfaces:**
- Consumes: Task 6 `GET /api/stats` response.
- Produces: `fetchRoutifyStats(): Promise<RoutifyStats>`; task `routify:sync_stats` saves the result in Setting `routify.stats` and logs one Dutch line ("Routify: 12 nieuwe gebruikers, 30 trips, 2 Plus, 41 affiliate-kliks deze week").

- [ ] **Step 1:** Tests: `fetchRoutifyStats` sends `x-stats-token`; a 401 throws a Dutch error naming `ROUTIFY_STATS_TOKEN`; `sync_stats` stores the setting and the briefing data includes `routify`.
- [ ] **Step 2:** Run `TEST_DATABASE_URL=… npx vitest run test/routify.test.ts` → FAIL. **Step 3:** Implement. **Step 4:** Run all ai-workflow tests → PASS; set `ROUTIFY_URL` and `ROUTIFY_STATS_TOKEN` on the Brain's Railway service.
- [ ] **Step 5:** Commit in ai-workflow `feat(routify): daily Routify stats in the dashboard and briefing`.
