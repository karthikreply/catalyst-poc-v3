import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { brands } from "@/lib/brands";
import { initialSessionGraph } from "@/lib/seed";

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
  });

  it("keeps View telemetry for the partner", () => {
    expect(markupFor("partner")).toContain("View telemetry");
  });
});
