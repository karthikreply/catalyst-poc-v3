import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { brands } from "@/lib/brands";
import { initialSessionGraph } from "@/lib/seed";
import {
  applyColdScope,
  applyDeliveryMode,
  bookHackathon,
  bookedSolutionTitles,
  chooseCustomerFormat,
  coldScopeDefaults,
  rankedSolutions,
  recordHandoff,
  setPilotPick,
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

  it("shows a customer on the partner-led Heartland session as attending, with no format cards", () => {
    mockGraph();
    const markup = renderToStaticMarkup(<CustomerHomePage />);

    expect(markup).toContain("You are attending. The pain is already on the account.");
    expect(markup).toContain("Heartland Mutual Insurance");
    expect(markup).toContain("Constraints");
    expect(markup).toContain("Not yet handed off");
    expect(markup).toContain('href="/run"');
    expect(markup).not.toContain("How do you want to start?");
    expect(markup).not.toContain("Prioritize my use cases");
    expect(markup).not.toContain("Show me the cost of waiting");
    expect(markup).not.toContain("Prepare the DAF claim");
    expect(markup).not.toContain("File the pilot");
    expect(markup).not.toContain("Notify the PDM");
    expect(markup).not.toContain("Telemetry");
    expect(markup).not.toContain("View funding pack");
    expect(markup).not.toContain("Apply for DAF");
    expect(markup).not.toContain('href="/funding"');
  });

  it("shows the recorded handoff to the attending customer without the controls", () => {
    mockGraph(recordHandoff(initialSessionGraph, "daf"));
    const markup = renderToStaticMarkup(<CustomerHomePage />);

    expect(markup).toContain("DAF with the partner");
    expect(markup).not.toContain("Prepare the DAF claim");
  });

  it("keeps the format door for a self-service customer who has not started", () => {
    mockGraph(applyDeliveryMode(initialSessionGraph, "self-service"));
    const markup = renderToStaticMarkup(<CustomerHomePage />);

    expect(markup).toContain("Session progress and funding for this engagement only.");
    expect(markup).toContain("How do you want to start?");
    expect(markup).toContain("Prioritize my use cases");
    expect(markup).toContain("Show me the cost of waiting");
    expect(markup).toContain("No account yet");
    expect(markup).toContain("Not started");
    expect(markup).toContain("Not yet handed off");
    expect(markup).not.toContain("You are attending.");
    expect(markup).not.toContain("Prepare the DAF claim");
  });

  it("keeps the format door for a customer on a cold account", () => {
    mockGraph(applyColdScope(initialSessionGraph, coldScopeDefaults.company, coldScopeDefaults.attendees));
    const markup = renderToStaticMarkup(<CustomerHomePage />);

    expect(markup).toContain("How do you want to start?");
    expect(markup).not.toContain("You are attending.");
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
    expect(markup).toContain("Funding pack");
    expect(markup).toContain("Your partner prepares the DAF claim from this business case.");
    expect(markup).toContain("View funding pack");
    expect(markup).not.toContain("Apply for DAF");
  });

  it("links the schedule card to a compose URL carrying date, partner, and titles once booked", () => {
    const account = applyColdScope(
      initialSessionGraph,
      { name: "Reply", industry: "Insurance", sizeBand: "Enterprise" },
      coldScopeDefaults.attendees,
    );
    const ids = rankedSolutions(account).map((solution) => solution.id).slice(0, 3);
    const selected = ids.reduce((current, id) => toggleSelected(current, id), account);
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

  it("reads Pilot scoped once the room has picked, with no purchase language", () => {
    const account = applyColdScope(
      chooseCustomerFormat(initialSessionGraph, "value-sprint"),
      { name: "Reply", industry: "Insurance", sizeBand: "Enterprise" },
      coldScopeDefaults.attendees,
    );
    const ids = rankedSolutions(account).map((solution) => solution.id).slice(0, 3);
    const booked = bookHackathon(ids.reduce((current, id) => toggleSelected(current, id), account), {
      date: "2026-10-14",
      googleFacilitator: "Priya Raghavan",
      partnerSpecialist: "Ravi Menon",
      customerOwner: "Devin Cole",
      question: "Can we prove the three?",
    });
    mockGraph(booked);
    const before = renderToStaticMarkup(<CustomerHomePage />);
    expect(before).not.toContain("Pilot scoped");
    expect(decodeURIComponent(before.replace(/\+/g, "%20"))).toContain("Showcase: 2026-10-16T14:00");

    mockGraph(setPilotPick(booked, booked.hackathon!.solutionIds[0]));
    const after = renderToStaticMarkup(<CustomerHomePage />);
    expect(after).toContain("Pilot scoped");
    expect(after).not.toMatch(/\b(buy|purchase)\b/i);
    expect(after).not.toContain("Apply for DAF");
  });

  it("points partner and PDM viewers back to the dashboard", () => {
    mockGraph(initialSessionGraph, { actor: "partner", name: "Ravi Menon", org: "CDW" });
    const markup = renderToStaticMarkup(<CustomerHomePage />);
    expect(markup).toContain("Back to dashboard");
    expect(markup).not.toContain("Prioritize my use cases");
  });
});
