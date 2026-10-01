// @vitest-environment jsdom
import { useState } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { pilotReadinessItems } from "@/lib/pilot-readiness";
import { sampleClaims } from "@/lib/sample-claims";
import { initialSessionGraph, type Actor, type SessionGraph } from "@/lib/seed";
import {
  applyDeliveryMode,
  bookHackathon,
  lockRanking,
  markSampleClaim,
  moveSolution,
  rankedSolutions,
  setSamplePosition,
  startOverSampleRun,
  startSampleRun,
  toggleSelected,
} from "@/lib/session";

const useSessionMock = vi.fn();

vi.mock("@/components/session-provider", () => ({
  useSession: () => useSessionMock(),
}));

import TryPage from "./page";

const at = "2026-10-01T12:00:00.000Z";

function lockExtraction(graph = initialSessionGraph) {
  const ids = rankedSolutions(graph).map((solution) => solution.id).slice(0, 3);
  return lockRanking(ids.reduce((current, id) => toggleSelected(current, id), graph));
}

function sessionValue(graph: SessionGraph, actor: Actor) {
  const name = actor === "pdm" ? "Priya Raghavan" : actor === "partner" ? "Ravi Menon" : "Dana Reyes";
  return {
    graph,
    viewer: { actor, name, org: "CDW" },
    startSampleRun: vi.fn(),
    markSampleClaim: vi.fn(),
    setSamplePosition: vi.fn(),
    startOverSampleRun: vi.fn(),
  };
}

function Harness({ initial, actor = "partner" }: { initial: SessionGraph; actor?: Actor }) {
  const [graph, setGraph] = useState(initial);
  const name = actor === "pdm" ? "Priya Raghavan" : actor === "partner" ? "Ravi Menon" : "Dana Reyes";
  useSessionMock.mockReturnValue({
    graph,
    viewer: { actor, name, org: "CDW" },
    startSampleRun: () => setGraph((current) => startSampleRun(current, actor, name, at)),
    markSampleClaim: (claimId: string, verdict: "right" | "fix", fields: string[], advance = true) => {
      setGraph((current) => markSampleClaim(current, actor, claimId, verdict, fields, name, at, advance));
    },
    setSamplePosition: (position: number) => setGraph((current) => setSamplePosition(current, actor, position)),
    startOverSampleRun: () => setGraph((current) => startOverSampleRun(current, actor)),
  });
  return <TryPage />;
}

describe("Try it", () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("runs the sample, marks claims, and starts over in place", () => {
    vi.useFakeTimers();
    render(<Harness initial={lockExtraction()} />);

    expect(screen.getByRole("heading", { name: "Try it on eight sample claims" })).toBeTruthy();
    expect(screen.getByText("About three minutes. Nothing here is measured, and none of it goes into your business case.")).toBeTruthy();
    expect(screen.getByText(/Each claim is read, and you say whether it came back right/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Book the hackathon" }).getAttribute("href")).toBe("/artifact");
    expect(screen.getByText("Illustrative run on made-up claims. The real hackathon uses your own documents.")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Run on the sample claims" }));
    expect(screen.getByRole("heading", { name: "Reading eight claims…" })).toBeTruthy();
    act(() => {
      vi.advanceTimersByTime(1500);
    });

    expect(screen.getByRole("heading", { name: "Claim 1 of 8" })).toBeTruthy();
    expect(screen.getByText("0 of 8 reviewed")).toBeTruthy();
    expect(screen.getAllByText("Marcus Webb").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "Looks right" }));
    expect(screen.getByRole("heading", { name: "Claim 2 of 8" })).toBeTruthy();
    expect(screen.getByText("1 of 8 reviewed")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Needs a fix" }));
    expect(screen.getByRole("heading", { name: "Claim 2 of 8" })).toBeTruthy();
    expect(screen.getByText(/Which field\?/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Date of loss" }));
    expect(screen.getByRole("button", { name: "Date of loss" }).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Skip if you're not sure" }));
    expect(screen.getByRole("heading", { name: "Claim 3 of 8" })).toBeTruthy();
    expect(screen.getByText("Handwritten margin note")).toBeTruthy();
    expect(screen.getByText("date of loss 12 Jan, not 21")).toBeTruthy();
    expect(screen.getByText("2 of 8 reviewed")).toBeTruthy();

    for (let step = 0; step < 6; step += 1) {
      fireEvent.click(screen.getByRole("button", { name: "Looks right" }));
    }

    expect(screen.getByRole("heading", { name: "7 of 8 look right" })).toBeTruthy();
    expect(screen.getByText("1 need a fix.")).toBeTruthy();
    expect(screen.getByText(/handwritten margin note on claim 3/)).toBeTruthy();
    expect(screen.getByText(/Eight made-up claims can't measure accuracy/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Book the hackathon" }).getAttribute("href")).toBe("/artifact");

    fireEvent.click(screen.getByRole("button", { name: "Start over" }));
    expect(screen.getByRole("button", { name: "Confirm start over" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Try it on eight sample claims" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Confirm start over" }));
    expect(screen.getByRole("heading", { name: "Try it on eight sample claims" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Run on the sample claims" })).toBeTruthy();
  });

  it("skips the reading wait when motion is reduced and clears the timer on unmount", () => {
    const matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: String(query).includes("reduce"),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    window.matchMedia = matchMedia;
    render(<Harness initial={lockExtraction()} />);
    fireEvent.click(screen.getByRole("button", { name: "Run on the sample claims" }));
    expect(screen.getByRole("heading", { name: "Claim 1 of 8" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Reading eight claims…" })).toBeNull();
    cleanup();
    Reflect.deleteProperty(window, "matchMedia");

    vi.useFakeTimers();
    const view = render(<Harness initial={lockExtraction()} />);
    fireEvent.click(screen.getByRole("button", { name: "Run on the sample claims" }));
    view.unmount();
    act(() => {
      vi.advanceTimersByTime(2000);
    });
  });

  it("keeps a read-only customer from running or marking, and still shows the book link", () => {
    const locked = lockExtraction();
    useSessionMock.mockReturnValue(sessionValue(locked, "customer"));
    const ready = renderToStaticMarkup(<TryPage />);
    expect(ready).toContain("Try it on eight sample claims");
    expect(ready).not.toContain("Run on the sample claims");
    expect(ready).toContain('href="/artifact"');

    const started = startSampleRun(locked, "partner", "Ravi Menon", at);
    useSessionMock.mockReturnValue(sessionValue(started, "customer"));
    const review = renderToStaticMarkup(<TryPage />);
    expect(review).toContain("Marcus Webb");
    expect(review).toContain("What came back");
    expect(review).not.toContain("Looks right");
    expect(review).not.toContain("Needs a fix");
  });

  it("shows the partner status panel for self-service and google-facilitated sessions", () => {
    const locked = lockExtraction();
    let reviewed = startSampleRun(locked, "partner", "Ravi Menon", at);
    reviewed = markSampleClaim(reviewed, "partner", sampleClaims[2].id, "fix", ["dateOfLoss"], "Ravi Menon", at, false);
    for (const claim of sampleClaims) {
      if (claim.id === sampleClaims[2].id) continue;
      reviewed = markSampleClaim(reviewed, "partner", claim.id, "right", [], "Ravi Menon", at, true);
    }
    useSessionMock.mockReturnValue(sessionValue(applyDeliveryMode(reviewed, "self-service"), "partner"));
    const markup = renderToStaticMarkup(<TryPage />);
    expect(markup).toContain("made-up claims. Not evidence.");
    expect(markup).toContain("Reviewed 8 of 8 · 1 need a fix");
    expect(markup).toContain("Where it broke");
    expect(markup).toContain("Claim 3 · Date of loss");
    for (const item of pilotReadinessItems) expect(markup).toContain(item);
    expect(markup).toContain("Before the real hackathon");
    expect(markup).not.toContain("Handwritten margin note");
    expect(markup).not.toContain("Looks right");
    expect(markup).toContain('href="/artifact"');

    useSessionMock.mockReturnValue(sessionValue(applyDeliveryMode(locked, "google-facilitated"), "partner"));
    const googleLed = renderToStaticMarkup(<TryPage />);
    expect(googleLed).toContain("Not run yet");
    expect(googleLed).not.toContain("Run on the sample claims");
  });

  it("shows the PDM counts without claims or marks", () => {
    const locked = lockExtraction();
    let reviewed = startSampleRun(locked, "partner", "Ravi Menon", at);
    for (const claim of sampleClaims) {
      reviewed = markSampleClaim(reviewed, "partner", claim.id, "right", [], "Ravi Menon", at, true);
    }
    useSessionMock.mockReturnValue(sessionValue(reviewed, "pdm"));
    const markup = renderToStaticMarkup(<TryPage />);
    expect(markup).toContain("Sample runs are partner-held. The platform vendor sees counts in Telemetry.");
    expect(markup).toContain("Reviewed 8 of 8 · 0 need a fix");
    expect(markup).not.toContain("Marcus Webb");
    expect(markup).not.toContain("Tom Reilly");
    expect(markup).not.toContain("Looks right");
    expect(markup).not.toContain("Where it broke");
  });

  it("says a sample run is unavailable for any other rank-1 solution", () => {
    const moved = moveSolution(initialSessionGraph, "sol-intake-extraction", "down");
    useSessionMock.mockReturnValue(sessionValue(lockExtraction(moved), "partner"));
    const markup = renderToStaticMarkup(<TryPage />);
    expect(markup).toContain("A sample run for this solution isn&#x27;t available yet.");
    expect(markup).toContain("The hackathon will start from your own documents.");
    expect(markup).toContain('href="/artifact"');
    expect(markup).not.toContain("Select three solutions first.");
    expect(markup).not.toContain("Run on the sample claims");
    expect(markup).not.toContain("sandbox");
    expect(markup).not.toContain("AI-powered");
  });

  it("opens the summary from Next on the last marked claim and still walks earlier claims", () => {
    let graph = startSampleRun(lockExtraction(), "partner", "Ravi Menon", at);
    for (const claim of sampleClaims.slice(0, 7)) {
      graph = markSampleClaim(graph, "partner", claim.id, "right", [], "Ravi Menon", at, true);
    }
    graph = setSamplePosition(graph, "partner", 7);
    const view = render(<Harness initial={graph} />);

    expect(screen.getByRole("heading", { name: "Claim 8 of 8" })).toBeTruthy();
    expect(screen.getByText("7 of 8 reviewed")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Needs a fix" }));
    fireEvent.click(screen.getByRole("button", { name: "Date of loss" }));
    expect(screen.getByRole("button", { name: "Date of loss" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("heading", { name: "Claim 8 of 8" })).toBeTruthy();
    expect(screen.getByText("8 of 8 reviewed")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByRole("heading", { name: "7 of 8 look right" })).toBeTruthy();
    expect(screen.getByText("1 need a fix.")).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Claim 8 of 8" })).toBeNull();
    expect(screen.getByRole("link", { name: "Book the hackathon" }).getAttribute("href")).toBe("/artifact");

    fireEvent.click(screen.getByRole("button", { name: "Review answers" }));
    expect(screen.getByRole("heading", { name: "Claim 1 of 8" })).toBeTruthy();
    for (let step = 0; step < 6; step += 1) {
      fireEvent.click(screen.getByRole("button", { name: "Next" }));
    }
    expect(screen.getByRole("heading", { name: "Claim 7 of 8" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByRole("heading", { name: "Claim 8 of 8" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "7 of 8 look right" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Looks right" }));
    expect(screen.getByRole("heading", { name: "Claim 8 of 8" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Looks right" }).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByRole("heading", { name: "8 of 8 look right" })).toBeTruthy();
    expect(screen.getByText("0 need a fix.")).toBeTruthy();

    view.unmount();
    cleanup();

    let earlier = startSampleRun(lockExtraction(), "partner", "Ravi Menon", at);
    for (const claim of sampleClaims.slice(0, 6)) {
      earlier = markSampleClaim(earlier, "partner", claim.id, "right", [], "Ravi Menon", at, true);
    }
    earlier = setSamplePosition(earlier, "partner", 6);
    render(<Harness initial={earlier} />);
    expect(screen.getByRole("heading", { name: "Claim 7 of 8" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByRole("heading", { name: "Claim 8 of 8" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: /look right/ })).toBeNull();
  });

  it("previews day two after booking and never offers a book action", () => {
    const draft = {
      date: "2026-10-14",
      googleFacilitator: "Priya Raghavan",
      partnerSpecialist: "Ravi Menon",
      customerOwner: "Dana Reyes",
      question: "Can we prove the three?",
    };
    const booked = bookHackathon(lockExtraction(), draft);
    useSessionMock.mockReturnValue(sessionValue(booked, "partner"));
    const ready = renderToStaticMarkup(<TryPage />);
    expect(ready).toContain("Preview day two on eight sample claims");
    expect(ready).toContain("A preview of day two. Nothing here is measured, and none of it goes into your business case.");
    expect(ready).not.toContain("Book the hackathon");
    expect(ready).toContain("Illustrative run on made-up claims. The real hackathon uses your own documents.");

    let reviewed = startSampleRun(booked, "partner", "Ravi Menon", at);
    for (const claim of sampleClaims) {
      const fix = claim.id === "claim-3";
      reviewed = markSampleClaim(reviewed, "partner", claim.id, fix ? "fix" : "right", fix ? ["dateOfLoss"] : [], "Ravi Menon", at, true);
    }
    useSessionMock.mockReturnValue(sessionValue(reviewed, "customer"));
    const summary = renderToStaticMarkup(<TryPage />);
    expect(summary).toContain("Back to the pilot spec");
    expect(summary).toContain('href="/pilot-spec"');
    expect(summary).toContain("Before the hackathon on 2026-10-14");
    for (const item of pilotReadinessItems) expect(summary).toContain(item);
    expect(summary).not.toContain("Book the hackathon");

    const unavailable = bookHackathon(lockExtraction(moveSolution(initialSessionGraph, "sol-intake-extraction", "down")), draft);
    useSessionMock.mockReturnValue(sessionValue(unavailable, "partner"));
    expect(renderToStaticMarkup(<TryPage />)).not.toContain("Book the hackathon");
  });

  it("explains a disabled book button", () => {
    useSessionMock.mockReturnValue(sessionValue(initialSessionGraph, "pdm"));
    const markup = renderToStaticMarkup(<TryPage />);
    expect(markup).toContain("The partner or customer books the hackathon.");
    expect(markup).not.toContain('href="/artifact"');
    const describedBy = markup.match(/aria-describedby="([^"]+)"/)?.[1];
    expect(describedBy).toBeTruthy();
    expect(markup).toContain(`id="${describedBy}"`);
  });
});
