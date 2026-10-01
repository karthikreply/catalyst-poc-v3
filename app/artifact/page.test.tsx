import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { brands } from "@/lib/brands";
import { initialSessionGraph } from "@/lib/seed";
import {
  applyClaimsVolumeChoice,
  applyCloseStyle,
  applyColdScope,
  applyExactClaimsVolume,
  bookHackathon,
  bookedSolutionPains,
  coldScopeDefaults,
  rankedSolutions,
  setPilotPick,
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

describe("customer without an account", () => {
  it("keeps the pending sentence when the session has no company name", () => {
    useSessionMock.mockReturnValue({
      graph: {
        ...initialSessionGraph,
        session: { ...initialSessionGraph.session, scopeMode: "cold", customerName: "  " },
      },
      brand: brands.cdw,
      viewer: { actor: "cpm", name: "Marcus Hale", org: "Platform vendor" },
      markHackathonCalendarAdded: vi.fn(),
    });
    const markup = renderToStaticMarkup(<ArtifactPage />);
    expect(markup).toContain("This is written once your account is in the session.");
    expect(markup).toContain('href="/scope"');
    expect(markup).not.toContain("Heartland");
    expect(markup).not.toContain("Open pilot spec");
  });

  it("shows the booked Heartland case and the next actions to a seeded named customer", () => {
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
      viewer: { actor: "cpm", name: "Marcus Hale", org: "Platform vendor" },
      canEditSession: false,
      bookHackathon: vi.fn(),
      setPilotPick: vi.fn(),
      markHackathonCalendarAdded: vi.fn(),
      markHackathonMeetAdded: vi.fn(),
    });
    const markup = renderToStaticMarkup(<ArtifactPage />);
    expect(booked.session.scopeMode).toBe("seeded");
    expect(booked.session.customerName).toBe("Heartland Mutual Insurance");
    expect(markup).not.toContain("This is written once your account is in the session.");
    expect(markup).toContain("Hackathon confirmed · 2026-10-14");
    expect(markup).toContain("What the three days will be.");
    expect(markup).toContain("Which one becomes the pilot?");
    expect(markup).toContain("Pilot not yet chosen. The room names it at the showcase.");
    expect(markup).not.toContain("as the pilot");
    expect(markup).toContain("Open pilot spec");
    expect(markup).toContain("Add to Google Calendar");
    expect(markup).not.toContain("Review funding request");
    expect(markup).not.toContain('href="/funding"');
  });

  it("does not offer a funding request once the account is in the session", () => {
    useSessionMock.mockReturnValue({
      graph: {
        ...initialSessionGraph,
        session: { ...initialSessionGraph.session, scopeMode: "cold", customerName: "Reply" },
      },
      brand: brands.cdw,
      viewer: { actor: "cpm", name: "Marcus Hale", org: "Reply" },
      canEditSession: true,
      bookHackathon: vi.fn(),
      markHackathonCalendarAdded: vi.fn(),
    });
    const markup = renderToStaticMarkup(<ArtifactPage />);
    expect(markup).toContain("Prepared for Reply.");
    expect(markup).not.toContain("Review funding request");
    expect(markup).not.toContain('href="/funding"');
    expect(markup).toContain("Open pilot spec");
  });
});

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

describe("hackathon booking on the business case", () => {
  it("shows the booking form once three are selected", () => {
    useSessionMock.mockReturnValue({
      graph: selectThree(),
      brand: brands.cdw,
      viewer: { actor: "partner", name: "Ravi Menon", org: "CDW" },
      canEditSession: true,
      bookHackathon: vi.fn(),
      markHackathonCalendarAdded: vi.fn(),
    });
    const markup = renderToStaticMarkup(<ArtifactPage />);
    expect(markup).toContain("Book the three-day hackathon");
    expect(markup).toContain("The three days scope a six-week pilot on these solutions.");
    expect(markup).toContain("Hackathon date");
    expect(markup).toContain("Book hackathon");
    expect(markup).not.toContain("Rank and book");
  });

  it("does not let the PDM book", () => {
    useSessionMock.mockReturnValue({
      graph: selectThree(),
      brand: brands.cdw,
      viewer: { actor: "pdm", name: "Priya Raghavan", org: "Google" },
      canEditSession: true,
      bookHackathon: vi.fn(),
      markHackathonCalendarAdded: vi.fn(),
    });
    const markup = renderToStaticMarkup(<ArtifactPage />);
    expect(markup).toContain("A PDM does not book it.");
    expect(markup).not.toContain("Book hackathon");
    expect(markup).not.toContain("Hackathon date");
  });
});

describe("the three days, on the booked business case", () => {
  const draft = {
    date: "2026-10-14",
    googleFacilitator: "Priya Raghavan",
    partnerSpecialist: "Ravi Menon",
    customerOwner: "Dana Reyes",
    question: "Can we prove the three?",
  };
  const partner = { actor: "partner", name: "Ravi Menon", org: "CDW" };
  const pdm = { actor: "pdm", name: "Priya Raghavan", org: "Google" };
  const customer = { actor: "cpm", name: "Marcus Hale", org: "Reply" };
  const bookedHeartland = bookHackathon(selectThree(), draft);
  const bookedCold = bookHackathon(
    selectThree(applyColdScope(initialSessionGraph, { name: "Reply", industry: "Insurance", sizeBand: "Enterprise" }, coldScopeDefaults.attendees)),
    { ...draft, customerOwner: "Devin Cole" },
  );

  function render(graph: typeof initialSessionGraph, viewer: { actor: string; name: string; org: string }) {
    useSessionMock.mockReturnValue({
      graph,
      brand: brands.cdw,
      viewer,
      canEditSession: viewer.actor !== "cpm",
      bookHackathon: vi.fn(),
      setPilotPick: vi.fn(),
      markHackathonCalendarAdded: vi.fn(),
    });
    return renderToStaticMarkup(<ArtifactPage />);
  }

  it.each([
    ["partner", partner, bookedHeartland],
    ["PDM", pdm, bookedHeartland],
    ["customer", customer, bookedCold],
  ])("shows the three titles with pain lines and the scope line to the %s", (_label, viewer, graph) => {
    const markup = render(graph, viewer);
    expect(markup).toContain("What the three days produce");
    expect(markup).toContain("This demo shows the scope, not the build.");
    expect(markup).toContain("Judged against the pain captured in the session.");
    expect(markup).toContain("Solution showcase");
    expect(markup).toContain("2026-10-16 · 14:00");
    expect(markup).toContain("Send reminders");
    const rows = bookedSolutionPains(graph);
    expect(rows).toHaveLength(3);
    for (const row of rows) {
      expect(markup).toContain(row.title);
      expect(markup).toContain(row.pain.replaceAll("'", "&#x27;"));
    }
    const section = markup.slice(markup.indexOf("What the three days produce"), markup.indexOf("Google stack for these three days"));
    const solutionList = section.slice(0, section.indexOf("What the three days will be."));
    expect(solutionList).not.toContain("Choose");
    const pilotHeading = section.indexOf("Which one becomes the pilot?");
    expect(section.indexOf("Start from the pain.")).toBeLessThan(pilotHeading);
    expect(section.indexOf("Try it on your own documents.")).toBeLessThan(pilotHeading);
    expect(section.indexOf("Write down what held.")).toBeLessThan(pilotHeading);
    expect(section.indexOf("Date ·")).toBeGreaterThan(section.indexOf("Write down what held."));
    expect(section.indexOf("Solution showcase")).toBeGreaterThan(section.indexOf("Date ·"));
    expect(pilotHeading).toBeGreaterThan(section.indexOf("Solution showcase"));
    if (viewer.actor === "pdm") {
      expect(section).not.toContain("Choose");
    } else {
      expect(section.indexOf("Write down what held.")).toBeLessThan(section.indexOf("Choose"));
      for (const row of rows) {
        expect(section.indexOf(`Choose ${row.title} as the pilot`)).toBeGreaterThan(pilotHeading);
      }
    }
  });

  it("offers Choose to the partner and the customer, and only the pick to the PDM", () => {
    expect(render(bookedHeartland, partner)).toContain("as the pilot");
    expect(render(bookedCold, customer)).toContain("as the pilot");
    const pdmMarkup = render(bookedHeartland, pdm);
    expect(pdmMarkup).not.toContain("as the pilot");
    expect(pdmMarkup).toContain("Pilot not yet chosen");

    const picked = setPilotPick(bookedHeartland, bookedHeartland.hackathon!.solutionIds[2]);
    const title = bookedSolutionPains(picked)[2].title;
    expect(render(picked, pdm)).toContain(`Pilot: ${title}`);
    expect(render(picked, partner)).toContain("Chosen");
  });

  it("names the picked title as the next step, and is unchanged without a pick", () => {
    const title = bookedSolutionPains(bookedHeartland)[1].title;
    expect(render(bookedHeartland, partner)).not.toContain(`Six-week pilot on ${title}`);
    const picked = setPilotPick(bookedHeartland, bookedHeartland.hackathon!.solutionIds[1]);
    const markup = render(picked, partner);
    expect(markup).toContain(`Six-week pilot on ${title}`);
    expect(markup).toContain("Start DAF funding request");
  });

  it("keeps buy, purchase, and Apply for DAF off the customer's business case", () => {
    const picked = setPilotPick(bookedCold, bookedCold.hackathon!.solutionIds[0]);
    for (const graph of [bookedCold, picked]) {
      const markup = render(graph, customer);
      expect(markup).not.toMatch(/\b(buy|purchase)\b/i);
      expect(markup).not.toContain("Apply for DAF");
      expect(markup).not.toContain("Review funding request");
    }
  });
});
