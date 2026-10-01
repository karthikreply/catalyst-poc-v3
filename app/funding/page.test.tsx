import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { brands } from "@/lib/brands";
import { initialSessionGraph } from "@/lib/seed";
import { applyClaimsVolumeChoice, applyExactClaimsVolume } from "@/lib/session";

const { useSessionMock } = vi.hoisted(() => ({
  useSessionMock: vi.fn(),
}));

vi.mock("@/components/session-provider", () => ({
  useSession: useSessionMock,
}));

import FundingPage from "./page";

describe("exact claims provenance", () => {
  it("carries partner-entered provenance into the funding request", () => {
    const graph = applyExactClaimsVolume(
      applyClaimsVolumeChoice(initialSessionGraph, "exact"),
      275,
    );
    useSessionMock.mockReturnValue({
      graph,
      brand: brands.cdw,
      viewer: { actor: "partner", name: "Ravi Menon", org: "CDW" },
    });

    const markup = renderToStaticMarkup(<FundingPage />);

    expect(markup).toContain(
      "Volume entered by partner in Scope · not respondent-confirmed",
    );
  });

  it("withholds the seeded case from a customer who has no account", () => {
    useSessionMock.mockReturnValue({
      graph: initialSessionGraph,
      brand: brands.cdw,
      viewer: { actor: "customer", name: "Dana Reyes", org: "Platform vendor" },
    });

    const markup = renderToStaticMarkup(<FundingPage />);
    expect(markup).toContain("This is written once your account is in the session.");
    expect(markup).toContain('href="/scope"');
    expect(markup).not.toContain("Heartland");
    expect(markup).not.toContain("Start DAF funding request");
  });
});
