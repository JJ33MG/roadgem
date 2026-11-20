# Routify community game — Implementation Plan

**Goal:** Photo posts at gems, new-gem suggestions that turn official, photo challenges checked on the spot, a feed with likes, an explorers board, and moderation before anything is public.

**Spec:** docs/superpowers/specs/2026-11-19-routify-redesign-design.md (goal 6, phase 3, "Left to the builder").

## Global constraints (from the spec)
- Points: photo at a gem 10, completed challenge 50, suggested gem that turns official 200 (to its finder).
- Official threshold: 10 distinct visitors with a location-checked public photo and at least 20 likes.
- Location check: the traveller is within 300 m of the gem when the photo is sent (live browser location).
- Nothing public without moderation: an AI check first (rejects unsafe photos at once), then admin approval.
- No points from home: a post more than 300 m away is refused, not stored.
- Hallmark floor: tokens only, no emoji, no eyebrows, focus-visible, big targets.

## Ruling
- Photos stored in Postgres (`Post.photo` bytes, re-encoded as JPEG in the browser, max 1600 px, EXIF and GPS stripped) instead of a Railway bucket: creating a bucket was refused by the session's safety check. Cost if wrong: database grows (~250 KB per photo); move to object storage later.
- Admins are the accounts whose email is in `ADMIN_EMAILS` (Railway variable set by Jarne).

## Tasks
1. **Data + rules** — Prisma models `Gem`, `Post`, `Like` (+ migration). Pure rules in `backend/src/community/rules.ts`: `metresBetween`, `onTheSpot`, `pointsFor`, `readyToBeOfficial`, `decodePhoto`, `isAdmin`. Tests: `rules.test.ts`.
2. **Service** — `backend/src/community/service.ts` (db injected): `createPost`, `suggestGem`, `review`, `toggleLike`, `feed`, `board`, `checkOfficial`. Tests against Postgres when `TEST_DATABASE_URL` is set.
3. **API** — `backend/src/routes/play.ts` at `/api/community`: posts, suggest, feed, like, photo, board, moderation, review, challenge, me. AI check (Claude vision) after a post is stored. Stats endpoint counts posts.
4. **Frontend** — `CommunityPage` (feed + explorers board), `PostPhotoPage`, `SuggestGemPage`, `ModeratePage`; "Post a photo here" on every gem card; photo resize + location helpers.
5. **Verify** — build, lint, live check on the preview.
