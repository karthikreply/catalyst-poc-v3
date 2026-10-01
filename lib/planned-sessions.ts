import { brands } from "./brands";
import type { Actor, SessionGraph } from "./seed";

export type ProfileSessionStage = "scoped" | "planned" | "in session" | "ranked" | "hackathon booked";

export type ProfileSessionHref = "/scope" | "/plan" | "/run" | "/rank" | "/artifact";

export type ProfileSession = {
  account: string;
  partner: string;
  stage: ProfileSessionStage;
  /** YYYY-MM-DD when a date is known. */
  date: string | null;
  illustrative: boolean;
  href: ProfileSessionHref | null;
};

const stageHref: Record<ProfileSessionStage, ProfileSessionHref> = {
  scoped: "/scope",
  planned: "/plan",
  "in session": "/run",
  ranked: "/rank",
  "hackathon booked": "/artifact",
};

type IllustrativeSession = {
  account: string;
  partner?: string;
  stage: ProfileSessionStage;
  date: string | null;
};

/** Other accounts this partner runs. The live graph holds a single session. */
const partnerIllustrativeSessions: IllustrativeSession[] = [
  { account: "Northwind Benefits", stage: "scoped", date: null },
  { account: "Lakeshore Health", stage: "planned", date: "2026-10-06" },
];

/** Accounts across the other partners a PDM covers. Distinct from the partner's own list. */
const pdmIllustrativeSessions: IllustrativeSession[] = [
  { account: "Contoso Manufacturing", partner: "Insight", stage: "planned", date: "2026-10-02" },
  { account: "Fabrikam Retail", partner: "SoftwareOne", stage: "scoped", date: null },
  { account: "Alpine Credit Union", partner: "SHI", stage: "hackathon booked", date: "2026-10-14" },
];

function partnerNameFor(graph: SessionGraph) {
  const id = graph.session.partnerId;
  if (id === "cdw" || id === "softwareone" || id === "softchoice") return brands[id].partnerName;
  return "CDW";
}

function isoDate(value: string | null | undefined) {
  const match = value?.trim().match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}

function liveStage(graph: SessionGraph): ProfileSessionStage {
  if (graph.hackathon?.booked) return "hackathon booked";
  if (graph.ranking.locked || graph.ranking.selected.length > 0) return "ranked";
  const inSession = graph.session.status === "running" || graph.agenda.some((step) => step.state === "active");
  if (inSession) return "in session";
  if (graph.session.status === "planned" || graph.session.scheduledFor.trim().length > 0) return "planned";
  return "scoped";
}

function liveDate(graph: SessionGraph) {
  if (graph.hackathon?.booked) return isoDate(graph.hackathon.date) ?? isoDate(graph.session.scheduledFor);
  return isoDate(graph.session.scheduledFor);
}

function liveSession(graph: SessionGraph): ProfileSession | null {
  const account = graph.session.customerName.trim();
  if (!account) return null;
  const stage = liveStage(graph);
  return {
    account,
    partner: partnerNameFor(graph),
    stage,
    date: liveDate(graph),
    illustrative: false,
    href: stageHref[stage],
  };
}

function illustrativeRows(rows: IllustrativeSession[], partner: string, liveAccount: string): ProfileSession[] {
  return rows
    .filter((row) => row.account.toLowerCase() !== liveAccount.toLowerCase())
    .map((row) => ({
      account: row.account,
      partner: row.partner ?? partner,
      stage: row.stage,
      date: row.date,
      illustrative: true,
      href: null,
    }));
}

/** Sessions for the signed-in profile. The customer has no program list. */
export function sessionsForProfile(actor: Actor, graph: SessionGraph): ProfileSession[] {
  if (actor === "cpm") return [];
  const live = liveSession(graph);
  const partner = partnerNameFor(graph);
  const illustrative = actor === "partner"
    ? illustrativeRows(partnerIllustrativeSessions, partner, live?.account ?? "")
    : illustrativeRows(pdmIllustrativeSessions, partner, live?.account ?? "");
  return live ? [live, ...illustrative] : illustrative;
}
