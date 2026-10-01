import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { brands } from "@/lib/brands";
import { initialSessionGraph } from "@/lib/seed";
import { applyColdScope, coldScopeDefaults } from "@/lib/session";

const { useSessionMock } = vi.hoisted(() => ({
  useSessionMock: vi.fn(),
}));

vi.mock("@/components/session-provider", () => ({
  useSession: useSessionMock,
}));

import PlanPage from "./page";

describe("read-only Plan controls", () => {
  beforeEach(() => {
    useSessionMock.mockReset();
  });

  it("asks the customer to add a company before showing a seeded plan", () => {
    useSessionMock.mockReturnValue({
      graph: initialSessionGraph,
      brand: brands.cdw,
      viewer: { actor: "customer", name: "Dana Reyes", org: "Platform vendor" },
      setDelivery: vi.fn(),
      setMechanic: vi.fn(),
      setCloseStyle: vi.fn(),
      canEditSession: false,
    });

    const markup = renderToStaticMarkup(<PlanPage />);

    expect(markup).toContain("Add the company before the session");
    expect(markup).toContain('href="/scope"');
    expect(markup).not.toContain("Invitation drafts");
    expect(markup).not.toContain("Push to CRM");
    expect(markup).not.toContain("Heartland");
  });

  it("briefs the customer from their account and leaves invitations to the partner", () => {
    const account = applyColdScope(
      initialSessionGraph,
      { name: "Reply", industry: "Insurance", sizeBand: "Enterprise" },
      coldScopeDefaults.attendees,
    );
    useSessionMock.mockReturnValue({
      graph: account,
      brand: brands.cdw,
      viewer: { actor: "customer", name: "Dana Reyes", org: "Reply" },
      setDelivery: vi.fn(),
      setMechanic: vi.fn(),
      setCloseStyle: vi.fn(),
      canEditSession: true,
    });

    const customerMarkup = renderToStaticMarkup(<PlanPage />);
    expect(customerMarkup).toContain("Before the session");
    expect(customerMarkup).toContain("What you will cover, who to bring, and what to have ready.");
    expect(customerMarkup).toContain("Prioritize my use cases");
    expect(customerMarkup).toContain("CDW");
    expect(customerMarkup).toContain("Laura Beckett");
    expect(customerMarkup).toContain("VP Claims Operations");
    expect(customerMarkup).toContain("Start the session");
    expect(customerMarkup).toContain('href="/run"');
    expect(customerMarkup).not.toContain("Invitation drafts");
    expect(customerMarkup).not.toContain("Push to CRM");
    expect(customerMarkup).not.toContain("Practice sponsor");
    expect(customerMarkup).not.toContain("Who runs it");

    useSessionMock.mockReturnValue({
      graph: account,
      brand: brands.cdw,
      viewer: { actor: "partner", name: "Ravi Menon", org: "CDW" },
      setDelivery: vi.fn(),
      setMechanic: vi.fn(),
      setCloseStyle: vi.fn(),
      canEditSession: true,
    });
    const partnerMarkup = renderToStaticMarkup(<PlanPage />);
    expect(partnerMarkup).toContain("Invitation drafts");
    expect(partnerMarkup).toContain("Push to CRM");
  });

  it("renders at most one partner context", () => {
    useSessionMock.mockReturnValue({
      graph: {
        ...initialSessionGraph,
        partnerNotes: [
          {
            id: "partner-note-1",
            author: "Ravi Menon",
            text: "Newest partner context.",
            updatedAt: "2026-09-23T16:00:00.000Z",
          },
          {
            id: "partner-note-2",
            author: "Ravi Menon",
            text: "Older partner context.",
            updatedAt: "2026-09-23T15:00:00.000Z",
          },
        ],
      },
      brand: brands.cdw,
      viewer: { actor: "partner", name: "Ravi Menon", org: "CDW" },
      setDelivery: vi.fn(),
      setMechanic: vi.fn(),
      setCloseStyle: vi.fn(),
      canEditSession: true,
    });

    const markup = renderToStaticMarkup(<PlanPage />);

    expect(markup).toContain("Newest partner context.");
    expect(markup).not.toContain("Older partner context.");
  });

  it("shows the board-slide close selector and agenda variant", () => {
    useSessionMock.mockReturnValue({
      graph: {
        ...initialSessionGraph,
        session: { ...initialSessionGraph.session, closeStyle: "board-slide" },
      },
      brand: brands.cdw,
      viewer: { actor: "pdm", name: "Priya Raghavan", org: "Google" },
      setDelivery: vi.fn(),
      setMechanic: vi.fn(),
      setCloseStyle: vi.fn(),
      canEditSession: true,
    });

    const markup = renderToStaticMarkup(<PlanPage />);

    expect(markup).toContain("How it closes");
    expect(markup).toContain("Partner-facilitated");
    expect(markup).toContain("Google-facilitated");
    expect(markup).toContain("Customer-run");
    expect(markup).toContain("Owner and ask");
    expect(markup).toContain("Board-slide close");
    expect(markup).toContain("Time Traveler: imagine the pilot succeeded, then capture the sponsor");
    expect(markup).toContain("The board slide");
    expect(markup).toContain("Capture the answer verbatim. Their words, not a summary.");
  });
});
