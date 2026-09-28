import type { Actor, CloseStyle } from "./seed";

export type TelemetryOutcome = "Scoped" | "Run" | "Hackathon proposed" | "Hackathon booked";
export type TelemetryPartner = "CDW" | "SoftwareOne" | "Insight" | "SHI";
export type TelemetryDelivery = "facilitated" | "google-facilitated" | "self-service";
export type TelemetryMechanic = "value-sprint" | "ghost-ledger";

export type TelemetrySession = {
  id: string;
  quarter: string;
  partner: TelemetryPartner;
  industry: string;
  pattern: string;
  outcome: TelemetryOutcome;
  fundedValue: number;
  opportunityValue?: number;
  customer?: string;
  delivery: TelemetryDelivery;
  mechanic: TelemetryMechanic;
  closeStyle: CloseStyle;
  qualified: boolean;
  converted: boolean;
  fundingClaimSubmitted: boolean;
  daysToFunded: number | null;
};

export function canViewOpportunityDetail(actor: Actor, detail: boolean) {
  return actor === "partner" && detail;
}

export function mechanicConversion(rows: TelemetrySession[], mechanic: TelemetryMechanic) {
  const visible = rows.filter((row) => row.mechanic === mechanic);
  const funded = visible.filter((row) => row.converted).length;
  return {
    funded,
    total: visible.length,
    rate: visible.length ? Math.round((funded / visible.length) * 100) : 0,
  };
}

export const telemetryBenchmarks = {
  facilitatedSessions: 150,
  selfServiceSessions: 100,
  facilitatedConverted: 90,
  selfServiceConverted: 22,
  selfServiceQualified: 45,
  facilitatedConversionRate: 60,
  selfServiceConversionRate: 22,
  selfServiceQualificationRate: 45,
  valueSprintSessions: 205,
  valueSprintConverted: 82,
  ghostLedgerSessions: 45,
  ghostLedgerConverted: 30,
  valueSprintConversionRate: 58,
  ghostLedgerConversionRate: 67,
} as const;

const partners: TelemetryPartner[] = ["CDW", "SoftwareOne", "Insight", "SHI"];
const industries = ["Insurance", "Banking", "Healthcare", "Manufacturing", "Retail", "Public sector"];
const patterns = ["Document-heavy intake", "Contact-centre summarisation", "Knowledge retrieval", "Fraud triage"];
const quarters = ["Q4 2024", "Q1 2025", "Q2 2025", "Q3 2025", "Q4 2025", "Q1 2026", "Q2 2026", "Q3 2026"];

function row(
  index: number,
  delivery: TelemetryDelivery,
  converted: boolean,
  qualified: boolean,
  mechanic: TelemetryMechanic,
): TelemetrySession {
  const outcome: TelemetryOutcome = converted ? "Hackathon booked" : qualified ? "Hackathon proposed" : "Run";
  const partnerIndex = index % partners.length;
  const partnerSequence = Math.floor(index / partners.length);
  return {
    id: `session-${String(index + 1).padStart(3, "0")}`,
    quarter: quarters[partnerSequence % quarters.length],
    partner: partners[partnerIndex],
    industry: industries[(partnerSequence + partnerIndex) % industries.length],
    pattern: patterns[(partnerSequence + partnerIndex) % patterns.length],
    outcome,
    fundedValue: converted ? 180_000 + (index % 9) * 55_000 : 0,
    delivery,
    mechanic,
    closeStyle: index % 31 === 0 ? "board-slide" : "owner-and-ask",
    qualified,
    converted,
    fundingClaimSubmitted: converted,
    daysToFunded: converted ? 21 + (index % 40) : null,
  };
}

function evenlySpacedIndexes(indexes: number[], count: number) {
  return Array.from({ length: count }, (_, position) => indexes[Math.floor((position * indexes.length) / count)]);
}

export function buildTelemetrySessions(): TelemetrySession[] {
  const rows: TelemetrySession[] = [];
  for (let index = 0; index < 150; index += 1) {
    rows.push(row(index, "facilitated", index < 90, false, "value-sprint"));
  }
  for (let index = 0; index < 100; index += 1) {
    rows.push(row(150 + index, "self-service", index < 22, index < 45, "value-sprint"));
  }
  const convertedIndexes = rows.flatMap((item, index) => (item.converted ? [index] : []));
  const unconvertedIndexes = rows.flatMap((item, index) => (!item.converted ? [index] : []));
  const ghostIndexes = [
    ...evenlySpacedIndexes(convertedIndexes, 30),
    ...evenlySpacedIndexes(unconvertedIndexes, 15),
  ];
  for (const index of ghostIndexes) {
    rows[index] = { ...rows[index], mechanic: "ghost-ledger" };
  }

  const cdwScoped = rows
    .flatMap((item, index) => (item.partner === "CDW" && !item.converted && !item.qualified ? [index] : []))
    .slice(0, 12);
  for (const index of cdwScoped) {
    rows[index] = { ...rows[index], outcome: "Scoped" };
  }

  const cdwSubmitted = rows
    .flatMap((item, index) => (
      item.partner === "CDW" &&
      item.outcome === "Hackathon proposed" &&
      !item.converted
        ? [index]
        : []
    ))
    .slice(0, 6);
  for (const index of cdwSubmitted) {
    rows[index] = { ...rows[index], fundingClaimSubmitted: true };
  }
  return rows;
}

export function summarizeTelemetry(rows: TelemetrySession[]) {
  return {
    sessionsScoped: rows.length,
    sessionsRun: rows.filter((item) => item.outcome !== "Scoped").length,
    hackathonsProposed: rows.filter((item) => item.outcome === "Hackathon proposed" || item.outcome === "Hackathon booked").length,
    fundingClaimsSubmitted: rows.filter((item) => item.fundingClaimSubmitted).length,
    hackathonsBooked: rows.filter((item) => item.outcome === "Hackathon booked").length,
    fundedPipelineValue: rows.reduce((sum, item) => sum + item.fundedValue, 0),
  };
}

export function recentTelemetryRows(rows: TelemetrySession[], limit = 8) {
  const candidates = [...rows].reverse();
  const selected: TelemetrySession[] = [];
  const addFirst = (predicate: (row: TelemetrySession) => boolean) => {
    const match = candidates.find((row) => predicate(row) && !selected.some((item) => item.id === row.id));
    if (match) selected.push(match);
  };
  const facilitatedTarget = Math.floor(limit / 2);
  const selfServiceTarget = limit - facilitatedTarget;

  addFirst((row) => row.delivery === "facilitated" && row.closeStyle === "board-slide");
  addFirst((row) => row.delivery === "facilitated" && row.mechanic === "ghost-ledger");
  for (const pattern of patterns) {
    if (selected.filter((row) => row.delivery === "facilitated").length >= facilitatedTarget) break;
    addFirst((row) => row.delivery === "facilitated" && row.pattern === pattern);
  }
  while (selected.filter((row) => row.delivery === "facilitated").length < facilitatedTarget) {
    const before = selected.length;
    addFirst((row) => row.delivery === "facilitated");
    if (selected.length === before) break;
  }

  addFirst((row) => row.delivery === "self-service" && row.qualified && row.mechanic === "ghost-ledger");
  for (const pattern of patterns) {
    if (selected.filter((row) => row.delivery === "self-service" && row.qualified).length >= Math.min(3, selfServiceTarget)) break;
    addFirst((row) => row.delivery === "self-service" && row.qualified && row.pattern === pattern);
  }
  while (selected.filter((row) => row.delivery === "self-service" && row.qualified).length < Math.min(3, selfServiceTarget)) {
    const before = selected.length;
    addFirst((row) => row.delivery === "self-service" && row.qualified);
    if (selected.length === before) break;
  }
  addFirst((row) => row.delivery === "self-service" && !row.qualified);
  while (selected.filter((row) => row.delivery === "self-service").length < selfServiceTarget) {
    const before = selected.length;
    addFirst((row) => row.delivery === "self-service");
    if (selected.length === before) break;
  }
  return selected.slice(0, limit);
}

export function scopeTelemetry(
  rows: TelemetrySession[],
  opts: { actor: Actor; partnerName: string },
) {
  if (opts.actor === "partner") return rows.filter((item) => item.partner === opts.partnerName);
  return rows;
}

export const telemetrySeed = Object.freeze(buildTelemetrySessions());
