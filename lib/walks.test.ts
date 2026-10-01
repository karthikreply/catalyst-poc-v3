import { describe, expect, it } from "vitest";

import { initialSessionGraph } from "@/lib/seed";
import {
  applyColdScope,
  applyMechanic,
  bookHackathon,
  bookedSolutionTitles,
  castVote,
  enrichAttendeeName,
  fundingAskCopy,
  lockRanking,
  lookupAccount,
  rankedSolutions,
  toggleSelected,
  unlockRanking,
  voteTallies,
} from "@/lib/session";

function selectIds(graph: typeof initialSessionGraph, ids: string[]) {
  return ids.reduce((current, id) => toggleSelected(current, id), graph);
}

describe("walk A/B/C", () => {
  it("Walk A — customer door Reply miss → sample rank → book three", () => {
    expect(lookupAccount("Reply", "customer")).toMatchObject({
      hit: false,
      query: "Reply",
      customerDoor: true,
    });
    expect(enrichAttendeeName("Dana Reyes", false).prompt).toContain(
      "Couldn't find information on Dana Reyes",
    );
    expect(enrichAttendeeName("Pat Unknown", false).prompt).toContain(
      "Couldn't find information on Pat Unknown",
    );

    let graph = applyColdScope(
      initialSessionGraph,
      { name: "Reply", industry: "Insurance", sizeBand: "Enterprise" },
      [
        { id: "c1", name: "Dana Reyes", role: "Ops" },
        { id: "c2", name: "Pat Unknown", role: "Dev" },
        { id: "c3", name: "Sam Buyer", role: "Buyer" },
      ],
    );
    expect(graph.session.customerName).toBe("Reply");
    const ids = rankedSolutions(graph).map((solution) => solution.id);
    graph = selectIds(graph, ids.slice(0, 3));
    expect(toggleSelected(graph, ids[3]).ranking.selected).toEqual(graph.ranking.selected);

    graph = bookHackathon(graph, {
      date: "2026-10-14",
      googleFacilitator: "Priya Raghavan",
      partnerSpecialist: "Ravi Menon",
      customerOwner: "Dana Reyes",
      question: "Can we prove the three?",
    });
    expect(graph.hackathon?.solutionIds).toHaveLength(3);
    expect(unlockRanking(graph)).toBe(graph);
    expect(bookedSolutionTitles(graph)).toHaveLength(3);
  });

  it("Walk B — partner Heartland hit → mechanic switch → book persists across switch", () => {
    expect(lookupAccount("heartland ", "partner").hit).toBe(true);
    const known = enrichAttendeeName("Dana Reyes", true);
    expect(known.kind).toBe("known");
    if (known.kind === "known") {
      expect(known.role).toBe("VP Claims Operations");
      expect(known.prompt).toBe("Is that the role in this session?");
    }

    const ids = rankedSolutions(initialSessionGraph).map((solution) => solution.id);
    let graph = selectIds(initialSessionGraph, ids.slice(0, 3));
    graph = applyMechanic(graph, "ghost-ledger");
    expect(graph.ranking.order).toEqual(initialSessionGraph.ranking.order);
    expect(graph.ranking.selected).toEqual([]);
    expect(rankedSolutions(graph)).toHaveLength(3);

    const ledgerIds = rankedSolutions(graph).map((solution) => solution.id);
    graph = selectIds(graph, ledgerIds.slice(0, 3));
    graph = lockRanking(graph);
    expect(graph.ranking.locked).toBe(true);
    graph = unlockRanking(graph);
    expect(graph.ranking.locked).toBe(false);

    graph = bookHackathon(graph, {
      date: "2026-11-01",
      googleFacilitator: "Priya Raghavan",
      partnerSpecialist: "Ravi Menon",
      customerOwner: "Dana Reyes",
      question: "Ledger path?",
    });
    const titles = bookedSolutionTitles(graph);
    expect(titles).toHaveLength(3);
    const switched = applyMechanic(graph, "value-sprint");
    expect(switched.hackathon?.solutionIds).toEqual(graph.hackathon?.solutionIds);
    expect(bookedSolutionTitles(switched)).toEqual(titles);
    for (const title of titles) {
      expect(fundingAskCopy(graph)).toContain(title);
    }
  });

  it("Walk C — cold CPM votes move tally without reordering, then book", () => {
    let graph = applyColdScope(
      initialSessionGraph,
      { name: "Reply", industry: "Insurance", sizeBand: "Enterprise" },
      [
        { id: "dana-cold", name: "Dana", role: "Ops" },
        { id: "c2", name: "Pat", role: "Dev" },
        { id: "c3", name: "Sam", role: "Buyer" },
      ],
    );
    const ids = rankedSolutions(graph).map((solution) => solution.id);
    const order = [...graph.ranking.order];
    graph = castVote(graph, "dana-cold", ids[0]);
    graph = castVote(graph, "dana-cold", ids[1]);
    expect(graph.votes["dana-cold"]).toBe(ids[1]);
    expect(voteTallies(graph)[ids[0]] ?? 0).toBe(0);
    expect(voteTallies(graph)[ids[1]]).toBe(1);
    expect(graph.ranking.order).toEqual(order);

    graph = selectIds(graph, ids.slice(0, 3));
    graph = bookHackathon(graph, {
      date: "2026-12-01",
      googleFacilitator: "Priya Raghavan",
      partnerSpecialist: "Ravi Menon",
      customerOwner: "Dana",
      question: "Cold path?",
    });
    expect(graph.hackathon?.booked).toBe(true);
    expect(graph.hackathon?.solutionIds).toHaveLength(3);
  });
});
