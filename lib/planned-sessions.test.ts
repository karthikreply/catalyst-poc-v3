import { describe, expect, it } from "vitest";

import { initialSessionGraph } from "./seed";
import { sessionsForProfile } from "./planned-sessions";

function withSession(patch: Partial<typeof initialSessionGraph.session>, extra: Partial<typeof initialSessionGraph> = {}) {
  return {
    ...initialSessionGraph,
    ...extra,
    session: { ...initialSessionGraph.session, ...patch },
  };
}

describe("sessionsForProfile", () => {
  it("lists the live session and the other accounts this partner runs", () => {
    const sessions = sessionsForProfile("partner", initialSessionGraph);

    expect(sessions.map((session) => session.account)).toEqual([
      "Heartland Mutual Insurance",
      "Northwind Benefits",
      "Lakeshore Health",
    ]);
    expect(sessions[0]).toMatchObject({
      partner: "CDW",
      stage: "in session",
      date: "2026-09-21",
      illustrative: false,
      href: "/run",
    });
    expect(sessions[1]).toMatchObject({
      partner: "CDW",
      stage: "scoped",
      date: null,
      illustrative: true,
      href: null,
    });
    expect(sessions[2]).toMatchObject({
      partner: "CDW",
      stage: "planned",
      date: "2026-10-06",
      illustrative: true,
      href: null,
    });
  });

  it("lists the PDM's partners separately from the partner's own accounts", () => {
    const partnerAccounts = sessionsForProfile("partner", initialSessionGraph).map((session) => session.account);
    const sessions = sessionsForProfile("pdm", initialSessionGraph);

    expect(sessions[0]).toMatchObject({
      account: "Heartland Mutual Insurance",
      partner: "CDW",
      stage: "in session",
      illustrative: false,
      href: "/run",
    });
    expect(sessions.map((session) => session.account)).not.toEqual(partnerAccounts);
    expect(sessions.map((session) => [session.account, session.partner, session.stage])).toEqual([
      ["Heartland Mutual Insurance", "CDW", "in session"],
      ["Contoso Manufacturing", "Insight", "planned"],
      ["Fabrikam Retail", "SoftwareOne", "scoped"],
      ["Alpine Credit Union", "SHI", "hackathon booked"],
    ]);
    expect(sessions.filter((session) => session.illustrative).every((session) => session.href === null)).toBe(true);
  });

  it("keeps the live session after the hackathon is booked and opens the artifact", () => {
    const booked = {
      ...initialSessionGraph,
      session: { ...initialSessionGraph.session, status: "complete" as const },
      hackathon: {
        date: "2026-10-06",
        googleFacilitator: "Priya Raghavan",
        partnerSpecialist: "Ravi Menon",
        customerOwner: "Dana Reyes",
        question: "Can we prove the shortlist on Heartland's own forms?",
        booked: true,
        solutionIds: [],
      },
    };

    expect(sessionsForProfile("partner", booked)[0]).toMatchObject({
      account: "Heartland Mutual Insurance",
      stage: "hackathon booked",
      date: "2026-10-06",
      href: "/artifact",
      illustrative: false,
    });
    expect(sessionsForProfile("pdm", booked)[0].stage).toBe("hackathon booked");
  });

  it("derives scoped, planned, and ranked from the graph", () => {
    const quietAgenda = initialSessionGraph.agenda.map((step) => ({ ...step, state: "upcoming" as const }));
    const scoped = withSession(
      { status: "scoped", scheduledFor: "" },
      { agenda: quietAgenda, ranking: { ...initialSessionGraph.ranking, selected: [], locked: false }, hackathon: null },
    );
    const planned = withSession(
      { status: "planned", scheduledFor: "2026-11-03T09:00:00-05:00" },
      { agenda: quietAgenda, ranking: { ...initialSessionGraph.ranking, selected: [], locked: false }, hackathon: null },
    );
    const ranked = withSession(
      {},
      { ranking: { ...initialSessionGraph.ranking, selected: ["a", "b", "c"], locked: true }, hackathon: null },
    );

    expect(sessionsForProfile("partner", scoped)[0]).toMatchObject({ stage: "scoped", href: "/scope", date: null });
    expect(sessionsForProfile("partner", planned)[0]).toMatchObject({ stage: "planned", href: "/plan", date: "2026-11-03" });
    expect(sessionsForProfile("partner", ranked)[0]).toMatchObject({ stage: "ranked", href: "/rank" });
  });

  it("names the live partner from the graph", () => {
    const graph = withSession({ partnerId: "softwareone" });
    const sessions = sessionsForProfile("partner", graph);

    expect(sessions.every((session) => session.partner === "SoftwareOne")).toBe(true);
    expect(sessionsForProfile("pdm", graph)[0].partner).toBe("SoftwareOne");
    expect(sessionsForProfile("pdm", graph)[1].partner).toBe("Insight");
  });

  it("omits a blank live account and returns nothing for the customer", () => {
    const blank = withSession({ customerName: "  " });
    expect(sessionsForProfile("partner", blank).map((session) => session.account)).toEqual([
      "Northwind Benefits",
      "Lakeshore Health",
    ]);
    expect(sessionsForProfile("customer", initialSessionGraph)).toEqual([]);
  });
});
