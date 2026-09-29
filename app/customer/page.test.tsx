import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { brands } from "@/lib/brands";
import { initialSessionGraph } from "@/lib/seed";
import {
  applyColdScope,
  bookHackathon,
  bookedSolutionTitles,
  chooseCustomerFormat,
  coldScopeDefaults,
  rankedSolutions,
  toggleSelected,
} from "@/lib/session";

const useSessionMock = vi.fn();

vi.mock("@/components/session-provider", () => ({
  useSession: () => useSessionMock(),
}));

import CustomerHomePage from "./page";

const customer = { actor: "cpm", name: "Marcus Hale", org: "Platform vendor" };

function mockGraph(graph = initialSessionGraph, viewer = customer) {
  useSessionMock.mockReturnValue({
    graph,
    brand: brands.cdw,
    viewer,
    chooseCustomerFormat: vi.fn(),
  });
}

describe("customer home", () => {
  beforeEach(() => useSessionMock.mockReset());

  it("treats a fresh facilitated Heartland graph as not started", () => {
    mockGraph();
    const markup = renderToStaticMarkup(<CustomerHomePage />);

    expect(markup).toContain("Session progress and funding for this engagement only.");
    expect(markup).toContain("No account yet");
    expect(markup).toContain("Not started");
    expect(markup).toContain("Prioritize my use cases");
    expect(markup).toContain("Show me the cost of waiting");
    expect(markup).not.toContain("Heartland");
    expect(markup).not.toContain("$7,750,000");
    expect(markup).not.toContain("Continue session");
    expect(markup).not.toContain("Telemetry");
    expect(markup).toContain('aria-disabled="true"');
    expect(markup).not.toContain("calendar.google.com");
    expect(markup).toContain('href="/funding"');
    expect(markup).toContain('href="/artifact"');
  });

  it("shows the started session and routes Continue to Scope until a step is active", () => {
    const started = chooseCustomerFormat(initialSessionGraph, "ghost-ledger");
    mockGraph(started);
    const markup = renderToStaticMarkup(<CustomerHomePage />);

    expect(markup).toContain("Show me the cost of waiting");
    expect(markup).toContain("Partner of record");
    expect(markup).toContain("CDW");
    expect(markup).toContain('href="/scope"');
    expect(markup).not.toContain("How do you want to start?");
    expect(markup).not.toContain("Annual value");
  });

  it("hides the annual value on a cold account with incomplete inputs", () => {
    const cold = applyColdScope(
      chooseCustomerFormat(initialSessionGraph, "value-sprint"),
      { name: "Reply", industry: "Insurance", sizeBand: "$500M–$1B" },
      coldScopeDefaults.attendees,
    );
    mockGraph(cold);
    const markup = renderToStaticMarkup(<CustomerHomePage />);

    expect(markup).toContain("Reply");
    expect(markup).toContain("Where it hurts");
    expect(markup).toContain('href="/run"');
    expect(markup).not.toContain("Annual value");
    expect(markup).not.toContain("$7,750,000");
  });

  it("links the schedule card to a compose URL carrying date, partner, and titles once booked", () => {
    const ids = rankedSolutions(initialSessionGraph).map((solution) => solution.id).slice(0, 3);
    const selected = ids.reduce((current, id) => toggleSelected(current, id), initialSessionGraph);
    const booked = bookHackathon(selected, {
      date: "2026-10-14",
      googleFacilitator: "Priya Raghavan",
      partnerSpecialist: "Ravi Menon",
      customerOwner: "Devin Cole",
      question: "Can we prove the three?",
    });
    mockGraph(booked);
    const markup = renderToStaticMarkup(<CustomerHomePage />);
    const href = markup.match(/href="(https:\/\/calendar\.google\.com[^"]+)"/)?.[1] ?? "";
    const decoded = decodeURIComponent(href.replace(/&amp;/g, "&").replace(/\+/g, "%20"));

    expect(markup).not.toContain('aria-disabled="true"');
    expect(decoded).toContain("20261014");
    expect(decoded).toContain("Partner: CDW");
    for (const title of bookedSolutionTitles(booked)) {
      expect(decoded).toContain(title);
    }
  });

  it("points partner and PDM viewers back to the dashboard", () => {
    mockGraph(initialSessionGraph, { actor: "partner", name: "Ravi Menon", org: "CDW" });
    const markup = renderToStaticMarkup(<CustomerHomePage />);
    expect(markup).toContain("Back to dashboard");
    expect(markup).not.toContain("Prioritize my use cases");
  });
});
