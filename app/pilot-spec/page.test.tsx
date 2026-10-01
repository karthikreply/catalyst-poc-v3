import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { brands } from "@/lib/brands";
import { initialSessionGraph } from "@/lib/seed";
import { applyDeliveryMode, bookHackathon, bookedSolutionTitles, lockRanking, rankedSolutions, setPilotPick, toggleSelected } from "@/lib/session";

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
    const markup = markupFor("customer");
    expect(markup).not.toContain("View program telemetry");
    expect(markup).not.toContain("View telemetry");
    expect(markup).not.toContain('href="/telemetry"');
    expect(markup).not.toContain("This is written once your account is in the session.");
    expect(markup).toContain("What the funded pilot consists of");
    expect(markup).toContain("Heartland Mutual Insurance");
    expect(markup).toContain("Not captured yet");
    expect(markup).not.toContain("Reference story");
    expect(markup).toContain("Try it on your own documents.");
  });

  it("keeps the pending sentence when the session has no company name", () => {
    useSessionMock.mockReturnValue({
      graph: {
        ...initialSessionGraph,
        session: { ...initialSessionGraph.session, scopeMode: "cold", customerName: "" },
      },
      brand: brands.cdw,
      viewer: { actor: "customer", name: "Someone", org: "Org" },
    });
    const markup = renderToStaticMarkup(<PilotSpecPage />);
    expect(markup).toContain("This is written once your account is in the session.");
    expect(markup).toContain('href="/scope"');
    expect(markup).not.toContain("What the funded pilot consists of");
  });

  it("keeps View telemetry for the partner", () => {
    expect(markupFor("partner")).toContain("View telemetry");
    expect(markupFor("partner")).not.toContain("Reference story");
    expect(markupFor("pdm")).toContain("Reference story");
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

    const fragment = { ...booked, outcome: { ...booked.outcome, useCase: "document" } };
    useSessionMock.mockReturnValue({ graph: fragment, brand: brands.cdw, viewer: { actor: "partner", name: "Ravi", org: "CDW" } });
    const before = renderToStaticMarkup(<PilotSpecPage />);
    expect(before).toContain(bookedSolutionTitles(booked).join(", "));
    expect(before).not.toContain(">document<");
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

  it("links day two for the customer and a facilitated partner, and shows counts to the PDM", () => {
    const ids = rankedSolutions(initialSessionGraph).map((solution) => solution.id).slice(0, 3);
    const locked = lockRanking(ids.reduce((current, id) => toggleSelected(current, id), initialSessionGraph));
    const draft = {
      date: "2026-10-14",
      googleFacilitator: "Priya Raghavan",
      partnerSpecialist: "Ravi Menon",
      customerOwner: "Dana Reyes",
      question: "Can we prove the three?",
    };

    function renderFor(graph: typeof locked, actor: string) {
      useSessionMock.mockReturnValue({ graph, brand: brands.cdw, viewer: { actor, name: "Someone", org: "Org" } });
      return renderToStaticMarkup(<PilotSpecPage />);
    }

    const open = renderFor(locked, "customer");
    expect(open).toContain("Day 2.");
    expect(open).toContain("Try it on eight sample claims");
    expect(open).toContain('href="/try"');

    const preview = renderFor(bookHackathon(locked, draft), "customer");
    expect(preview).toContain("Preview day two");
    expect(preview).toContain('href="/try"');

    const partner = renderFor(locked, "partner");
    expect(partner).toContain('href="/try"');

    const selfServe = renderFor(applyDeliveryMode(locked, "self-service"), "partner");
    expect(selfServe).not.toContain('href="/try"');

    const pdm = renderFor(locked, "pdm");
    expect(pdm).toContain("Not run yet");
    expect(pdm).not.toContain('href="/try"');
  });

  it("shows the booked hackathon, and no hackathon section before booking", () => {
    const ids = rankedSolutions(initialSessionGraph).map((solution) => solution.id).slice(0, 3);
    const selected = ids.reduce((current, id) => toggleSelected(current, id), initialSessionGraph);
    const booked = bookHackathon(selected, {
      date: "2026-10-14",
      googleFacilitator: "Priya Raghavan",
      partnerSpecialist: "Ravi Menon",
      customerOwner: "Dana Reyes",
      question: "Can we prove the three?",
    });
    function renderFor(graph: typeof booked, actor: string) {
      useSessionMock.mockReturnValue({ graph, brand: brands.cdw, viewer: { actor, name: "Someone", org: "Org" } });
      return renderToStaticMarkup(<PilotSpecPage />);
    }

    expect(renderFor(selected, "customer")).not.toContain("Your hackathon");

    const customer = renderFor(booked, "customer");
    expect(customer).toContain("Your hackathon");
    expect(customer).toContain("2026-10-14 to 2026-10-16 · Showcase 2026-10-16 · 14:00");
    expect(customer).toContain("Can we prove the three?");
    expect(customer).toContain("Priya Raghavan");
    expect(customer).toContain("Ravi Menon");
    for (const title of bookedSolutionTitles(booked)) expect(customer).toContain(title);
    expect(customer).toContain("Products for ");
    expect(customer.indexOf("Your hackathon")).toBeLessThan(customer.indexOf("Day 2."));
    expect(customer).toContain("Pilot not yet chosen.");
    expect(customer).toContain('href="/artifact"');
    expect(customer.match(/What the three days will be\./g)).toHaveLength(1);

    const title = bookedSolutionTitles(booked)[0];
    const picked = renderFor(setPilotPick(booked, booked.hackathon!.solutionIds[0]), "pdm");
    expect(picked).toContain(`Pilot:</span> ${title}`);
    expect(picked).toContain("Open business case");
    expect(renderFor(booked, "pdm")).not.toContain("Choose on the business case");
  });
});
