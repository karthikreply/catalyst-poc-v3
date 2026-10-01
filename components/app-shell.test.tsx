// @vitest-environment jsdom
import { fireEvent, render } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { brands } from "@/lib/brands";
import { initialSessionGraph } from "@/lib/seed";

const useSessionMock = vi.fn();
const push = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ push }),
}));
vi.mock("./session-provider", () => ({ useSession: () => useSessionMock() }));

import { AppShell } from "./app-shell";

function sessionFor(actor: string, setActor = vi.fn()) {
  useSessionMock.mockReturnValue({
    graph: initialSessionGraph,
    brand: brands.cdw,
    viewer: { actor, name: "Someone", org: "Org" },
    setActor,
    hydrated: true,
  });
  return setActor;
}

function shellMarkup(actor: string) {
  sessionFor(actor);
  return renderToStaticMarkup(<AppShell><p>body</p></AppShell>);
}

describe("app shell navigation", () => {
  beforeEach(() => push.mockReset());

  it("limits the customer rail to this engagement", () => {
    const markup = shellMarkup("customer");
    expect(markup).toContain('href="/customer"');
    expect(markup).not.toMatch(/href="\/"(?=[\s>])/);
    expect(markup).toContain('href="/scope"');
    expect(markup).toContain('href="/funding"');
    expect(markup).toContain("Your engagement");
    expect(markup).toContain("Dana Reyes · customer");
    expect(markup).not.toContain('href="/telemetry"');
    expect(markup).not.toContain('href="/sessions"');
    expect(markup).not.toContain("My sessions");
    expect(markup).not.toContain("Programs");
    expect(markup).not.toContain("Support");
    expect(markup).not.toContain("Telemetry");
  });

  it("keeps the partner and PDM rails and breadcrumbs", () => {
    for (const actor of ["partner", "pdm"]) {
      const markup = shellMarkup(actor);
      expect(markup).toContain('href="/"');
      expect(markup).toContain('href="/sessions"');
      expect(markup).toContain("My sessions");
      expect(markup).toContain('href="/telemetry"');
      expect(markup).toContain("Programs");
      expect(markup).toContain("Support");
      expect(markup).toContain("Partner network");
      expect(markup).not.toContain("Your engagement");
    }
  });

  it("routes the dropdown to the customer home or my sessions", () => {
    const setActor = sessionFor("partner");
    const view = render(<AppShell><p>body</p></AppShell>);
    fireEvent.change(view.getByLabelText("Viewing as"), { target: { value: "customer" } });
    expect(setActor).toHaveBeenCalledWith("customer");
    expect(push).toHaveBeenCalledWith("/customer");

    push.mockClear();
    const setPartner = sessionFor("customer");
    view.rerender(<AppShell><p>body</p></AppShell>);
    fireEvent.change(view.getByLabelText("Viewing as"), { target: { value: "partner" } });
    expect(setPartner).toHaveBeenCalledWith("partner");
    expect(push).toHaveBeenCalledWith("/sessions");

    push.mockClear();
    fireEvent.change(view.getByLabelText("Viewing as"), { target: { value: "pdm" } });
    expect(push).toHaveBeenLastCalledWith("/sessions");
  });

  it("labels an unnamed customer as Customer", () => {
    useSessionMock.mockReturnValue({
      graph: {
        ...initialSessionGraph,
        session: { ...initialSessionGraph.session, scopeMode: "cold", customerName: "" },
        coldAttendees: [],
        attendees: [],
      },
      brand: brands.cdw,
      viewer: { actor: "partner", name: "Ravi Menon", org: "CDW" },
      setActor: vi.fn(),
      hydrated: true,
    });
    const markup = renderToStaticMarkup(<AppShell><p>body</p></AppShell>);
    expect(markup).toContain(">Customer<");
    expect(markup).not.toContain("Dana Reyes · customer");
  });
});
