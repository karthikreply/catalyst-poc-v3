// @vitest-environment jsdom
import { fireEvent, render } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const useSessionMock = vi.fn();
const replace = vi.hoisted(() => vi.fn());
const push = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push }),
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
      name: actor === "customer" ? "Dana Reyes" : actor === "pdm" ? "Priya Raghavan" : "Ravi Menon",
      org: "Org",
    },
    setActor: vi.fn(),
    hydrated,
    graph,
  });
}

describe("program dashboard", () => {
  beforeEach(() => {
    replace.mockReset();
    push.mockReset();
  });

  it("opens the customer door from the Customer card without using the viewer dropdown", () => {
    const setActor = vi.fn();
    const setCustomerDoor = vi.fn();
    useSessionMock.mockReturnValue({
      viewer: { actor: "partner", name: "Ravi Menon", org: "Org" },
      setActor,
      setCustomerDoor,
      hydrated: true,
      graph: initialSessionGraph,
    });

    const view = render(<Home />);
    fireEvent.click(view.getByRole("button", { name: /^Customer/ }));

    expect(setActor).toHaveBeenCalledWith("customer");
    expect(setCustomerDoor).toHaveBeenCalledWith(true);
    expect(push).toHaveBeenCalledWith("/customer");
    expect(replace).not.toHaveBeenCalled();

    setActor.mockClear();
    setCustomerDoor.mockClear();
    push.mockClear();
    fireEvent.click(view.getByRole("button", { name: /^Partner/ }));
    expect(setActor).toHaveBeenCalledWith("partner");
    expect(setCustomerDoor).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });

  it("renders no Telemetry control for the customer", () => {
    sessionFor("customer", true);
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
