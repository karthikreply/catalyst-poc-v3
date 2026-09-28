import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { brands } from "@/lib/brands";
import { initialSessionGraph } from "@/lib/seed";
import { bookHackathon, lockRanking, moveSolution } from "@/lib/session";

const useSessionMock = vi.fn();

vi.mock("@/components/session-provider", () => ({
  useSession: () => useSessionMock(),
}));

import RankPage from "./page";

describe("Rank page", () => {
  beforeEach(() => {
    useSessionMock.mockReturnValue({
      graph: initialSessionGraph,
      canEditSession: true,
      moveSolution: vi.fn(),
      lockRanking: vi.fn(),
      unlockRanking: vi.fn(),
      bookHackathon: vi.fn(),
    });
  });

  it("shows the seeded shortlist and lock control before booking", () => {
    const markup = renderToStaticMarkup(<RankPage />);
    expect(markup).toContain("Rank solutions");
    expect(markup).toContain("AI-assisted claims intake extraction");
    expect(markup).toContain("Document AI");
    expect(markup).toContain("Vertex AI Search");
    expect(markup).toContain("Lock rank 1");
    expect(markup).not.toContain("Book hackathon");
  });

  it("shows the booking form after rank 1 is locked", () => {
    const locked = lockRanking(moveSolution(initialSessionGraph, initialSessionGraph.ranking.order[1], "up"));
    useSessionMock.mockReturnValue({
      graph: locked,
      canEditSession: true,
      moveSolution: vi.fn(),
      lockRanking: vi.fn(),
      unlockRanking: vi.fn(),
      bookHackathon: vi.fn(),
    });

    const markup = renderToStaticMarkup(<RankPage />);
    expect(markup).toContain("Book the three-day hackathon");
    expect(markup).toContain("Book hackathon");
    expect(markup).toContain("Google facilitator");
  });

  it("opens the business case once the hackathon is booked", () => {
    const booked = bookHackathon(lockRanking(initialSessionGraph), {
      date: "2026-10-14",
      googleFacilitator: "Priya Raghavan",
      partnerSpecialist: "Ravi Menon",
      customerOwner: "Dana Reyes",
      question: "Can we prove extraction on Heartland forms?",
    });
    useSessionMock.mockReturnValue({
      graph: booked,
      brand: brands.cdw,
      canEditSession: true,
      moveSolution: vi.fn(),
      lockRanking: vi.fn(),
      unlockRanking: vi.fn(),
      bookHackathon: vi.fn(),
    });

    const markup = renderToStaticMarkup(<RankPage />);
    expect(markup).toContain("Booked · 2026-10-14");
    expect(markup).toContain('href="/artifact"');
  });
});
