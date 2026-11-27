# RoamGem community: feed, moments near gems, explorers

Status: approved by Jarne (27 Nov 2026): mockup, points and monthly prize. Mockup approved: `docs/mockups/roamgem-community.html` (https://claude.ai/artifact/YByzyU8FUoCT4Uogt7p3Q4).

## Why

Jarne finds the community part unclear and "half AI-made": forms, two systems side by side, no reason to post. He wants a community that looks inviting and works like this:
- a feed to scroll through: what people posted today or this week, the most liked on top;
- a leaderboard of the best travellers, the ones who post the most and the best.

Marketing will show the community in the videos once it is good (series "community" in the Brain).

## Goals

- One clear community: **feed**, **post a moment**, **explorers** (leaderboard), looking like the mockup.
- A post is a photo **tagged to a gem nearby**. The photo may be the gem itself, the group at the gem, or the camper at a camping near it.
- Anyone scrolling can put the tagged **gem** (not the poster's camping) in their trip with one tap.
- Posting pays off: "your gem is in 37 trips", points, a monthly prize.
- Never empty: at the soft launch the feed is filled with gems RoamGem checked itself, labelled "RoamGem team".

## Non-goals

- Comments, follows, direct messages, stories.
- Video posts.
- Gems invented by AI or posts by fake users. Team posts are labelled as the team; likes are only real.

## Anti-goals (a failure even if it works)

- It still looks like forms, or like a generic AI template.
- Someone's exact location or home can be read from a post.
- An empty feed at launch.

## Approaches (Jarne picked A)

- **A. Build on the existing photo game** (`backend/src/community/*`, `routes/play.ts`: posts, likes, feed, board, moderation, AI photo check). Add what is missing, retire the older gem-suggestion system. Chosen: reuses most, removes the double systems.
- B. Rebuild the community from scratch. About twice the work for the same result.
- C. Restyle only. Leaves the confusion.

## The design

**Feed** (`/community`)
- Tabs: Today, This week, Along my route (posts whose gem lies near one of the viewer's own trips; signed-in only).
- Today and This week sort by likes, then newest. Endless scroll.
- A card: poster (name, "#3 this week" badge for the top 10), big square photo, pin "near [gem] · 1.8 km" (rounded to 0.1 km, never the exact spot), caption, heart with count, "In N trips", button "+ Add to my trip".
- Team posts show "RoamGem team" and "Checked gem · rated 4.7 on Google", with the photo credit.

**Post a moment** (`/community/post`)
- Pick a photo, write a sentence, choose the gem nearby. RoamGem lists checked gems within **5 km** of the phone's location at posting time, nearest first. Last option: "A new place, not on RoamGem yet" (the existing suggest flow; it becomes a gem after the usual checks).
- Replaces the 300 m "on the spot" rule for normal posts. The challenge (photo at the gem itself) keeps the 300 m rule.
- The existing AI photo check stays: unsafe photos are rejected; photos with people wait for a moderator (Jarne) before they are public. Other photos go public after the AI check.
- Free members: 1 post a day (as now); Plus: unlimited.

**Add to my trip**
- Signed in with trips: choose the trip and the day; the gem is added to that day (existing trip edit).
- No trip yet: the gem goes on a "Saved gems" list and is offered when the next trip is planned along it.
- Each add is stored once per viewer and gem; that count is "In N trips".

**Explorers** (`/community/explorers`)
- Tabs: This week, This month, All time; filter by country.
- My own card on top: rank, points, points to the top 10, moments, likes, trips that use my gems.
- Points: **10 per public moment, 1 per like received, 25 each time someone adds my gem to a trip**. Existing points stay: challenge photo 50, a found gem that becomes official 200, check-ins as now.
- **Monthly prize: the best explorer of the month gets a year of Plus.** On the 1st the Brain sends Jarne the winner on Telegram; he taps Approve and the year of Plus is granted. Nothing is granted without that tap.

**Filling the feed before launch**
- A one-off job posts 40–60 moments as the RoamGem team: checked gems along popular European routes, with a Wikimedia Commons or Wikipedia photo and its credit.
- No likes, no fake names.

**Clean-up**
- The old suggestion system (`routes/community.ts` `/gems`, `/my-gems`, `/leaderboard`, `SuggestGemPage`, model `CommunityGem`) is no longer used in the app. Its table stays in the database.

## Constraints

- RoamGem design tokens (`frontend/src/styles/tokens.css`) and fonts; sloplint 0 FAIL.
- English in the app.
- TDD; the existing community tests keep passing.
- No exact location shown anywhere.

## Left to the builder

- Data model for adds (one row per user and gem) and saved gems.
- How "Along my route" finds posts near a trip (route polyline plus distance).
- Pagination size, image sizes, the empty state of each tab.
