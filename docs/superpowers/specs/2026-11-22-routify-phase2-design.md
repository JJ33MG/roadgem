# Routify phase 2 — design (approved in conversation, 2026-11-21/22)

## Why
Routify must not read as "another trip planner". The promise: **Routify plans the drive, not just the destinations** —
how far you drive each day, where you stop, where you sleep tonight and what it costs. Planning must feel easy and smooth
on a phone; that matters more than any single feature.

## Target group
Campervan and caravan drivers first, electric cars right after (Jarne's choice), starting with the Netherlands and Belgium.
Ordinary cars keep working.

## Scope, in Jarne's order
1. **Smooth planner.** Vehicle first (car, electric car, campervan, caravan). Short form: from, to, days, vehicle; the rest
   (km a day, gems, where to sleep, filters) gets per-vehicle defaults under "Adjust". While the trip is made, a 3D globe
   turns to the route and draws it, with step texts. After: edit the plan without starting over — move a night to another
   stop, hide or restore a gem, add a rest day.
2. **Real costs per day.** Fuel or charging, tolls, vignettes, low-emission-zone warnings and the overnight stay, per day and
   for the whole trip, clearly labelled as an estimate. Amounts come from tables per country that we maintain (date shown).
3. **Checked gems.** Every gem shows its proof ("Real place · 4.7★ from 622 Google reviews"), later "checked by N
   travellers". Homepage and marketing: "AI invents places. Routify checks them."
4. **On the road** (plan B). Start trip: live position on the globe map, next stop, gems and campsites nearby, rest of the
   day, closer overnight options when late. Navigate: Google Maps with the day's leg and up to 9 stops, Waze with the next
   stop (Waze takes one destination), Apple Maps with the day's end. No own turn-by-turn. Traffic jams when a TomTom key
   exists. Campervan/caravan first, then EV range and charging stops.
5. Alongside (plan C): Dutch as second language; trip pass and yearly pass next to the monthly plan.

## Decisions (builder's calls, adjustable)
- Map engine: MapLibre GL (open source) with globe projection and OpenFreeMap tiles (free, no key). Replaces Leaflet.
- Countries crossed per day come from Google Directions' "Entering <country>" steps (no extra API).
- Fuel and charging prices, toll rates, vignette prices and overnight averages live in one table file with an
  "updated" date; costs are estimates and say so.
- Plan edits are kept with the trip; anonymous trips are edited with an edit key returned once at creation and kept in
  the browser; signed-in owners can always edit their trips.
- Default km a day: car 350, electric car 300, campervan 280, caravan 250. Campervan and caravan sleep at campsites by default.
