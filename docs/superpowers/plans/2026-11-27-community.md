# RoamGem Community Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the community into one clear, inviting place: a feed of moments near gems, posting a moment, "Add to my trip", and an explorers leaderboard with a monthly prize.

**Architecture:**
- Build on the existing photo game (`backend/src/community/*`, `backend/src/routes/play.ts`) and replace the frontend pages with the mockup design.
- New backend pieces live in focused files under `backend/src/community/`.
- The monthly prize is driven by the Brain (ai-workflow): it asks RoamGem for the winner and grants Plus only after Jarne's Telegram approval.

**Tech Stack:** Express + Prisma (Postgres), vitest; React + Vite + vitest/testing-library; Brain: Node/TS ESM, vitest.

**Spec:** `docs/superpowers/specs/2026-11-27-community-design.md`, with one change from Jarne (27 Nov): **no manual photo review**. The AI check decides: unsafe → rejected, everything else → public.

## Global Constraints

- English in the app. The design follows the approved mockup `docs/mockups/roamgem-community.html`.
- Use only the RoamGem tokens in `frontend/src/styles/tokens.css`; `node .claude/skills/hallmark/scripts/sloplint.mjs frontend/src` must report 0 FAIL. No uppercase tracked labels.
- Points: 10 per public moment (existing `POINTS.photo`, doubled for Plus as now), 1 per like received, 25 per add of my post's gem to someone's trip; challenge 50, found gem 200 and check-ins unchanged.
- Distances: a normal moment may tag a gem within **5000 m**; a challenge keeps **300 m**. Distances are shown rounded to 0.1 km; exact positions are never returned.
- Free members: 1 post a day; Plus: unlimited (unchanged).
- Team posts say "RoamGem team" and carry a photo credit; no fake users, no fake likes.
- Monthly prize: a year of Plus, granted only after Jarne taps Approve in Telegram.
- Checks:
  - backend: `npx tsc --noEmit -p tsconfig.json && npx vitest run`
  - frontend: `npx tsc --noEmit && npx vitest run` and sloplint
  - Brain: `npm run typecheck && TEST_DATABASE_URL=postgresql://postgres@localhost:5433/brain npm test`

## Review Focus

1. The AI check is down (no key, API error): posts must not stay hidden forever, and must not go public unchecked. Task 1 adds a sweep that re-checks pending posts.
2. A viewer with no trips taps "Add to my trip": the gem goes to Saved gems, no error (Task 3).
3. "Along my route" for a signed-out viewer, or one whose trips have no route: an empty list with a message, not a 500 (Task 2).
4. Liking or adding the same gem twice must not count points twice (Task 3: one add per viewer and gem).
5. The seed runs on every restart: it must not create duplicate team posts (Task 5: idempotent per gem).

---

### Task 1: Automatic photo decisions (no manual review)

**Files:**
- Modify: `backend/src/community/aiCheck.ts` (prompt and verdict)
- Create: `backend/src/community/autoReview.ts`, `backend/src/community/autoReview.test.ts`
- Modify: `backend/src/routes/play.ts` (replace `aiFirstLook`), `backend/src/server.ts` (start the sweep)

**Interfaces:**
- Produces: `decide(v: Verdict | null, challenge: boolean): Decision | 'retry'`; `autoReview(db, postId, check = checkPhoto): Promise<'approve'|'approve_photo'|'reject'|'retry'>`; `startReviewSweep(db): NodeJS.Timeout`.
- `Verdict` gains `failed: boolean`: true when there was no key, an API error or an unreadable answer.

- [ ] **Step 1: Write the failing tests** in `autoReview.test.ts`:
  - `decide({reject:true,…}, false) === 'reject'`
  - `decide({reject:false,challengeMet:true}, true) === 'approve'`
  - `decide({reject:false,challengeMet:false}, true) === 'approve_photo'`
  - `decide({reject:false}, false) === 'approve'`
  - `decide({failed:true}, false) === 'retry'`
  - `decide(null, false) === 'retry'`
  - In `aiCheck.test.ts`: `parseVerdict('nonsense').failed === true`.
- [ ] **Step 2: Run** `npx vitest run src/community/autoReview.test.ts src/community/aiCheck.test.ts`. Expected: FAIL (module missing / `failed` undefined).
- [ ] **Step 3: Implement.**
  - `checkPhoto` returns `failed: true` (and `reject:false`) without a key, on an error, or when the answer is unreadable.
  - Prompt wording: the photo may show the place itself or people, a camper or a camping *near* it. `safe:false` only for nudity, violence, hate, documents, number plates in close-up, or spam (screenshots, ads, text-only images).
  - `autoReview` loads the post, calls the check, and on a decision calls the existing `review(db, id, decision, note)`. On `'retry'` it leaves the post pending.
  - `startReviewSweep`: every 10 min, auto-review up to 20 pending posts older than 2 min. If a post is still pending after 24 h, call `alertError('community.aicheck', …)` from `utils/brain` once.
  - In `play.ts`, posts and suggestions call `void autoReview(prisma, post.id)`.
- [ ] **Step 4: Run** the tests again plus `npx vitest run src/community`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(community): AI decides on photos, sweep retries failed checks`.

### Task 2: Feed by period, likes first, and along my route

**Files:**
- Modify: `backend/src/community/service.ts` (`feed`), `backend/src/community/rules.ts`
- Modify: `backend/prisma/schema.prisma` (Post: `credit String @default("")`)
- Create: migration `backend/prisma/migrations/20261127200000_community_feed/` (Post.credit, plus the GemAdd/SavedGem tables of Task 3 in the same migration)
- Modify: `backend/src/routes/play.ts` (`GET /feed`), test `backend/src/community/service.test.ts`

**Interfaces:**
- Produces: `NEAR_GEM_METRES = 5000`; `periodStart(period: 'today'|'week'|'month', now: Date): Date` (today = now − 24 h, week = now − 7 d, month = now − 30 d).
- `feed(db, viewerId, { period: 'today'|'week'|'route', page = 0, take = 20, routeLines?: LatLng[][] })`. It returns items with:
  - the existing fields
  - `distanceKm: number` (from `distanceM`, 1 decimal)
  - `inTrips: number`
  - `rank: number | null` (the poster's weekly rank when ≤ 10)
  - `credit: string`
  - `rating: number | null` (PlaceGem rating via `gem.placeId`, team posts only)
- `GET /api/community/feed?period=today|week|route&page=N`. For `route`, the route takes the viewer's 5 newest trips' `planner.route` and decodes them with `decodePolyline`. Signed out → `401 {error:'Sign in to see posts along your route.'}`. No routes → `[]`.

- [ ] **Step 1: Failing tests** (service.test.ts, with the existing db helper):
  - "week" lists a 3-day-old post and leaves out a 9-day-old post.
  - In the same period, a post with 5 likes comes before a newer post with 1 like.
  - "route" returns only posts whose gem lies within 20 km of the line.
  - `distanceKm` of `distanceM: 1849` is `1.8`.
  - `periodStart('today', now)` is now − 24 h.
- [ ] **Step 2: Run** `npx vitest run src/community/service.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.** Sorting: likes descending, then `createdAt` descending (load the period's public posts with `_count.likes`, sort in memory, cap at 500, then page). Use `nearLine` from `utils/routeGems` (20 km) for the route.
- [ ] **Step 4: Run** the tests. Expected: PASS. Then run `npx prisma migrate dev --create-only` style SQL by hand and `npx prisma generate`.
- [ ] **Step 5: Commit** `feat(community): feed by period sorted by likes, along my route`.

### Task 3: Moments near a gem, Add to my trip, Saved gems

**Files:**
- Modify: `backend/prisma/schema.prisma`:
  - `GemAdd { id, userId, gemId, postId?, tripId?, createdAt; @@unique([userId, gemId]) }`
  - `SavedGem { userId, gemId, createdAt; @@id([userId, gemId]) }`
  - relations on User/Gem/Post
- Create: `backend/src/community/adds.ts`, `backend/src/community/adds.test.ts`, `backend/src/community/nearby.ts`, `backend/src/community/nearby.test.ts`
- Modify: `backend/src/community/service.ts` (`createPost` distance rule), `backend/src/routes/play.ts`, `backend/src/utils/gems.ts` (added gems always visible), `backend/src/routes/trips.ts` (saved gems on generate)

**Interfaces:**
- Consumes: `NEAR_GEM_METRES` (Task 2).
- Produces:
  - `nearbyGems(db, at: Point, limit = 8)` → `{ gemId?: string, placeId?: string, name, lat, lng, address, distanceKm }[]`. It reads official `Gem`s plus `PlaceGem` (rating ≥ 4.2, reviews ≥ 20) within 5 km, nearest first, deduplicated by placeId.
  - `addGemToTrip(db, { userId, gemId, postId?, tripId?, day?, key? })` → `{ added: 'trip' | 'saved', inTrips: number }`.
  - `GET /api/community/nearby?lat&lng` (auth).
  - `POST /api/community/gems/:gemId/add` with body `{ postId?, tripId?, day? }`.
  - `GET /api/community/my-trips` → `{ id, title, days }[]` (the viewer's 10 newest trips, for the picker).
- Behaviour:
  - `createPost` accepts any gem within 5000 m. It throws `'Tag a gem within 5 km of where you are.'` when the gem is further away. A challenge still requires 300 m.
  - Adding to a trip appends the gem to `trip.hiddenGems` as `{ placeId: gem.placeId ?? 'gem:'+id, name, lat, lng, day, photoUrl: '/api/community/posts/'+postId+'/photo', added: true, by }`. It refuses (409) while `planner.planning`, and only the owner or edit-key holder may add.
  - Without a `tripId`, the gem goes to SavedGem.
  - A second add by the same viewer for the same gem returns the current count and creates nothing.
  - `gemsFor` always keeps gems with `added: true` visible for free users.
  - On trip generation for a signed-in user, saved gems within 15 km of the route are appended to the day whose segment is nearest, with `added: true`. Each saved gem is then removed from SavedGem.

- [ ] **Step 1: Failing tests:**
  - `nearbyGems` returns a PlaceGem 1.2 km away before one 4.6 km away, and leaves out one 6 km away.
  - `createPost` at 4 km succeeds for a normal post and fails for a challenge.
  - `addGemToTrip` without `tripId` → `'saved'`. A second call creates no second GemAdd row (count stays 1).
  - Adding to another user's trip without a key → 403.
  - `gemsFor` with a free viewer keeps an `added` gem.
- [ ] **Step 2: Run** `npx vitest run src/community src/utils/gems.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** as above.
- [ ] **Step 4: Run** the tests plus the full backend suite. Expected: PASS.
- [ ] **Step 5: Commit** `feat(community): moments within 5 km, add gem to trip, saved gems`.

### Task 4: Explorers board with periods, country and my card

**Files:**
- Modify: `backend/src/community/service.ts` (`board`), `backend/src/routes/play.ts` (`GET /board`, `GET /me`)
- Test: `backend/src/community/service.test.ts`

**Interfaces:**
- `board(db, { period: 'week'|'month'|'all', country?: string, take = 20, now = new Date() })` → `{ rank, userId, name, team, points, moments, likes, inTrips }[]`.
- Points in the period:
  - the sum of `Post.points` of public posts created in the period
  - plus likes created in the period on the user's public posts
  - plus 25 × GemAdds created in the period with `postId` of the user's posts
  - plus 200 × found gems with `officialAt` in the period
  - plus check-in points (`CheckIn.createdAt` in the period)
- `country` filters posts, likes and adds by the last comma part of `gem.address` (case-insensitive) and drops check-ins.
- Team accounts are left out of the board.
- `GET /api/community/board?period&country`. `GET /api/community/me?period=week` adds `{ rank, points, toTop10, moments, likes, inTrips }`.

- [ ] **Step 1: Failing tests:**
  - A like from last week does not count for "week".
  - 1 moment (10) + 3 likes + 2 adds = 63 points.
  - `country: 'Croatia'` leaves out a post at an Austrian gem.
  - The team user is not on the board.
  - `toTop10` is the points gap to #10, or 0 when you are in the top 10.
- [ ] **Step 2: Run** `npx vitest run src/community/service.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the tests. Expected: PASS.
- [ ] **Step 5: Commit** `feat(community): explorers by week, month, all time and country`.

### Task 5: Fill the feed with team moments (idempotent)

**Files:**
- Create: `backend/src/community/seed.ts`, `backend/src/community/seed.test.ts`
- Modify: `backend/src/server.ts` (run once after start when `COMMUNITY_SEED=true`)

**Interfaces:**
- Consumes: `commonsPhotoNear` from `utils/commonsPhoto`.
- Produces: `seedTeamMoments(db, { fetchPhoto, target = 50 })` → `{ created: number }`.
- Picks PlaceGems with rating ≥ 4.5 and reviews ≥ 200, spread over countries (`pickOfTheWeek`-style round robin), and skips gems that already have a team post. It upserts the team user `team@roamgem.com` ("RoamGem team", `isTeam: true`, random password hash).
- Each post gets:
  - the downloaded photo bytes and caption = the gem's Google types turned into one plain sentence, e.g. "A viewpoint rated 4.7 by 1,240 travellers on Google."
  - `credit` = "Photo: <author>, Wikimedia Commons"
  - `distanceM: 0`, `status: 'public'`, `points: 0`
- It stops at `target` total team posts.

- [ ] **Step 1: Failing tests:**
  - With a fake `fetchPhoto`, it creates 3 posts for 3 gems.
  - A second run creates 0.
  - A gem whose `fetchPhoto` returns null is skipped.
  - All created posts have `credit` non-empty and the team user.
- [ ] **Step 2: Run** `npx vitest run src/community/seed.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.** Download the Commons image with axios (arraybuffer, ≤ 2 MB, jpeg/png/webp).
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `feat(community): seed team moments for launch`.

### Task 6: Monthly prize endpoints (RoamGem side)

**Files:**
- Create: `backend/src/community/prize.ts`, `backend/src/community/prize.test.ts`
- Modify: `backend/src/routes/play.ts`

**Interfaces:**
- `monthWinner(db, month: 'YYYY-MM')` → `{ userId, name, points } | null`. It uses `board` over that calendar month (UTC), skips team users, and needs ≥ 1 point.
- `grantYear(db, userId, month)`:
  - sets `subscriptionTier: 'premium'`
  - if the user already has a Stripe subscription, adds 365 to `plusBonusDays`
  - otherwise sets `subscriptionExpires` = max(now, current) + 365 days
  - stores `Setting`/marker so the same month cannot be granted twice
  - returns `{ granted: boolean }`
- `GET /api/community/prize?month=YYYY-MM` and `POST /api/community/prize/grant {userId, month}` both require header `x-stats-token === process.env.STATS_TOKEN` (the same check `routes/stats.ts` uses); otherwise 401.

- [ ] **Step 1: Failing tests:**
  - The winner of November is the user with the most points in November only.
  - Without the token → 401.
  - Granting twice for the same month → the second returns `{ granted: false }`.
  - A user with `stripeSubscriptionId` gets `plusBonusDays += 365`.
- [ ] **Step 2: Run** `npx vitest run src/community/prize.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.** For the double-grant guard, store the month on a new `PrizeGrant { month @id, userId, createdAt }` table (in the Task 2 migration file or its own migration).
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `feat(community): monthly prize winner and grant for the Brain`.

### Task 7: Frontend: feed, post a moment, explorers, add to trip

**Files:**
- Modify: `frontend/src/lib/community.ts` (new API calls and types for Tasks 2–4)
- Rewrite: `frontend/src/pages/community/CommunityPage.tsx` (feed), `frontend/src/pages/community/PostPhotoPage.tsx` (post a moment)
- Create:
  - `frontend/src/pages/community/ExplorersPage.tsx`
  - `frontend/src/components/community/MomentCard.tsx`
  - `frontend/src/components/community/AddToTrip.tsx`
- Modify: `frontend/src/App.tsx` (route `/community/explorers`; `/community/suggest` redirects to `/community/post`), `frontend/src/styles/index.css` (community classes)
- Test: `frontend/src/pages/community/community.test.tsx`

**Interfaces:**
- Consumes: `GET /community/feed?period&page`, `/nearby`, `/gems/:gemId/add`, `/my-trips`, `/board?period&country`, `/me?period`, `POST /posts`, `POST /suggest`.
- UI as in the mockup:
  - **Feed:** tabs Today / This week / Along my route. MomentCard shows avatar initial, name, "#N this week" badge, square photo with pin "near {gem} · {km} km", caption, ♥ count (toggle), "In N trips", button "+ Add to my trip". Team cards show "RoamGem team · Checked gem · rated {rating} on Google" and the credit under the photo.
  - **Post a moment:** photo picker, caption, nearby gem options with km, last option "A new place, not on RoamGem yet" (opens the suggest fields inline). Hint: "We use your location only to find gems nearby; it is never shown." Button "Post to the community". After posting: "Checking your photo… it appears in the feed in a minute."
  - **Explorers:** tabs This week / This month / All time, country select, my card (rank, points, "{n} points to #10", moments, likes, trips using your gems), rows 1–20 (top 3 in gold), the points rule line and the monthly prize line.
  - **AddToTrip:** a sheet. Signed out → login. Trips → choose trip and day. No trips → "Saved. We add it when you plan a trip that passes by."
- Remove the old ModeratePage link from the community page. Keep the route for admins.

- [ ] **Step 1: Failing tests** (testing-library, mocked `lib/community`):
  - The feed shows "This week" active by default and the card text "near Lago di Braies · 1.2 km".
  - Clicking ♥ calls `like` and updates the count.
  - "+ Add to my trip" with no trips shows the saved message.
  - The post page lists nearby gems with km and posts with the chosen `gemId`.
  - The explorers page shows "points to #10".
- [ ] **Step 2: Run** `npx vitest run src/pages/community`. Expected: FAIL.
- [ ] **Step 3: Implement** with tokens only.
- [ ] **Step 4: Run** the tests, `npx tsc --noEmit` and sloplint. Expected: PASS, 0 FAIL.
- [ ] **Step 5: Commit** `feat(community): new feed, post a moment and explorers pages`.

### Task 8: Brain: monthly prize with Telegram approval

**Files (ai-workflow):**
- Modify: `src/integrations/routify.ts` (`fetchPrize(month)`, `grantPrize(userId, month)` with the stats token)
- Modify: `src/agents/routify.ts` (job `community_prize`, 1st of the month 09:05)
- Modify: `src/scheduler.ts`
- Test: `test/routify-prize.test.ts`

**Interfaces:**
- Consumes: Task 6 endpoints.
- Job flow:
  - On the 1st, fetch the previous month's winner.
  - No winner → log and stop.
  - Otherwise `requestApproval` of kind `roamgem_prize` with the text "Explorer of {month}: {name} ({points} points). Give a year of RoamGem Plus?" and payload `{ userId, month }`.
  - `registerApprovalExecutor('roamgem_prize', …)` calls `grantPrize`.
  - Use `enqueueOnce` keyed by month so a re-run does not ask twice. Respect `DRY_RUN`.

- [ ] **Step 1: Failing tests:**
  - The job with a fake fetch creates one approval for "2026-11".
  - A second run creates none.
  - No winner → no approval.
  - The executor calls grant with the payload.
- [ ] **Step 2: Run** `npx vitest run test/routify-prize.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** typecheck and the full Brain suite. Expected: PASS.
- [ ] **Step 5: Commit** `feat(roamgem): monthly explorer prize via Telegram approval`.

### Task 9: Deploy to the preview and check it there

- [ ] Push the branch.
- [ ] On routify-preview, set `COMMUNITY_SEED=true` and wait for the deploy to succeed.
- [ ] With Playwright on the preview (mobile), check:
  - the feed shows team moments
  - posting a moment works with a test account, and the post turns public after the check
  - add to trip, and the explorers page
- [ ] Take a screenshot of each screen to send to Jarne.
- [ ] Update the Brain launch list item for the community (done) and the videos item (the community series can start).
