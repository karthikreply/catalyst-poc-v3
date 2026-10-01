// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const useSessionMock = vi.fn();
const replace = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));
vi.mock("@/components/session-provider", () => ({
  useSession: () => useSessionMock(),
}));

import { initialSessionGraph } from "@/lib/seed";

import SessionsPage from "./page";

function sessionFor(actor: string, hydrated: boolean, graph = initialSessionGraph) {
  useSessionMock.mockReturnValue({
    viewer: {
      actor,
      name: actor === "customer" ? "Dana Reyes" : actor === "pdm" ? "Priya Raghavan" : "Ravi Menon",
      org: "Org",
    },
    hydrated,
    graph,
  });
}

describe("my sessions", () => {
  beforeEach(() => replace.mockReset());

  it("lists the partner's own sessions and links only the live row", () => {
    sessionFor("partner", true);
    const markup = renderToStaticMarkup(<SessionsPage />);

    expect(markup).toContain("My sessions");
    expect(markup).toContain("3 sessions planned");
    expect(markup).toContain("Heartland Mutual Insurance");
    expect(markup).toContain("Northwind Benefits");
    expect(markup).toContain("Lakeshore Health");
    expect(markup).toContain("in session");
    expect(markup).toContain("21 Sep 2026");
    expect(markup).toContain('href="/run"');
    expect(markup).not.toContain("Contoso Manufacturing");
    expect(markup).toContain("Illustrative. Not live Salesforce data.");
    expect(markup).not.toContain('href="/scope"');
  });

  it("lists a different set for the PDM, including which partner runs each", () => {
    sessionFor("pdm", true);
    const markup = renderToStaticMarkup(<SessionsPage />);

    expect(markup).toContain("4 sessions planned");
    expect(markup).toContain("Heartland Mutual Insurance");
    expect(markup).toContain("Contoso Manufacturing");
    expect(markup).toContain("Insight");
    expect(markup).toContain("Fabrikam Retail");
    expect(markup).toContain("Alpine Credit Union");
    expect(markup).toContain("SHI");
    expect(markup).not.toContain("Lakeshore Health");
    expect(markup).not.toContain("Northwind Benefits");
    expect(markup).toContain('href="/run"');
  });

  it("sends the customer back to their engagement and renders nothing", () => {
    sessionFor("customer", true);
    const markup = renderToStaticMarkup(<SessionsPage />);
    expect(markup).not.toContain("My sessions");
    expect(markup).not.toContain("Heartland");
    expect(markup).not.toContain("Telemetry");

    render(<SessionsPage />);
    expect(replace).toHaveBeenCalledWith("/customer");
  });

  it("renders nothing before the stored viewer is known", () => {
    sessionFor("partner", false);
    const markup = renderToStaticMarkup(<SessionsPage />);
    expect(markup).not.toContain("My sessions");
    expect(markup).not.toContain("Heartland");
  });
});
