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
import { recordHandoff } from "@/lib/session";

import Home from "./page";

function sessionFor(actor: string, hydrated: boolean, graph = initialSessionGraph) {
  useSessionMock.mockReturnValue({
    viewer: {
      actor,
      name: actor === "cpm" ? "Marcus Hale" : actor === "pdm" ? "Priya Raghavan" : "Ravi Menon",
      org: "Org",
    },
    setActor: vi.fn(),
    hydrated,
    graph,
  });
}

describe("program dashboard", () => {
  beforeEach(() => replace.mockReset());

  it("renders no Telemetry control for the customer", () => {
    sessionFor("cpm", true);
    const markup = renderToStaticMarkup(<Home />);
    expect(markup).not.toContain("Telemetry");
    expect(markup).not.toContain("Funding");
    expect(markup).not.toContain("Program dashboard");
    expect(markup).not.toContain("Sessions planned");

    render(<Home />);
    expect(replace).toHaveBeenCalledWith("/customer");
  });

  it("keeps the program dashboard and leaves planned sessions off it", () => {
    sessionFor("pdm", true);
    const markup = renderToStaticMarkup(<Home />);
    expect(markup).toContain("Program dashboard");
    expect(markup).toContain("Hello, Priya");
    expect(markup).toContain("Funding");
    expect(markup).toContain("Telemetry");
    expect(markup).not.toContain("Sessions planned");
    expect(markup).not.toContain("Northwind Benefits");
  });

  it("keeps the program tiles for the partner once the viewer is known", () => {
    sessionFor("partner", true);
    const markup = renderToStaticMarkup(<Home />);
    expect(markup).toContain("Funding");
    expect(markup).toContain("Telemetry");
    expect(markup).toContain('href="/telemetry"');
  });

  it.each(["partner", "pdm"])("shows the handoff strip to the %s without the controls", (actor) => {
    sessionFor(actor, true);
    const before = renderToStaticMarkup(<Home />);
    expect(before).toContain("Not yet handed off");
    expect(before).toContain("Alex Chen");
    expect(before).not.toContain("Prepare the DAF claim");

    sessionFor(actor, true, recordHandoff(initialSessionGraph, "pdm-notified"));
    const after = renderToStaticMarkup(<Home />);
    expect(after).toContain("PDM notified");
    expect(after).not.toContain("Not yet handed off");
  });

  it.each(["partner", "pdm"])("shows the handoff strip to the %s without the controls", (actor) => {
    sessionFor(actor, true);
    const before = renderToStaticMarkup(<Home />);
    expect(before).toContain("Not yet handed off");
    expect(before).toContain("Alex Chen");
    expect(before).not.toContain("Prepare the DAF claim");

    sessionFor(actor, true, recordHandoff(initialSessionGraph, "pdm-notified"));
    const after = renderToStaticMarkup(<Home />);
    expect(after).toContain("PDM notified");
    expect(after).not.toContain("Not yet handed off");
  });

  it("renders nothing before the stored viewer is known", () => {
    sessionFor("partner", false);
    const markup = renderToStaticMarkup(<Home />);
    expect(markup).not.toContain("Telemetry");
    expect(markup).not.toContain("Funding");
  });
});
