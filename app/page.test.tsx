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

import Home from "./page";

function sessionFor(actor: string, hydrated: boolean) {
  useSessionMock.mockReturnValue({
    viewer: { actor, name: actor === "cpm" ? "Marcus Hale" : "Ravi Menon", org: "Org" },
    setActor: vi.fn(),
    hydrated,
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

    render(<Home />);
    expect(replace).toHaveBeenCalledWith("/customer");
  });

  it("keeps the program tiles for the partner once the viewer is known", () => {
    sessionFor("partner", true);
    const markup = renderToStaticMarkup(<Home />);
    expect(markup).toContain("Funding");
    expect(markup).toContain("Telemetry");
    expect(markup).toContain('href="/telemetry"');
  });

  it("renders nothing before the stored viewer is known", () => {
    sessionFor("partner", false);
    const markup = renderToStaticMarkup(<Home />);
    expect(markup).not.toContain("Telemetry");
    expect(markup).not.toContain("Funding");
  });
});
