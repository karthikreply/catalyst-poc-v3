import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { brands } from "@/lib/brands";
import { initialSessionGraph } from "@/lib/seed";

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

  it("disables delivery and mechanic options for CPM and exposes selected states", () => {
    useSessionMock.mockReturnValue({
      graph: initialSessionGraph,
      brand: brands.cdw,
      setDelivery: vi.fn(),
      setMechanic: vi.fn(),
      setCloseStyle: vi.fn(),
      canEditSession: false,
    });

    const markup = renderToStaticMarkup(<PlanPage />);

    expect(markup.match(/disabled=""/g)).toHaveLength(7);
    expect(markup.match(/aria-pressed="true"/g)).toHaveLength(3);
    expect(markup.match(/aria-pressed="false"/g)).toHaveLength(4);
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
