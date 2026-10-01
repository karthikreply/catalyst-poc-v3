// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { initialSessionGraph } from "@/lib/seed";
import { applyClaimsVolumeChoice, applyExactClaimsVolume, chooseCustomerFormat, savePartnerNote } from "@/lib/session";

const { useSessionMock } = vi.hoisted(() => ({
  useSessionMock: vi.fn(),
}));

vi.mock("@/components/session-provider", () => ({
  useSession: useSessionMock,
}));

import ScopePage from "./page";

beforeEach(() => {
  useSessionMock.mockReset();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function useInteractiveSession() {
  const [graph, setGraph] = useState(initialSessionGraph);

  return {
    graph,
    brand: { partnerName: "CDW" },
    viewer: { actor: "partner", name: "Ravi Menon", org: "CDW" },
    canEditSession: true,
    applyClaimsChoice: (choice: Parameters<typeof applyClaimsVolumeChoice>[1]) => {
      setGraph((current) => applyClaimsVolumeChoice(current, choice));
    },
    applyExactClaims: (quantity: number | null) => {
      setGraph((current) => applyExactClaimsVolume(current, quantity));
    },
    applyFunding: vi.fn(),
    applyPattern: vi.fn(),
    applyReusePilot: vi.fn(),
    savePartnerNote: vi.fn(),
    setColdScope: vi.fn(),
    restoreSeededScope: vi.fn(),
  };
}

function renderCustomerScope(complete: boolean) {
  const started = chooseCustomerFormat(initialSessionGraph, "value-sprint");
  useSessionMock.mockReturnValue({
    graph: {
      ...started,
      session: {
        ...started.session,
        claimsVolumeChoice: complete ? "about-400" : null,
        fundingRoute: complete ? "invite-karen" : null,
      },
    },
    brand: { partnerName: "CDW" },
    viewer: { actor: "customer", name: "Casey", org: "Customer" },
    canEditSession: true,
    setColdScope: vi.fn(),
    restoreSeededScope: vi.fn(),
  });

  return renderToStaticMarkup(<ScopePage />);
}

function renderAttendingCustomerScope() {
  useSessionMock.mockReturnValue({
    graph: initialSessionGraph,
    brand: { partnerName: "CDW" },
    viewer: { actor: "customer", name: "Casey", org: "Customer" },
    canEditSession: false,
    setColdScope: vi.fn(),
    restoreSeededScope: vi.fn(),
  });

  return renderToStaticMarkup(<ScopePage />);
}

function renderPartnerScope() {
  useSessionMock.mockReturnValue({
    graph: {
      ...initialSessionGraph,
      partnerNotes: [{
        id: "partner-note-1",
        author: "Ravi Menon",
        text: "Claims leadership wants an October review.",
        updatedAt: "2026-09-23T16:00:00.000Z",
      }],
    },
    brand: { partnerName: "CDW" },
    viewer: { actor: "partner", name: "Ravi Menon", org: "CDW" },
    canEditSession: true,
    applyClaimsChoice: vi.fn(),
    applyFunding: vi.fn(),
    applyPattern: vi.fn(),
    applyReusePilot: vi.fn(),
    savePartnerNote: vi.fn(),
    setColdScope: vi.fn(),
    restoreSeededScope: vi.fn(),
  });

  return renderToStaticMarkup(<ScopePage />);
}

describe("customer door Scope", () => {
  it("shows account lookup and keeps plan disabled until cold scope is complete", () => {
    const markup = renderCustomerScope(false);

    expect(markup).toContain("Customer entry");
    expect(markup).toContain("Look up your account");
    expect(markup).toContain("Review session plan");
    expect(markup).toContain("disabled");
    expect(markup).not.toContain('href="/plan"');
    expect(markup).not.toContain("Close date pushed");
  });

  it("does not expose partner CRM edit controls on the customer door", () => {
    const markup = renderCustomerScope(true);

    expect(markup).toContain("Customer entry");
    expect(markup).not.toContain("Start without the record");
    expect(markup).not.toContain("Use account record instead");
    expect(markup).not.toContain("Close date pushed");
  });

  it("shows lookup on a partner-led session opened from the customer door before a format is chosen", () => {
    useSessionMock.mockReturnValue({
      graph: {
        ...initialSessionGraph,
        session: { ...initialSessionGraph.session, customerDoor: true },
      },
      brand: { partnerName: "CDW" },
      viewer: { actor: "customer", name: "Casey", org: "Customer" },
      canEditSession: false,
      setColdScope: vi.fn(),
      restoreSeededScope: vi.fn(),
    });

    const markup = renderToStaticMarkup(<ScopePage />);

    expect(markup).toContain("Customer entry");
    expect(markup).toContain("Look up your account");
    expect(markup).not.toContain("You are attending.");
  });

  it("shows lookup after a format is chosen from the customer door", () => {
    const started = chooseCustomerFormat(
      { ...initialSessionGraph, session: { ...initialSessionGraph.session, customerDoor: true } },
      "value-sprint",
    );
    useSessionMock.mockReturnValue({
      graph: started,
      brand: { partnerName: "CDW" },
      viewer: { actor: "customer", name: "Casey", org: "Customer" },
      canEditSession: true,
      setColdScope: vi.fn(),
      restoreSeededScope: vi.fn(),
    });

    const markup = renderToStaticMarkup(<ScopePage />);

    expect(markup).toContain("Look up your account");
    expect(markup).not.toContain("You are attending.");
    expect(started.session.customerName).toBe("Heartland Mutual Insurance");
    expect(started.session.delivery).toBe("self-service");
  });

  it("shows the account and the known pain, with no lookup, to an attending customer", () => {
    const markup = renderAttendingCustomerScope();

    expect(markup).toContain("You are attending. The pain is already on the account.");
    expect(markup).toContain("Heartland Mutual Insurance");
    expect(markup).toContain("Known pain");
    expect(markup).toContain("Intake sits six days, mostly manual PDF reading.");
    expect(markup).toContain('href="/run"');
    expect(markup).not.toContain("Look up your account");
    expect(markup).not.toContain("Customer entry");
    expect(markup).not.toContain("Company name");
    expect(markup).not.toContain("Close date pushed");
    expect(markup).not.toContain("Start without the record");
  });
});

describe("partner context", () => {
  it("shows one prefilled context field and one save action", () => {
    const markup = renderPartnerScope();

    expect(markup).not.toContain("Look up your account");
    expect(markup).not.toContain("Company name");
    expect(markup).toContain("Partner context");
    expect(markup).toContain("Claims leadership wants an October review.");
    expect(markup).toContain("Save context");
    expect(markup).not.toContain(">Edit<");
    expect(markup).not.toContain("Add partner note");
    expect(markup).not.toContain("Added by");
  });

  it("confirms the save and flags later edits as unsaved", () => {
    useSessionMock.mockImplementation(() => {
      const [graph, setGraph] = useState(initialSessionGraph);

      return {
        graph,
        brand: { partnerName: "CDW" },
        viewer: { actor: "partner", name: "Ravi Menon", org: "CDW" },
        canEditSession: true,
        applyClaimsChoice: vi.fn(),
        applyExactClaims: vi.fn(),
        applyFunding: vi.fn(),
        applyPattern: vi.fn(),
        applyReusePilot: vi.fn(),
        savePartnerNote: (noteId: string | null, text: string) => {
          setGraph((current) => savePartnerNote(current, {
            id: noteId ?? "partner-note-1",
            author: "Ravi Menon",
            text: text.trim(),
            updatedAt: "2026-09-23T16:00:00.000Z",
          }));
        },
        setColdScope: vi.fn(),
        restoreSeededScope: vi.fn(),
      };
    });

    render(<ScopePage />);
    fireEvent.change(screen.getByLabelText("Partner context"), {
      target: { value: "Claims leadership wants an October review." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save context" }));

    expect(screen.getByText(/^Saved/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save context" })).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Partner context"), {
      target: { value: "Claims leadership wants a November review." },
    });

    expect(screen.getByText("Unsaved changes")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save context" })).toBeEnabled();
  });
});

describe("Google PDM scope", () => {
  it("does not ask the PDM to look up the account", () => {
    useSessionMock.mockReturnValue({
      graph: initialSessionGraph,
      brand: { partnerName: "CDW" },
      viewer: { actor: "pdm", name: "Priya Raghavan", org: "Google" },
      canEditSession: true,
      applyClaimsChoice: vi.fn(),
      applyFunding: vi.fn(),
      applyPattern: vi.fn(),
      applyReusePilot: vi.fn(),
      savePartnerNote: vi.fn(),
      setColdScope: vi.fn(),
      restoreSeededScope: vi.fn(),
    });

    const markup = renderToStaticMarkup(<ScopePage />);

    expect(markup).toContain("Scope the value session");
    expect(markup).toContain("Heartland Mutual Insurance");
    expect(markup).not.toContain("Look up your account");
    expect(markup).not.toContain("Company name");
  });
});

describe("exact claims volume", () => {
  it("shows the exact-number field and keeps plan navigation disabled without a valid value", () => {
    useSessionMock.mockReturnValue({
      graph: {
        ...initialSessionGraph,
        session: {
          ...initialSessionGraph.session,
          claimsVolumeChoice: "exact",
          fundingRoute: "invite-karen",
        },
        valueInputs: initialSessionGraph.valueInputs.map((input) =>
          input.id === "claims" ? { ...input, quantity: null } : input,
        ),
      },
      brand: { partnerName: "CDW" },
      viewer: { actor: "partner", name: "Ravi Menon", org: "CDW" },
      canEditSession: true,
      applyClaimsChoice: vi.fn(),
      applyExactClaims: vi.fn(),
      applyFunding: vi.fn(),
      applyPattern: vi.fn(),
      applyReusePilot: vi.fn(),
      savePartnerNote: vi.fn(),
      setColdScope: vi.fn(),
      restoreSeededScope: vi.fn(),
    });

    const markup = renderToStaticMarkup(<ScopePage />);

    expect(markup).toContain("Enter exact number");
    expect(markup).toContain('type="number"');
    expect(markup).not.toContain('aria-label="Exact claims per day"');
    expect(markup).toContain('aria-describedby="exact-claims-guidance"');
    expect(markup).toContain('id="exact-claims-guidance"');
    expect(markup).toContain("Enter a positive whole number of claims.");
    expect(markup).not.toContain('id="exact-claims-guidance" role="status"');
    expect(markup).not.toContain('href="/plan"');
  });

  it("completes Scope when an exact positive whole number and funding route are present", () => {
    useSessionMock.mockReturnValue({
      graph: {
        ...initialSessionGraph,
        session: {
          ...initialSessionGraph.session,
          claimsVolumeChoice: "exact",
          fundingRoute: "invite-karen",
        },
        valueInputs: initialSessionGraph.valueInputs.map((input) =>
          input.id === "claims" ? { ...input, quantity: 275 } : input,
        ),
      },
      brand: { partnerName: "CDW" },
      viewer: { actor: "partner", name: "Ravi Menon", org: "CDW" },
      canEditSession: true,
      applyClaimsChoice: vi.fn(),
      applyExactClaims: vi.fn(),
      applyFunding: vi.fn(),
      applyPattern: vi.fn(),
      applyReusePilot: vi.fn(),
      savePartnerNote: vi.fn(),
      setColdScope: vi.fn(),
      restoreSeededScope: vi.fn(),
    });

    const markup = renderToStaticMarkup(<ScopePage />);

    expect(markup).toContain('value="275"');
    expect(markup).toContain('id="exact-claims-guidance"');
    expect(markup).toContain('href="/plan"');
    expect(markup).toContain("Scope complete.");
  });

  it("selects exact and enters a value without scrolling away from the field", () => {
    const requestAnimationFrame = vi.fn();
    vi.stubGlobal("requestAnimationFrame", requestAnimationFrame);
    useSessionMock.mockImplementation(useInteractiveSession);

    render(<ScopePage />);
    fireEvent.click(screen.getByRole("button", { name: "Enter exact number" }));

    const input = screen.getByRole("spinbutton", { name: "Claims per day" });
    fireEvent.change(input, { target: { value: "275" } });

    expect(input).toHaveValue(275);
    expect(input).toHaveAttribute("aria-invalid", "false");
    expect(screen.getByText("Enter a positive whole number of claims.")).not.toHaveAttribute("role");
    expect(requestAnimationFrame).not.toHaveBeenCalled();
  });
});
