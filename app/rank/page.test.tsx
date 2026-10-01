import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { brands } from "@/lib/brands";
import { initialSessionGraph } from "@/lib/seed";
import {
  applyColdScope,
  applyMechanic,
  bookHackathon,
  bookedSolutionPains,
  coldScopeDefaults,
  rankedSolutions,
  toggleSelected,
} from "@/lib/session";

const useSessionMock = vi.fn();

vi.mock("@/components/session-provider", () => ({
  useSession: () => useSessionMock(),
}));

import RankPage from "./page";

function selectThree(graph = initialSessionGraph) {
  const ids = rankedSolutions(graph).map((solution) => solution.id).slice(0, 3);
  return ids.reduce((current, id) => toggleSelected(current, id), graph);
}

describe("Rank page", () => {
  beforeEach(() => {
    useSessionMock.mockReturnValue({
      graph: initialSessionGraph,
      viewer: { actor: "partner", name: "Ravi Menon", org: "CDW" },
      canEditSession: true,
      moveSolution: vi.fn(),
      toggleSelected: vi.fn(),
      castVote: vi.fn(),
      lockRanking: vi.fn(),
      unlockRanking: vi.fn(),
      bookHackathon: vi.fn(),
    });
  });

  it("shows the seeded shortlist with a selection count", () => {
    const markup = renderToStaticMarkup(<RankPage />);
    expect(markup).toContain("Rank solutions");
    expect(markup).toContain("0 of 3 selected");
    expect(markup).toContain("AI-assisted claims intake extraction");
    expect(markup).toContain("Document AI");
    expect(markup).toContain("Booking the hackathon is the next action.");
    expect(markup).not.toContain("Book the three-day hackathon");
    expect(markup).not.toContain("Only rank 1 proceeds");
  });

  it("shows the booking form with three titles when three are selected", () => {
    const selected = selectThree();
    useSessionMock.mockReturnValue({
      graph: selected,
      viewer: { actor: "partner", name: "Ravi Menon", org: "CDW" },
      canEditSession: true,
      moveSolution: vi.fn(),
      toggleSelected: vi.fn(),
      castVote: vi.fn(),
      lockRanking: vi.fn(),
      unlockRanking: vi.fn(),
      bookHackathon: vi.fn(),
    });

    const markup = renderToStaticMarkup(<RankPage />);
    expect(markup).toContain("3 of 3 selected");
    expect(markup).toContain("Book the hackathon");
    expect(markup).toContain('href="/artifact"');
    expect(markup).not.toContain("Hackathon date");
    expect(markup).toContain("Lock ranking");
  });

  it("opens the business case once the hackathon is booked with three titles", () => {
    const booked = bookHackathon(selectThree(), {
      date: "2026-10-14",
      googleFacilitator: "Priya Raghavan",
      partnerSpecialist: "Ravi Menon",
      customerOwner: "Dana Reyes",
      question: "Can we prove extraction on Heartland forms?",
    });
    useSessionMock.mockReturnValue({
      graph: booked,
      brand: brands.cdw,
      viewer: { actor: "partner", name: "Ravi Menon", org: "CDW" },
      canEditSession: true,
      moveSolution: vi.fn(),
      toggleSelected: vi.fn(),
      castVote: vi.fn(),
      lockRanking: vi.fn(),
      unlockRanking: vi.fn(),
      bookHackathon: vi.fn(),
    });

    const markup = renderToStaticMarkup(<RankPage />);
    expect(markup).toContain("Booked · 2026-10-14");
    expect(markup).toContain("Open business case");
    expect(markup).toContain('href="/artifact"');
    expect(markup).not.toContain("Hackathon date");
    expect(markup).not.toContain("Google stack for these three days");
    for (const id of booked.hackathon!.solutionIds) {
      const title = initialSessionGraph.solutions.find((s) => s.id === id)?.title;
      expect(markup).toContain(title!);
    }
  });

  it("shows the three-days section with pain lines and a pilot pick once booked", () => {
    const booked = bookHackathon(selectThree(), {
      date: "2026-10-14",
      googleFacilitator: "Priya Raghavan",
      partnerSpecialist: "Ravi Menon",
      customerOwner: "Dana Reyes",
      question: "Can we prove extraction on Heartland forms?",
    });
    const session = {
      graph: booked,
      brand: brands.cdw,
      canEditSession: true,
      moveSolution: vi.fn(),
      toggleSelected: vi.fn(),
      castVote: vi.fn(),
      lockRanking: vi.fn(),
      unlockRanking: vi.fn(),
      bookHackathon: vi.fn(),
      setPilotPick: vi.fn(),
    };

    useSessionMock.mockReturnValue({ ...session, viewer: { actor: "partner", name: "Ravi Menon", org: "CDW" } });
    const partnerMarkup = renderToStaticMarkup(<RankPage />);
    expect(partnerMarkup).toContain("What the three days produce");
    expect(partnerMarkup).toContain("This demo shows the scope, not the build.");
    expect(partnerMarkup).toContain("Which one becomes the pilot?");
    expect(partnerMarkup).toContain("2026-10-16 · 14:00");
    for (const row of bookedSolutionPains(booked)) {
      expect(partnerMarkup).toContain(row.pain.replaceAll("'", "&#x27;"));
    }
    expect(partnerMarkup).toContain("as the pilot");

    useSessionMock.mockReturnValue({ ...session, viewer: { actor: "pdm", name: "Priya Raghavan", org: "Google" } });
    const pdmMarkup = renderToStaticMarkup(<RankPage />);
    expect(pdmMarkup).toContain("What the three days produce");
    expect(pdmMarkup).not.toContain("as the pilot");

    useSessionMock.mockReturnValue({ ...session, viewer: { actor: "partner", name: "Ravi Menon", org: "CDW" }, graph: selectThree() });
    expect(renderToStaticMarkup(<RankPage />)).not.toContain("What the three days produce");
  });

  it("shows the cold sample title and amber line without the company on cards", () => {
    const cold = applyColdScope(initialSessionGraph, { name: "Reply", industry: "Insurance", sizeBand: "Enterprise" }, coldScopeDefaults.attendees);
    useSessionMock.mockReturnValue({
      graph: cold,
      viewer: { actor: "cpm", name: "Customer", org: "Reply" },
      canEditSession: true,
      moveSolution: vi.fn(),
      toggleSelected: vi.fn(),
      castVote: vi.fn(),
      lockRanking: vi.fn(),
      unlockRanking: vi.fn(),
      bookHackathon: vi.fn(),
    });

    const markup = renderToStaticMarkup(<RankPage />);
    expect(markup).toContain("Sample shortlist, not this account");
    expect(markup).toContain("Sample figures from the Heartland case, not from Reply.");
    expect(markup).toContain("Votes are visible. The three you select are what get booked.");
    const cardChunk = markup.slice(markup.indexOf("<ol"), markup.indexOf("</ol>"));
    expect(cardChunk).not.toContain("Reply");
  });

  it("keeps book disabled copy when mechanic switch clears selection", () => {
    const selected = selectThree();
    const ledger = applyMechanic(selected, "ghost-ledger");
    useSessionMock.mockReturnValue({
      graph: ledger,
      viewer: { actor: "partner", name: "Ravi Menon", org: "CDW" },
      canEditSession: true,
      moveSolution: vi.fn(),
      toggleSelected: vi.fn(),
      castVote: vi.fn(),
      lockRanking: vi.fn(),
      unlockRanking: vi.fn(),
      bookHackathon: vi.fn(),
    });

    const markup = renderToStaticMarkup(<RankPage />);
    expect(markup).toContain("0 of 3 selected");
    expect(markup).toContain("Booking the hackathon is the next action.");
    expect(markup).not.toContain("Book the three-day hackathon");
    expect(rankedSolutions(ledger)).toHaveLength(3);
  });

  it("shows the customer strip with the latest capture and the top 3 in rank order", () => {
    const selected = selectThree();
    useSessionMock.mockReturnValue({
      graph: selected,
      viewer: { actor: "cpm", name: "Marcus Hale", org: "Heartland" },
      canEditSession: true,
      moveSolution: vi.fn(),
      toggleSelected: vi.fn(),
      castVote: vi.fn(),
      lockRanking: vi.fn(),
      unlockRanking: vi.fn(),
      bookHackathon: vi.fn(),
    });

    const markup = renderToStaticMarkup(<RankPage />);
    expect(markup).toContain("Your top 3 · 3/3");
    const strip = markup.slice(markup.indexOf("Your top 3"), markup.indexOf('<ol class="mt-5'));
    const titles = rankedSolutions(selected).slice(0, 3).map((solution) => solution.title);
    const positions = titles.map((title) => strip.indexOf(title));
    expect(positions.every((position) => position >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
    const latest = [...selected.captures].sort((a, b) => b.capturedAt.localeCompare(a.capturedAt))[0];
    if (latest) expect(markup).toContain(latest.text);
  });

  it("shows 0/3 for a customer before any selection and no strip for the partner", () => {
    useSessionMock.mockReturnValue({
      graph: initialSessionGraph,
      viewer: { actor: "cpm", name: "Marcus Hale", org: "Heartland" },
      canEditSession: true,
      moveSolution: vi.fn(),
      toggleSelected: vi.fn(),
      castVote: vi.fn(),
      lockRanking: vi.fn(),
      unlockRanking: vi.fn(),
      bookHackathon: vi.fn(),
    });
    expect(renderToStaticMarkup(<RankPage />)).toContain("Your top 3 · 0/3");

    useSessionMock.mockReturnValue({
      graph: initialSessionGraph,
      viewer: { actor: "partner", name: "Ravi Menon", org: "CDW" },
      canEditSession: true,
      moveSolution: vi.fn(),
      toggleSelected: vi.fn(),
      castVote: vi.fn(),
      lockRanking: vi.fn(),
      unlockRanking: vi.fn(),
      bookHackathon: vi.fn(),
    });
    expect(renderToStaticMarkup(<RankPage />)).not.toContain("Your top 3");
  });

  it("shows the PDM reaction line", () => {
    useSessionMock.mockReturnValue({
      graph: initialSessionGraph,
      viewer: { actor: "pdm", name: "Priya Raghavan", org: "Google" },
      canEditSession: true,
      moveSolution: vi.fn(),
      toggleSelected: vi.fn(),
      castVote: vi.fn(),
      lockRanking: vi.fn(),
      unlockRanking: vi.fn(),
      bookHackathon: vi.fn(),
    });
    const markup = renderToStaticMarkup(<RankPage />);
    expect(markup).toContain("Here is what the session produced. What would you like to do with it?");
    expect(markup).toContain("The partner books the hackathon.");
    expect(markup).not.toContain("Book hackathon");
  });

  it("keeps the booking form off the PDM page after three are selected", () => {
    useSessionMock.mockReturnValue({
      graph: selectThree(),
      viewer: { actor: "pdm", name: "Priya Raghavan", org: "Google" },
      canEditSession: true,
      moveSolution: vi.fn(),
      toggleSelected: vi.fn(),
      castVote: vi.fn(),
      lockRanking: vi.fn(),
      unlockRanking: vi.fn(),
      bookHackathon: vi.fn(),
    });
    const markup = renderToStaticMarkup(<RankPage />);
    expect(markup).not.toContain('href="/artifact"');
    expect(markup).not.toContain("Hackathon date");
    expect(markup).not.toContain("A PDM does not book it.");
  });
});
