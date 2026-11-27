# RoamGem in six languages

Status: approved by Jarne (27 Nov 2026). Approach A.

## Why

Many European road trippers do not read English well. RoamGem should speak their language, so that the app feels made for them and they trust it with their trip.

## Goals

- Six languages: English, Nederlands, Français, Deutsch, Español, Italiano.
- **A language button at the top** of every page, beside the menu (for example "EN ▾", a list with each language in its own name).
  - On the first visit the site picks the phone's language (if it is one of the six, else English).
  - It remembers the choice: in the browser, and on the account when signed in.
- **All interface text is translated**: header, footer, landing, planner, trip page, pricing, community, login and signup, feedback, legal pages.
- **The trip itself is written in the chosen language.** The AI writes the days, tips and gem descriptions in that language; place names stay as they are.
- Numbers, dates and money follow the language (for example "€ 9,00" and "27 nov." in Dutch).

## Non-goals

- Translating what people type themselves (community captions, feedback).
- Separate web addresses per language (/nl/, /fr/). This is for later, with SEO; this design makes it a small step.
- More languages now. Czech or others can be added later as one extra file each.

## Anti-goals

- Wooden machine-translated sentences, or the brand name, amounts or place names translated.
- A text that silently shows in English because a translation is missing.

## Approaches

- **A. Real translations in the app (chosen).** i18next with one file per language. Claude writes the translations and checks them for natural tone, consistent terms and the informal "you" form per language.
- B. A Google Translate button. Fast, but wooden, cheap-looking, and every page passes through Google.
- C. As A, plus a web address per language. Better for search, about 1.5× the work: later.

## The design

**Frontend**
- `react-i18next` with one JSON file per language: `en, nl, fr, de, es, it`.
- English is the source; every key must exist in all six files, which a test checks.
- Plurals and numbers go through i18next/Intl.
- The informal form is used everywhere: je/jij, du, tu, tú, tu.

**Language button**
- In the header (on desktop and in the phone menu), showing the current language.
- Changing the language switches instantly, without a reload, and sets `<html lang>`.

**Trips**
- The planner sends the chosen language with each trip.
- The AI prompts (skeleton, days, experiences) say "write in {language}; keep place names as they are".
- A trip keeps the language it was written in. Changing the site language later does not rewrite an existing trip.

**Server messages people see** (refusals such as "Tag a gem within 5 km", limits, payment errors)
- The server uses the language from the request: the app sends it with every call.
- These messages use a small dictionary per language; anything not in it falls back to English.

**Legal pages**
- Translated, with one line: "If the translations differ, the English version applies."

**Stripe checkout and Google Maps** follow the language too: Stripe `locale` and the Maps `language` parameter.

## Constraints

- RoamGem tokens and sloplint 0 FAIL; a language name is never written in uppercase tracked letters.
- Existing tests keep passing. Tests look for English text, so they run with English set.
- Long German and French words must fit: buttons and tabs wrap or shrink instead of overflowing at 390 px.

## Left to the builder

- Key naming, and how the files are split (per page or one file per language).
- Which server messages go into the dictionary (all that a user can see).
- The exact place of the button on desktop.
