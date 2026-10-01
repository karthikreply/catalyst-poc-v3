import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { brands } from "@/lib/brands";
import { initialSessionGraph } from "@/lib/seed";
import { startSampleRun } from "@/lib/session";

const useSessionMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
}));

vi.mock("@/components/session-provider", () => ({
  useSession: () => useSessionMock(),
}));

import TelemetryPage from "./page";

describe("telemetry sample run column", () => {
  it("shows the sample run column and the booked-after line", () => {
    useSessionMock.mockReturnValue({
      graph: initialSessionGraph,
      brand: brands.cdw,
      viewer: { actor: "partner", name: "Ravi Menon", org: "CDW" },
      hydrated: true,
    });
    const markup = renderToStaticMarkup(<TelemetryPage />);
    expect(markup).toContain("Sample run");
    expect(markup).toMatch(/Booked after a sample run: \d+ of \d+ that ran one/);
    expect(markup).toContain("Yes");
    expect(markup).toContain("—");

    const ran = startSampleRun(initialSessionGraph, "partner", "Ravi Menon", "2026-10-01T00:00:00.000Z");
    useSessionMock.mockReturnValue({
      graph: ran,
      brand: brands.cdw,
      viewer: { actor: "partner", name: "Ravi Menon", org: "CDW" },
      hydrated: true,
    });
    const live = renderToStaticMarkup(<TelemetryPage />);
    expect(live).toContain("Yes");
  });
});
