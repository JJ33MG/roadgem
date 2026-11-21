# Routify phase 2A (smooth planner, costs, checked gems) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make planning smooth (vehicle first, globe while generating, editable plan), show real costs per day, and make "checked gems" visible.

**Architecture:** Frontend React/Vite (`frontend/`), backend Express/Prisma (`backend/`). Trip extras (overnights, route, legs, costs, edits) live in the existing `Trip.planner` JSON column; no migration. Cost logic is a pure backend module fed by road legs from Google Directions.

**Tech Stack:** React 18, Tailwind, maplibre-gl 5.x (globe), vitest; Express, Prisma, Google Directions.

**Spec:** `docs/superpowers/specs/2026-11-22-routify-phase2-design.md`

## Global Constraints
- Hallmark floor: tokens only, no emoji, no eyebrows, no dot-joined meta strings in UI copy, focus-visible, reduced motion respected (globe animation off under `prefers-reduced-motion`), 48px targets, body ≥18px.
- Vehicles: `car | ev | campervan | caravan`; default km a day 350 / 300 / 280 / 250; campervan and caravan default stays `['campsite']`.
- Costs are labelled "Estimate" and show the table's updated date.
- Never cache empty Google results (project rule).
- English UI copy (Dutch comes in plan C).

## Review Focus
1. A route through no table country (e.g. Norway): costs still show fuel and overnight, tolls 0, no crash.
2. Directions returns no "Entering" steps (single-country trip): the whole leg counts for the start country.
3. Edit with a wrong or missing edit key: 403, plan unchanged.
4. Moving a night to a stop that does not exist: 400, plan unchanged.
5. Globe on a phone without WebGL: the page still works with the day list (map area shows a plain fallback).

---

### Task 1: Vehicle first in the planner
**Files:** Modify `frontend/src/lib/tripPlan.ts`, `frontend/src/components/planner/PlannerPanel.tsx`, `backend/src/utils/tripRequest.ts`, `backend/src/routes/trips.ts`. Test: `frontend/src/components/planner/planner.test.tsx`, `backend/src/utils/tripRequest.test.ts`.
**Interfaces — Produces:** `type Vehicle = 'car'|'ev'|'campervan'|'caravan'`; `TripPlan.vehicle`; `VEHICLE_DEFAULTS: Record<Vehicle,{kmPerDay:number; stayTypes:StayType[]; label:string}>`; `withVehicle(plan, v): TripPlan`; request field `vehicle` parsed (default `car`) and stored in `planner.vehicle`.
- [ ] Test: choosing "Campervan" sets 280 km and only Campsites; the form shows From, To, Days and vehicle, with km/gems/stays/filters inside a closed "Adjust" disclosure; submit sends `vehicle: 'campervan'`. Backend: `parseGenerateBody({vehicle:'bus'})` → `car`; `vehicle:'ev'` kept.
- [ ] Run → FAIL. Implement. Run → PASS. Commit `feat(planner): vehicle first with per-vehicle defaults`.

### Task 2: Globe map
**Files:** Create `frontend/src/components/map/GlobeMap.tsx`, `frontend/src/lib/arc.ts`; Modify `TripResultsPage.tsx` (use GlobeMap instead of TripMapView); remove `TripMapView.tsx` and the `leaflet` dependency. Test: `frontend/src/lib/arc.test.ts`.
**Interfaces — Produces:** `<GlobeMap stops gems route? dayGems? focus?: 'world'|'route' className? />`; `greatCircle(a:[lng,lat], b:[lng,lat], n=64): [lng,lat][]`.
- [ ] Test `greatCircle`: first/last points equal inputs; 64 points; midpoint of Brussels→Prague within 1° of (9.4, 50.6).
- [ ] Implement with maplibre-gl 5 (`projection: {type:'globe'}`, style `https://tiles.openfreemap.org/styles/liberty`), road as line layer, stops/gems as circle layers with popups built from text nodes; `flyTo`/`fitBounds` to the route; WebGL missing → render a plain panel "Map not available on this device". Mock GlobeMap in page tests. Commit `feat(map): globe map with the road, nights and gems`.

### Task 3: The wait becomes a show
**Files:** Create `frontend/src/components/planner/PlanningProgress.tsx`; Modify `backend/src/routes/route.ts` (estimate returns `from`/`to` coordinates), `TripPlanner.tsx`. Test: `frontend/src/components/planner/progress.test.tsx`, `backend/src/routes/route.test.ts`.
**Interfaces — Produces:** `GET /api/route/estimate` → `{km, from?:{lat,lng}, to?:{lat,lng}}`; `<PlanningProgress from to />` cycling steps "Calculating the route", "Choosing where you sleep", "Checking the gems", "Adding up the costs" every 6 s (role=status), globe arc from→to.
- [ ] Tests: steps advance on fake timers; estimate response shape includes coordinates when geocoding works and `km:null` otherwise.
- [ ] Implement; TripPlanner shows PlanningProgress while busy. Commit `feat(planner): globe and steps while the trip is made`.

### Task 4: Road legs and countries
**Files:** Modify `backend/src/utils/routeGems.ts` (`routeLine` → also legs), `backend/src/routes/trips.ts`. Test: `backend/src/utils/routeGems.test.ts`.
**Interfaces — Produces:** `RoadLine.legs: {km:number; hours:number; countries:{code:string; km:number}[]}[]`; `countriesFromSteps(steps:{distanceKm:number; instruction:string}[], startCode:string)`; stored as `planner.legs`.
- [ ] Test `countriesFromSteps`: steps with "Entering France" / "Entering Spain" split km correctly; no Entering step → all km on start code; country names map to ISO codes (Belgium BE, Netherlands NL, Germany DE, France FR, Spain ES, Italy IT, Austria AT, Switzerland CH, Czechia CZ, Slovenia SI, Slovakia SK, Hungary HU, Poland PL, Portugal PT, Croatia HR, Luxembourg LU, Denmark DK).
- [ ] Implement (start code from the first leg's `start_address` country). Commit.

### Task 5: Cost tables and costs per day
**Files:** Create `backend/src/costs/tables.ts`, `backend/src/costs/costs.ts`; Modify `trips.ts` (store `planner.costs`, recompute on GET when legs exist). Test: `backend/src/costs/costs.test.ts`.
**Interfaces — Produces:** `costsForTrip({vehicle, legs, stayTypes, days}): {days: DayCost[]; total:number; updated:string}`; `DayCost = {day, fuel, tolls, vignettes:{country, label, price}[], overnight, total, warnings:string[]}`; vignette bought once per trip per country (first day it is entered).
- [ ] Tests: 300 km in FR by campervan (11 l/100, diesel FR) → fuel = 300×0.11×price; FR tolls per km applied; AT day adds 10-day vignette once; CH adds yearly vignette; DE day warns "Umweltplakette"; unknown country (NO) → fuel only, tolls 0; EV uses kWh price.
- [ ] Implement tables (updated `2026-11-22`; fuel/diesel/kWh per country, toll €/km FR ES IT PT HR PL GR, vignettes AT CH CZ SK SI HU, overnight campsite 35 hotel 110 holiday_home 95). Commit.

### Task 6: Costs on the trip page
**Files:** Create `frontend/src/components/trip/DayCosts.tsx`; Modify `TripResultsPage.tsx`, `types/index.ts`. Test: `frontend/src/pages/TripResultsPage.test.tsx`.
- [ ] Test: day panel shows "Fuel", "Tolls", "Vignettes" lines with € amounts and "Estimate, prices of 22 Nov 2026"; trip header shows total; warnings listed.
- [ ] Implement; commit `feat(trip): costs per day and for the trip`.

### Task 7: Edit the plan
**Files:** Create `backend/src/routes/tripEdits.ts`, `backend/src/utils/edits.ts`; Modify `trips.ts` (editKey on create: random 24 bytes hex, stored as sha256 in planner, returned once), `TripResultsPage.tsx`, `frontend/src/lib/tripEdits.ts`. Test: `backend/src/utils/edits.test.ts`, page test.
**Interfaces — Produces:** `applyEdit(planner, edit)` with edits `{type:'night', day, stopIndex}` | `{type:'hideGem', placeId}` | `{type:'showGem', placeId}` | `{type:'restDay', afterDay}`; `PATCH /api/trips/:id/plan` (owner auth or `x-edit-key`) → updated trip.
- [ ] Tests: night to a missing stop → error; hide/show gem toggles `hiddenGems`; rest day increases days and adds a stay-day at that night's town; wrong key → 403 (route test with injected db).
- [ ] Implement; page shows "Move tonight's stop", gem "Hide", "Add a rest day" when editable. Commit.

### Task 8: Checked gems
**Files:** Create `frontend/src/components/trip/GemProof.tsx`; Modify `TripResultsPage.tsx`, `LandingPage.tsx`. Test: page tests.
- [ ] Test: a gem with rating 4.7 and 622 reviews shows "Real place, rated 4.7 by 622 Google reviewers"; homepage has the section heading "AI invents places. Routify checks them."
- [ ] Implement; commit.

### Task 9: Verify on the preview
- [ ] Build, sloplint 0 FAIL, all tests green, deploy, plan Amsterdam → Lake Garda by campervan on the preview, screenshots 390 and 1280, check costs and edits live. Commit any fixes.
