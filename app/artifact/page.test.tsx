import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { brands } from "@/lib/brands";
import { initialSessionGraph } from "@/lib/seed";
import {
  applyClaimsVolumeChoice,
  applyCloseStyle,
  applyExactClaimsVolume,
  bookHackathon,
  rankedSolutions,
  toggleSelected,
} from "@/lib/session";

function selectThree(graph = initialSessionGraph) {
  const ids = rankedSolutions(graph).map((solution) => solution.id).slice(0, 3);
  return ids.reduce((current, id) => toggleSelected(current, id), graph);
}

const { useSessionMock, useRouterMock } = vi.hoisted(() => ({
  useSessionMock: vi.fn(),
  useRouterMock: vi.fn(() => ({ push: vi.fn() })),
}));

vi.mock("@/components/session-provider", () => ({
  useSession: useSessionMock,
}));

vi.mock("next/navigation", () => ({
  useRouter: useRouterMock,
}));

vi.mock("html2canvas-pro", () => ({ default: vi.fn() }));
vi.mock("jspdf", () => ({ default: vi.fn() }));

import ArtifactPage from "./page";

describe("exact claims provenance", () => {
  it("renders partner-entered, non-respondent-confirmed provenance", () => {
    const graph = applyExactClaimsVolume(
      applyClaimsVolumeChoice(initialSessionGraph, "exact"),
      275,
    );
    useSessionMock.mockReturnValue({
      graph,
      brand: brands.cdw,
      viewer: { actor: "partner", name: "Ravi Menon", org: "CDW" },
      markHackathonCalendarAdded: vi.fn(),
    });

    const markup = renderToStaticMarkup(<ArtifactPage />);

    expect(markup).toContain(
      "Volume entered by partner in Scope · not respondent-confirmed",
    );
    expect(markup).not.toContain("Volume is an unconfirmed estimate from scope.");
  });
});

describe("board-slide close", () => {
  const boardCapture = {
    id: "cap-board-dana",
    sessionId: initialSessionGraph.session.id,
    stepId: "owner-and-ask",
    attributedTo: "Dana Reyes",
    text: "We cut intake from six days to two.",
    capturedAt: "2026-09-21T12:15:00-05:00",
  };

  function renderArtifact(graph: typeof initialSessionGraph) {
    useSessionMock.mockReturnValue({
      graph,
      brand: brands.cdw,
      viewer: { actor: "partner", name: "Ravi Menon", org: "CDW" },
      markHackathonCalendarAdded: vi.fn(),
    });
    return renderToStaticMarkup(<ArtifactPage />);
  }

  it("renders verbatim board-slide captures after the hackathon scope section", () => {
    const graph = applyCloseStyle({
      ...initialSessionGraph,
      captures: [
        ...initialSessionGraph.captures,
        boardCapture,
        {
          ...boardCapture,
          id: "cap-board-michelle",
          attributedTo: "Michelle Dorsey",
          text: "My team stopped working weekends.",
        },
      ],
    }, "board-slide");

    const markup = renderArtifact(graph);

    expect(markup).toContain("In six months, Dana Reyes expects to say:");
    expect(markup).toContain("“We cut intake from six days to two.”");
    expect(markup).toContain("Dana Reyes, VP Claims Operations");
    expect(markup).toContain("“My team stopped working weekends.”");
    expect(markup).toContain("Michelle Dorsey, Claims Supervisor");
    expect(markup).toContain("What the hackathon will scope");
    expect(markup.indexOf("What the hackathon will scope")).toBeLessThan(markup.indexOf("In six months"));
    expect(markup.indexOf("In six months")).toBeLessThan(markup.indexOf("The ask"));
  });

  it("omits the section for owner-and-ask", () => {
    const graph = {
      ...initialSessionGraph,
      captures: [...initialSessionGraph.captures, boardCapture],
    };

    expect(renderArtifact(graph)).not.toContain("In six months");
  });

  it("omits the section when the closing step has no captures", () => {
    const graph = applyCloseStyle(initialSessionGraph, "board-slide");

    expect(renderArtifact(graph)).not.toContain("In six months");
  });

  it("shows hackathon confirmation when booked, and a Rank link when not", () => {
    const booked = bookHackathon(selectThree(), {
      date: "2026-10-14",
      googleFacilitator: "Priya Raghavan",
      partnerSpecialist: "Ravi Menon",
      customerOwner: "Dana Reyes",
      question: "Can we prove extraction on Heartland forms?",
    });

    expect(renderArtifact(booked)).toContain("Hackathon confirmed · 2026-10-14");
    expect(renderArtifact(booked)).toContain("Priya Raghavan (Google)");
    expect(renderArtifact(booked)).toContain("Google stack for these three days");
    expect(renderArtifact(booked)).toContain("Add to Google Calendar");
    expect(renderArtifact(booked)).not.toContain("Confirm hackathon capacity");
    for (const id of booked.hackathon!.solutionIds) {
      const title = initialSessionGraph.solutions.find((solution) => solution.id === id)?.title;
      expect(renderArtifact(booked)).toContain(title!);
    }

    expect(renderArtifact(initialSessionGraph)).toContain("No hackathon booked yet");
    expect(renderArtifact(initialSessionGraph)).toContain('href="/rank"');
    expect(renderArtifact(initialSessionGraph)).toContain("Rank and book");
    expect(renderArtifact(initialSessionGraph)).not.toContain("Confirm hackathon capacity");
  });
});
