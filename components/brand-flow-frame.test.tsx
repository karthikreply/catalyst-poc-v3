import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { brands } from "@/lib/brands";
import { initialSessionGraph } from "@/lib/seed";
import { applyColdScope, coldScopeDefaults } from "@/lib/session";

const state = vi.hoisted(() => ({ pathname: "/plan" }));
const useSessionMock = vi.fn();

vi.mock("next/navigation", () => ({ usePathname: () => state.pathname }));
vi.mock("./session-provider", () => ({ useSession: () => useSessionMock() }));

import { BrandFlowFrame } from "./brand-flow-frame";

function frame(actor: string, graph = initialSessionGraph) {
  useSessionMock.mockReturnValue({
    graph,
    brand: brands.cdw,
    brandId: "cdw",
    setBrandId: vi.fn(),
    setMechanic: vi.fn(),
    canEditSession: true,
    viewer: { actor, name: "Someone", org: "Org" },
  });
  return renderToStaticMarkup(<BrandFlowFrame><p>body</p></BrandFlowFrame>);
}

describe("customer chrome", () => {
  it("names the partner of record and hides the brand switcher", () => {
    state.pathname = "/plan";
    const markup = frame("customer");
    expect(markup).toContain("CDW");
    expect(markup).toContain("Your engagement");
    expect(markup).not.toContain("Partner brand");
    expect(markup).not.toContain("aria-haspopup");
    expect(markup).not.toContain("Heartland");
  });

  it("puts the chosen format under the account once the customer has one", () => {
    state.pathname = "/run";
    const account = applyColdScope(
      initialSessionGraph,
      { name: "Reply", industry: "Insurance", sizeBand: "Enterprise" },
      coldScopeDefaults.attendees,
    );
    const markup = frame("customer", account);
    expect(markup).toContain("Reply · value session");
    expect(markup).toContain("Prioritize my use cases");
    expect(markup).not.toContain("Partner-facilitated");
    expect(markup).not.toContain(">Format<");
    expect(markup).not.toContain("Next: Rank");
  });

  it("keeps the partner brand switcher and facilitation line", () => {
    state.pathname = "/run";
    const markup = frame("partner");
    expect(markup).toContain("aria-haspopup");
    expect(markup).toContain("Facilitated by");
    expect(markup).toContain("Heartland Mutual Insurance · value session");
    expect(markup).toContain(">Format<");
    expect(markup).toContain("Next: Rank");
  });
});
