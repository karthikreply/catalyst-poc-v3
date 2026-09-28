# Hackathon Close Implementation Plan

> **For agentic workers:** Execute task-by-task. Prefer inline execution in this session.

**Goal:** Reposition the demo so the only in-room ask is booking a three-day hackathon on a top-ranked prepared solution.

**Architecture:** Seeded shortlist + ranking + hackathon booking on new `/rank`; Artifact becomes leave-behind; telemetry/funding outcomes rename to hackathon proposed/booked; Plan gains Google-facilitated; home narrates three entry doors.

**Tech Stack:** Next.js App Router static export, React 19, TypeScript, Vitest, localStorage session graph.

## Global Constraints

- No live solution generation; prepared Heartland shortlist only.
- No CRM write-back; Push to CRM stays unavailable.
- No real embeds into propensity / incentive / trial tools.
- Push only to `v2` remote when user asks; do not touch `origin`.
- Keep board-slide as optional evidence; do not replace hackathon ask.
- Value math stays attached to the winning solution.

## File map

| File | Responsibility |
|---|---|
| `lib/seed.ts` | Types + seed solutions/ranking/hackathon + Delivery + nextStep |
| `lib/session.ts` | Rank/book/hydrate helpers + artifactActions + limits copy |
| `lib/telemetry.ts` | Outcome rename + delivery google-facilitated |
| `components/session-provider.tsx` | Actions for rank/book; bump storage key if needed |
| `components/brand-flow-frame.tsx` | Insert Rank step; facilitation labels |
| `lib/vendor-shell.ts` | Breadcrumb / brand-flow path for `/rank` |
| `app/rank/page.tsx` (+ test) | Rank UI + book form |
| `app/run/page.tsx` | CTA → `/rank` |
| `app/plan/page.tsx` | Google-facilitated + uncommon self-service label |
| `app/page.tsx` | Three entry cards |
| `app/artifact/page.tsx` | Winner + hackathon leave-behind |
| `app/telemetry/page.tsx`, `app/funding/page.tsx` | Copy / outcomes |
| Tests touching Delivery / Pilot proposed / nextStep | Update |

---

### Task 1: Domain model + session helpers

**Files:** `lib/seed.ts`, `lib/session.ts`, `lib/session.test.ts`, `components/session-provider.tsx`

- [ ] Add `SolutionCandidate`, `RankingState`, `HackathonBooking` types; extend `SessionGraph` and `Delivery`.
- [ ] Seed 7 Heartland solutions with outcome + valueAnchor; `ranking.order` = ids; `hackathon: null`; nextStep hackathon copy.
- [ ] Helpers: `reorderSolutions`, `lockRanking`, `unlockRanking`, `bookHackathon`, `rankedSolutions`, `winningSolution`, `defaultHackathonDraft`, update `hydrateSessionGraph`, `applyDeliveryMode` for google-facilitated, `artifactActions`, `artifactLimitsCopy`.
- [ ] Provider actions + bump graph key to `v4`.
- [ ] Tests for reorder/lock/book/actions copy.

### Task 2: Shell + `/rank` page

**Files:** `lib/vendor-shell.ts`, `components/brand-flow-frame.tsx`, `app/rank/page.tsx`, `app/rank/page.test.tsx`, `app/run/page.tsx`

- [ ] Nav/breadcrumb include Rank between Run and Artifact.
- [ ] Rank page: list, move up/down, lock, book form, gate Artifact CTA on `booked`.
- [ ] Run CTA → `/rank`.

### Task 3: Plan facilitation + home entry cards

**Files:** `app/plan/page.tsx`, `app/page.tsx`, related tests

- [ ] Three delivery options with labels per CPO.
- [ ] Home: three entry cards → setActor + `/scope`.

### Task 4: Artifact, funding, telemetry renames

**Files:** `app/artifact/page.tsx`, `app/funding/page.tsx`, `app/telemetry/page.tsx`, `lib/telemetry.ts`, tests

- [ ] Show winner + booked hackathon; unproven pointed at date.
- [ ] Replace Pilot proposed/funded with Hackathon proposed/booked everywhere.
- [ ] Funding copy substantiates hackathon.

### Task 5: Verify

- [ ] `npm test`, `npx tsc --noEmit`, `npx eslint .`, `npm run build`.
