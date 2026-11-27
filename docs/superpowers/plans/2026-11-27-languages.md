# RoamGem in Six Languages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every page of RoamGem in English, Dutch, French, German, Spanish and Italian, chosen with a button at the top, and trips written by the AI in the chosen language.

**Architecture:**
- Frontend: `i18next` + `react-i18next`, one JSON file per language in `frontend/src/i18n/`, with English as the source.
- The app sends the language with every API call (`x-lang`). The backend uses it for the messages people see and for the AI prompts.
- A trip keeps the language it was written in (`planner.language`).

**Tech Stack:** React 18 + Vite + vitest/testing-library; Express + Prisma; i18next 23, react-i18next 14.

**Spec:** `docs/superpowers/specs/2026-11-27-languages-design.md`

## Global Constraints

- Languages and codes: `en` English, `nl` Nederlands, `fr` Français, `de` Deutsch, `es` Español, `it` Italiano. The list shows each language in its own name.
- Informal "you" everywhere: je/jij, du, tu, tú, tu. Never translate "RoamGem", "Plus", "Trip pass", place names or amounts.
- The first visit uses the phone's language when it is one of the six, else English. The choice is stored in `localStorage` key `roamgem_lang` and on the account (`User.language`).
- Every key exists and is non-empty in all six files; a test fails otherwise.
- Tests run in English (`src/test/setup.ts` inits i18n with `lng: 'en'`).
- Sloplint 0 FAIL; at 390 px no button or tab overflows in German or French.
- Legal pages get the line: "If the translations differ, the English version applies." (translated).
- Checks:
  - frontend: `npx tsc --noEmit && npx vitest run` and sloplint
  - backend: `npx tsc --noEmit -p tsconfig.json && TEST_DATABASE_URL=postgresql://postgres@localhost:5433/roadgem_test npx vitest run`

## Review Focus

1. A text added later without a translation: the completeness test fails (Task 1), and the UI falls back to English, never to the raw key.
2. A phone set to Czech or Polish: English, no error (Task 1).
3. Switching language on the trip page: the interface changes and the trip text stays in its own language (Tasks 1 and 5).
4. Long German and French labels at 390 px: header button, planner buttons and tabs wrap, no horizontal scroll (Task 6 screenshot check).
5. A server refusal with dynamic parts (numbers): shown in English rather than broken (Task 4).

---

### Task 1: i18n foundation and the language button

**Files:**
- Create:
  - `frontend/src/i18n/index.ts`
  - `frontend/src/i18n/en.json` (start with header, footer, language button keys)
  - `frontend/src/i18n/{nl,fr,de,es,it}.json`
  - `frontend/src/i18n/i18n.test.ts`
  - `frontend/src/components/nav/LanguageSwitcher.tsx` (+ test)
- Modify:
  - `frontend/src/main.tsx` (import `./i18n`)
  - `frontend/src/test/setup.ts`
  - `frontend/src/components/nav/Header.tsx`, `MobileMenu.tsx`
  - `frontend/src/lib/apiClient.ts` (header `x-lang`)
- Backend:
  - `User.language String @default("en")` + migration
  - `PATCH /api/auth/me/language { language }`
  - `GET /api/auth/me` returns `language`

**Interfaces:**
- Produces:
  - `LANGUAGES: { code: Lang; name: string }[]`, `type Lang = 'en'|'nl'|'fr'|'de'|'es'|'it'`
  - `pickLanguage(stored: string | null, browser: readonly string[]): Lang`
  - `setLanguage(lang: Lang): void`: changes i18n, stores it, sets `<html lang>`, and when signed in calls PATCH
  - the i18n instance default export

- [ ] **Step 1: Failing tests.**
  - `pickLanguage(null, ['nl-BE','en'])==='nl'`
  - `pickLanguage(null, ['cs-CZ'])==='en'`
  - `pickLanguage('de', ['nl'])==='de'`
  - `pickLanguage('xx', [])==='en'`
  - Completeness: every key of `en.json` exists and is non-empty in each other file, and no file has extra keys.
  - LanguageSwitcher: shows "EN", the list has "Nederlands" … "Italiano", and choosing "Deutsch" calls `setLanguage('de')`.
- [ ] **Step 2: Run.** `npx vitest run src/i18n src/components/nav`. Expected: FAIL.
- [ ] **Step 3: Implement.**
  - i18next with `fallbackLng: 'en'`, `returnNull: false`.
  - The button is a `<select>`-free disclosure button with a list of six options (keyboard and Escape).
  - On login, AuthContext applies `user.language` when there is no stored choice.
- [ ] **Step 4: Run** the tests plus the full frontend and backend suites. Expected: PASS.
- [ ] **Step 5: Commit** `feat(i18n): six languages foundation and language button`.

### Task 2: Move all interface text into en.json

**Files:** every non-test `.tsx` under `frontend/src` with visible text: pages, components, legal pages, and labels in `frontend/src/lib/*.ts` that reach the screen.

**Interfaces:**
- Keys are grouped by area: `nav.*, footer.*, landing.*, planner.*, trip.*, pricing.*, auth.*, community.*, legal.*, common.*, errors.*`.
- Use `useTranslation()`'s `t` in components. Plain modules use `i18n.t`.
- Plurals use i18next `_one/_other`; values use `{{x}}`.
- Money and dates go through `formatMoney(cents|eur, lang)` / `formatDate(iso, lang)` in `frontend/src/i18n/format.ts` (Intl with the current language).

- [ ] **Step 1: Failing test** `format.test.ts`:
  - `formatMoney(9, 'nl')` matches /€\s?9,00/
  - `formatMoney(9, 'en')` is '€9.00'
  - `formatDate('2026-11-27','nl')` contains 'nov'
- [ ] **Step 2: Run** `npx vitest run src/i18n`. Expected: FAIL.
- [ ] **Step 3: Implement** `format.ts`. Then move the text area by area: shell and landing → planner → trip page → pricing/auth/dashboard → community → legal. The existing English tests must keep passing after each area.
- [ ] **Step 4: Run** the full frontend suite, tsc and sloplint after each area. Expected: PASS. Then fill `nl/fr/de/es/it.json` with English placeholders so the completeness test passes until Task 3.
- [ ] **Step 5: Commit** per area: `feat(i18n): move <area> text to translations`.

### Task 3: Translations into Dutch, French, German, Spanish, Italian

**Files:** `frontend/src/i18n/{nl,fr,de,es,it}.json`

- [ ] **Step 1: Failing test** in `i18n.test.ts`: for each non-English file, fewer than 5% of its values may equal the English value. Allowlist: brand and product words such as "RoamGem", "Plus", "Trip pass", "Google Maps", "Waze", "OK", and keys ending in `.brand`.
- [ ] **Step 2: Run.** Expected: FAIL (placeholders are English).
- [ ] **Step 3: Write the translations.**
  - Natural, informal "you", the same word for the same thing throughout.
  - The legal pages translated, each with the "English version applies" line.
  - Keep `{{placeholders}}` and plural suffixes exactly.
- [ ] **Step 4: Run** the i18n tests plus a placeholder check (every `{{x}}` in English appears in each translation). Expected: PASS.
- [ ] **Step 5: Commit** `feat(i18n): Dutch, French, German, Spanish and Italian`.

### Task 4: Server speaks the language: messages, Stripe, place search

**Files:**
- Create: `backend/src/i18n/lang.ts`, `backend/src/i18n/messages.ts`, `backend/src/i18n/lang.test.ts`
- Modify: `backend/src/server.ts` (middleware), `backend/src/middleware/errors.ts`, `backend/src/routes/stripe.ts`, `backend/src/utils/billing.ts` (`checkoutParams` locale), `backend/src/utils/google.ts` (`autocompleteCities` languageCode)

**Interfaces:**
- Produces:
  - `langOf(header: unknown): Lang` (`x-lang`, else `en`)
  - `translateMessage(message: string, lang: Lang): string` (exact-match dictionary; unknown → as is)
  - Express middleware sets `req.lang` and wraps `res.json` so a body `{ error: string }` is translated
- Stripe `locale` = lang (all six are supported).
- City autocomplete `languageCode` = lang. Gem search stays `en`, because the gem library is shared.

- [ ] **Step 1: Failing tests:**
  - `langOf('nl')==='nl'`, `langOf('cs')==='en'`
  - `translateMessage('Tag a gem within 5 km of where you are.','de')` is the German text
  - an unknown message comes back unchanged
  - `checkoutParams(...{ lang: 'fr' })` has `locale: 'fr'`
- [ ] **Step 2: Run** `npx vitest run src/i18n src/utils/billing.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.** The dictionary covers every fixed user-facing message (`grep` for `error:` strings and `CommunityError` texts) in the five languages.
- [ ] **Step 4: Run** the full backend suite. Expected: PASS.
- [ ] **Step 5: Commit** `feat(i18n): server messages, Stripe and city search in the visitor's language`.

### Task 5: Trips written in the chosen language

**Files:**
- Modify:
  - `backend/src/utils/claude.ts` (skeleton, day, experiences, itinerary)
  - `backend/src/utils/dayByDay.ts` (`dayPrompt`)
  - `backend/src/utils/experiences.ts` (`experiencePrompt`)
  - `backend/src/routes/trips.ts` (store `planner.language = req.lang`; `fillDays` and `addExperiences` read it)
  - the AI challenge writer `community/aiCheck.ts writeChallenge` (language of the gem's first poster: English)
- Tests: `backend/src/utils/dayByDay.test.ts`, `experiences.test.ts`

**Interfaces:**
- `languageLine(lang: Lang): string`. For en it is `''`. For others, e.g. nl: "Write every text for the traveller in Dutch (informal: je/jij). Keep place names, addresses and brand names exactly as they are."
- Each prompt function takes an optional `lang` and appends `languageLine(lang)`.

- [ ] **Step 1: Failing tests:**
  - `dayPrompt({...,lang:'nl'})` contains 'in Dutch' and 'Keep place names'
  - `experiencePrompt('Prague','balanced','de')` contains 'in German'
  - `dayPrompt` without lang contains neither
- [ ] **Step 2: Run** `npx vitest run src/utils`. Expected: FAIL.
- [ ] **Step 3: Implement**, including the skeleton prompt. The JSON keys stay English; only the values are in the language.
- [ ] **Step 4: Run** the full backend suite. Expected: PASS.
- [ ] **Step 5: Commit** `feat(i18n): trips written in the traveller's language`.

### Task 6: Deploy to the preview and check it

- [ ] Push and wait until the preview runs the new commit.
- [ ] With Playwright (iPhone 14 Pro Max), take screenshots of the landing page, planner, a new trip, pricing and community, in Dutch and German. Check that nothing overflows (`document.documentElement.scrollWidth <= innerWidth`).
- [ ] Plan one trip in Dutch and confirm the day texts are Dutch.
- [ ] Send Jarne the link and screenshots. Tick the language item on the Brain launch list.
