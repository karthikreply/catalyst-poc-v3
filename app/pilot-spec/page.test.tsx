import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { brands } from "@/lib/brands";
import { initialSessionGraph } from "@/lib/seed";
import { bookHackathon, bookedSolutionTitles, rankedSolutions, setPilotPick, toggleSelected } from "@/lib/session";

const useSessionMock = vi.fn();

vi.mock("@/components/session-provider", () => ({
  useSession: () => useSessionMock(),
}));

import PilotSpecPage from "./page";

function markupFor(actor: string) {
  useSessionMock.mockReturnValue({
    graph: initialSessionGraph,
    brand: brands.cdw,
    viewer: { actor, name: "Someone", org: "Org" },
  });
  return renderToStaticMarkup(<PilotSpecPage />);
}

describe("pilot spec", () => {
  it("hides program telemetry from the customer", () => {
    const markup = markupFor("cpm");
    expect(markup).not.toContain("View program telemetry");
    expect(markup).not.toContain("View telemetry");
    expect(markup).not.toContain('href="/telemetry"');
    expect(markup).toContain("This is written once your account is in the session.");
    expect(markup).not.toContain("Heartland");
  });

  it("keeps View telemetry for the partner", () => {
    expect(markupFor("partner")).toContain("View telemetry");
  });

  it("names the picked pilot as the use case and scope, and is unchanged without a pick", () => {
    const ids = rankedSolutions(initialSessionGraph).map((solution) => solution.id).slice(0, 3);
    const booked = bookHackathon(ids.reduce((current, id) => toggleSelected(current, id), initialSessionGraph), {
      date: "2026-10-14",
      googleFacilitator: "Priya Raghavan",
      partnerSpecialist: "Ravi Menon",
      customerOwner: "Dana Reyes",
      question: "Can we prove the three?",
    });
    const title = bookedSolutionTitles(booked)[1];

    useSessionMock.mockReturnValue({ graph: booked, brand: brands.cdw, viewer: { actor: "partner", name: "Ravi", org: "CDW" } });
    const before = renderToStaticMarkup(<PilotSpecPage />);
    expect(before).toContain(booked.outcome.useCase);
    expect(before).toContain("3-day hackathon on 2026-10-14 to scope a six-week pilot");
    expect(before).not.toContain("Six-week pilot on");
    expect(before).not.toContain("Scope</dt>");

    const picked = setPilotPick(booked, booked.hackathon!.solutionIds[1]);
    useSessionMock.mockReturnValue({ graph: picked, brand: brands.cdw, viewer: { actor: "partner", name: "Ravi", org: "CDW" } });
    const after = renderToStaticMarkup(<PilotSpecPage />);
    expect(after).toContain(`Use case</dt><dd class="mt-1 text-sm leading-6">${title}</dd>`);
    expect(after).toContain(`Six-week pilot on ${title}, scoped in the three-day hackathon.`);
    expect(after).toContain(`Next step</dt><dd class="mt-1 text-sm leading-6">Six-week pilot on ${title}</dd>`);
  });
});
