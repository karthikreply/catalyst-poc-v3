// @vitest-environment jsdom
import { fireEvent, render } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

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
    viewer: { actor, name: "Someone", org: "Org" },
    setActor,
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
    const markup = shellMarkup("cpm");
    expect(markup).toContain('href="/customer"');
    expect(markup).toContain('href="/scope"');
    expect(markup).toContain('href="/funding"');
    expect(markup).toContain("Your engagement");
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
    fireEvent.change(view.getByLabelText("Viewing as"), { target: { value: "cpm" } });
    expect(setActor).toHaveBeenCalledWith("cpm");
    expect(push).toHaveBeenCalledWith("/customer");

    push.mockClear();
    const setPartner = sessionFor("cpm");
    view.rerender(<AppShell><p>body</p></AppShell>);
    fireEvent.change(view.getByLabelText("Viewing as"), { target: { value: "partner" } });
    expect(setPartner).toHaveBeenCalledWith("partner");
    expect(push).toHaveBeenCalledWith("/sessions");

    push.mockClear();
    fireEvent.change(view.getByLabelText("Viewing as"), { target: { value: "pdm" } });
    expect(push).toHaveBeenLastCalledWith("/sessions");
  });
});
