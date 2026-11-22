# Routify plan 2B (exact dates and group, car rental, community) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Booking and rental links carry the traveller's exact dates and group size, a car rental option fits the group, and the community becomes something to do on the road, shared and rewarded, with Plus unlocking more.

**Architecture:** Frontend React/Vite (`frontend/`), backend Express/Prisma/Postgres (`backend/`). Trip extras live in `Trip.planner` JSON. Community adds Prisma models `CheckIn` and `Invite` and two `User` fields (one migration). Partner links go through `backend/src/utils/partners.ts` (`/api/track/go/:partner`).

**Tech Stack:** React 18, Tailwind, vitest; Express, Prisma 5, sharp (share card PNG).

**Spec:** `docs/superpowers/specs/2026-11-22-routify-community-design.md` (community) and Jarne's requests in chat: exact dates and group in the planner, car rental for groups without a car.

## Global Constraints
- Hallmark floor: tokens only, no emoji, sloplint 0 FAIL, 48px targets, body ≥18px, English copy.
- No fake users or invented posts; launch content is labelled "Routify team".
- Invites: friend gets 14 days of Plus; inviter gets 7 days per friend who signs up, at most 8 rewards per 365 days.
- Free: 1 photo post per day; Plus: unlimited. Plus points ×2. Suggest a gem: Plus only. Explorer gems: Plus only. Monthly challenge: Plus only.
- Check-in counts only within 300 m (`SPOT_METRES`), once per user per gem per trip.
- Every partner link goes through `goLink()` (frontend) / `partnerTarget()` (backend).

## Review Focus
1. A trip planned before this plan (no `startDate` in planner, no `travellers`): links fall back to 2 adults and the trip's own `startDate`; nothing crashes.
2. Geolocation denied or unavailable: "I'm here" shows "Allow location to check in" and nothing is sent.
3. Someone uses their own invite code, or a code twice: no reward (self-invite and repeat signup refused).
4. A Plus member whose Plus came from an invite and expired: limits of the free plan apply again (uses `hasPlus`).
5. Share card for a trip with 0 check-ins: card still renders ("0 of N gems collected").

---

### Task 1: Start date and group in the planner
**Files:** Modify `frontend/src/lib/tripPlan.ts`, `frontend/src/components/planner/PlannerPanel.tsx`, `frontend/src/components/planner/TripPlanner.tsx`, `backend/src/utils/tripRequest.ts`, `backend/src/routes/trips.ts`. Tests: `frontend/src/components/planner/planner.test.tsx`, `backend/src/utils/tripRequest.test.ts`.
**Interfaces — Produces:** `TripPlan.startDate: string` (yyyy-mm-dd, default today + 14 days), `TripPlan.travellers: number` (1–9, default 2); request field `travellers`; `planner.travellers` stored; `TripPlanner` sends `plan.startDate` instead of tomorrow.
- [ ] Tests: the form shows "Leaving on" (date input) and "Travellers" (number 1–9); submitting sends `startDate` as chosen and `travellers: 4`; a date in the past is refused with "Pick a day from today on"; backend `parseGenerateBody({travellers: 12})` → 9, missing → 2.
- [ ] Run → FAIL; implement; run → PASS. Commit `feat(planner): leaving date and group size`.

### Task 2: Links carry dates and group
**Files:** Modify `frontend/src/pages/TripResultsPage.tsx` (`stayUrl`), `backend/src/routes/accommodations.ts`, `backend/src/utils/affiliates.ts` (`buildBookingUrl`). Test: page test, `backend/src/utils/affiliates.test.ts`.
**Interfaces — Produces:** `stayUrl(type, place, checkin?, checkout?, adults = 2)`; Booking params `group_adults`, `no_rooms = ceil(adults/2)`, `group_children=0`; Vrbo `adults`; accommodations route reads `adults` query.
- [ ] Tests: 4 travellers → Booking link has `group_adults=4&no_rooms=2`; old trip without travellers → `group_adults=2`; Vrbo link has `adults=4`.
- [ ] Implement; commit `feat(partners): stays booked for the whole group`.

### Task 3: Car rental for the group
**Files:** Create `frontend/src/lib/cars.ts`; Modify `TripResultsPage.tsx` (rental panel), `backend/src/utils/partners.ts` (partner `discovercars`, hosts `discovercars.com`, param `a_aid` from `DISCOVERCARS_AFFILIATE_ID`), `frontend/src/lib/track.ts` (regex). Tests: `frontend/src/lib/cars.test.ts`, page test, `backend/src/utils/partners.test.ts`.
**Interfaces — Produces:** `carForGroup(people: number): { label: string; seats: number }` — ≤4 "A compact car (4 to 5 seats)", 5 "A family car or estate (5 seats, big boot)", 6–7 "A 7-seater", 8–9 "A 9-seat minivan"; rental panel shows for vehicle `car`/`ev` (and when filter `rental_car`), text "Pick up in {from} on {date}, drop off in {to} on {date}. {carForGroup}"; buttons "Compare cars" (DiscoverCars via go) and "Rentalcars.com" (existing link with dates).
- [ ] Tests: `carForGroup(6).seats === 7`; panel for 6 travellers says "A 7-seater"; DiscoverCars link goes through `/track/go/discovercars`; `partnerTarget('discovercars', ...)` adds `a_aid` when set.
- [ ] Ruling to record: DiscoverCars' deep-link parameters for dates are not public; the link opens DiscoverCars at the pickup town page until the affiliate panel shows the date parameters (then a one-line change).
- [ ] Commit `feat(rental): a car that fits the group, with dates and places`.

### Task 4: Check-ins and the trip passport (backend)
**Files:** Modify `backend/prisma/schema.prisma` (+ migration `20261123090000_community_road`), Create `backend/src/community/road.ts`, Modify `backend/src/routes/play.ts`. Test: `backend/src/community/road.test.ts`.
**Interfaces — Produces:** model `CheckIn { id, userId, tripId, placeId, name, lat, lng, distanceM, points, createdAt; @@unique([userId, tripId, placeId]) }`; `checkIn(db, { userId, tripId, placeId, at, plus }): Promise<{ points: number; stamps: number; total: number }>`; `passport(db, userId, tripId): Promise<{ total: number; stamps: { placeId: string; name: string; at: string }[] }>`; routes `POST /api/community/checkins` (requireAuth) and `GET /api/community/passport/:tripId` (requireAuth). Points: check-in 20, ×2 with Plus (`hasPlus`).
- [ ] Tests: 250 m from the gem → stamp, 20 points (40 with Plus); 400 m → 400 "Check-ins count only within 300 m of the gem."; a placeId not among the trip's gems → 404; a second check-in at the same gem → 409 "Already collected"; passport lists stamps and total = the trip's gem count.
- [ ] Commit `feat(community): check in at a gem, trip passport`.

### Task 5: On the road panel (frontend)
**Files:** Create `frontend/src/components/trip/OnTheRoad.tsx`, `frontend/src/lib/road.ts`; Modify `TripResultsPage.tsx`. Test: `frontend/src/components/trip/onTheRoad.test.tsx`.
**Interfaces — Consumes:** Task 4 routes. **Produces:** panel "On the road" on the day view: the day's gems with distance and an "I'm here" button (geolocation), passport bar "4 of 9 gems", signed-out → "Log in to collect stamps".
- [ ] Tests: "I'm here" sends `{tripId, placeId, at}` from mocked geolocation and shows "Collected, +20 points"; geolocation error → "Allow location to check in" and no request; passport shows "4 of 9 gems".
- [ ] Commit `feat(community): on the road, collect the gems of the day`.

### Task 6: Free and Plus in the community
**Files:** Modify `backend/src/community/service.ts` (`createPost`, `suggestGem`, points), `backend/src/routes/play.ts`, Create `backend/src/community/explorer.ts`; frontend `CommunityPage.tsx`, `SuggestGemPage.tsx`, `PricingPage.tsx`. Tests: `backend/src/community/service.test.ts` (with fake db), `backend/src/community/explorer.test.ts`, page tests.
**Interfaces — Produces:** `createPost(..., { plus })` refuses a second post in 24 h for free users with 429 "Free members post one photo a day. Plus posts without limit."; post points ×2 with Plus; `suggestGem` without Plus → 403 "Suggesting new gems comes with Plus."; `explorerGemsNear(db, line, km=20)` (official community `Gem` rows near the trip road); `GET /api/community/explorer/:tripId` → Plus: `{ gems }`, free: `{ locked: true, count }`; monthly challenge `MONTHLY[month]` text, posts with `monthly: true` only for Plus (403 otherwise).
- [ ] Tests for each refusal message and the ×2 points; a user whose Plus (from an invite) expired yesterday gets the free limit again; explorer returns only official gems within 20 km of the road; free gets `{locked:true,count:2}`.
- [ ] Pricing table rows updated to the spec's Free/Plus table.
- [ ] Commit `feat(community): free is basic, Plus unlocks more`.

### Task 7: Invites
**Files:** Modify schema (`User.inviteCode String? @unique`, `User.invitedById String?`, `User.isTeam Boolean @default(false)`, model `Invite { id, inviterId, inviteeId @unique, rewarded Boolean, createdAt }`, same migration as Task 4), Create `backend/src/community/invites.ts`, Modify `backend/src/routes/auth.ts` (signup reads `invite`), frontend `SignupPage.tsx`, `DashboardPage.tsx` (your link). Test: `backend/src/community/invites.test.ts`, signup page test.
**Interfaces — Produces:** `inviteCodeFor(db, userId): Promise<string>` (8 chars, created once); `acceptInvite(db, { code, inviteeId, now }): Promise<{ inviteeDays: 14; inviterDays: 7 | 0 }>`; Plus time added from `max(now, current expiry)`; inviter rewarded only for the first 8 invites in 365 days; self-invite and unknown code → no reward, signup still succeeds; `/signup?invite=CODE` shows "A friend gave you 2 weeks of Plus".
- [ ] Tests: friend gets premium until now+14 d; inviter's expiry moves 7 d; 9th invite in a year gives the inviter 0; own code → nothing; the same invitee accepted twice → second call gives nothing (`Invite.inviteeId` unique).
- [ ] Commit `feat(community): invite a friend, both get Plus time`.

### Task 8: Share card
**Files:** Create `backend/src/community/card.ts`, route `GET /api/community/card/:tripId.png` (optionalAuth); frontend button "Share your trip" in `TripResultsPage.tsx`. Test: `backend/src/community/card.test.ts`.
**Interfaces — Produces:** `cardSvg({ from, to, gems: {done, total}, km, countries: string[], inviteUrl }): string` (1080×1920, tokens' hex colours, text via XML-escaped text nodes), PNG through sharp; frontend uses `navigator.share({ files })` when available, else downloads `routify-trip.png`.
- [ ] Tests: SVG contains "Amsterdam to Lake Garda", "9 of 9 gems", "1,240 km", the invite URL, escapes `<` in town names; 0 check-ins renders "0 of 9 gems".
- [ ] Commit `feat(community): a share card for every trip`.

### Task 9: Honest launch content
**Files:** Create `backend/src/community/launch.ts` (+ `GET /api/community/gems-of-the-week`), `backend/src/scripts/teamAccount.ts`; Modify `CommunityPage.tsx`, `service.ts` feed (author label). Test: `backend/src/community/launch.test.ts`, community page test.
**Interfaces — Produces:** `gemsOfTheWeek(db, now): PlaceGem[]` (8 library gems, rating ≥4.6, reviews ≥100, rotating by ISO week, spread over countries); team posts show the label "Routify team"; `teamAccount` creates user `team@routify.app` with `name: 'Routify team'` and `User.isTeam = true` (new field `isTeam Boolean @default(false)`, same migration as Task 4); the community page shows "Gems of the week" above the feed.
- [ ] Tests: same week → same 8 gems, next week → different; feed item of the team account carries `team: true`.
- [ ] Commit `feat(community): gems of the week and the Routify team account`.

### Task 10: Verify on the preview
- [ ] Build, sloplint 0 FAIL, all tests green, deploy, plan a 4-person trip with a date, check Booking/Vrbo/DiscoverCars links carry dates and group, check in via an emulated location at a gem, render the share card, invite flow with two accounts; screenshots 390 and 1280.
