# Hackathon close — design

**Status:** Approved for build (CPO answers + Approach 1 + `/rank`)  
**Date:** 2026-09-28

## Decision

The demo’s only in-room ask is **book a three-day hackathon** on the top-ranked prepared solution. The six-week pilot remains in the story as what the hackathon scopes; it leaves the close, artifact actions, seed next step, and telemetry win.

## Architecture

Flow: **Scope → Plan → Run → Rank → Artifact → Funding / Pilot spec.**

- **`/rank`** ranks a seeded shortlist, locks rank 1, then captures date + three capacity slots + the question to answer (`booked: true`).
- **Artifact** is the leave-behind (winner, value, booked hackathon, funding that substantiates the booking).
- No live solution generation. No CRM write-back. No real embeds into propensity / incentive / trial tools.

## Data model

On `SessionGraph`:

| Field | Shape |
|---|---|
| `solutions` | `SolutionCandidate[]` — id, title, outcome (one line), valueAnchor (string from captured pain/cost) |
| `ranking` | `{ order: string[]; locked: boolean }` |
| `hackathon` | `{ date; googleFacilitator; partnerSpecialist; customerOwner; question; booked } \| null` |

`Delivery` becomes `"facilitated" | "google-facilitated" | "self-service"`. Default `facilitated`.

`outcome.nextStep` seed: `"3-day hackathon to scope a six-week pilot"`.

Cold sessions: same Heartland shortlist, labeled illustrative.

Board-slide close style stays optional evidence; does not replace the hackathon ask.

Once `hackathon.booked`, re-ranking requires clearing the booking (unlock clears `booked` / resets hackathon to draft).

## Pages

1. **Home** — three entry cards (PDM / partner / customer) with one-line tool stand-ins; customer notes uncommon; all open same session.
2. **Plan** — Partner-facilitated (default), Google-facilitated, Customer-run (uncommon). Push to CRM stays unavailable.
3. **Run** — CTA → `/rank`.
4. **`/rank`** — shortlist, reorder, lock rank 1, book hackathon, then → Artifact.
5. **Artifact** — winner + booked hackathon; unproven copy pointed at date; actions substantiate hackathon.
6. **Telemetry** — outcomes `Hackathon proposed` / `Hackathon booked` (replace Pilot proposed / funded).

## Out of scope

Live generation, CRM write-back, real external-tool embeds, rate cards / cost splits, dual in-room ask (pilot + hackathon).

## Reverse conditions (client)

- Economic buyer must skip hackathon and fund pilot in-meeting → restore pilot ask.
- List must appear from conversation → different product (generation).
- Single-party-funded room → one commitment slot.
- Real open inside propensity/incentive/trial → different scope.
