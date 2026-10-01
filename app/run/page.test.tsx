// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { initialSessionGraph } from "@/lib/seed";
import { applyColdScope, chooseCustomerFormat, coldScopeDefaults, saveSessionOutcome, updateCapture } from "@/lib/session";

const { useSessionMock } = vi.hoisted(() => ({
  useSessionMock: vi.fn(),
}));

vi.mock("@/components/session-provider", () => ({
  useSession: useSessionMock,
}));

import RunPage from "./page";

const sessionCapture = {
  id: "capture-1758645600000",
  sessionId: initialSessionGraph.session.id,
  stepId: "where-it-hurts",
  attributedTo: "Dana Reyes",
  text: "Board asked for a decision by November.",
  capturedAt: "2026-09-23T16:00:00.000Z",
};

beforeEach(() => {
  useSessionMock.mockReset();
  useSessionMock.mockImplementation(() => {
    const [graph, setGraph] = useState({
      ...initialSessionGraph,
      captures: [...initialSessionGraph.captures, sessionCapture],
    });

    return {
      graph,
      brand: { partnerName: "CDW" },
      viewer: { actor: "partner", name: "Ravi Menon", org: "CDW" },
      canEditSession: true,
      addCapture: vi.fn(),
      updateCapture: (captureId: string, update: { attributedTo: string; text: string }) => {
        setGraph((current) => updateCapture(current, captureId, update));
      },
      saveSessionOutcome: vi.fn(),
      setActiveStep: vi.fn(),
      updateValue: vi.fn(),
      updateValueConfirmer: vi.fn(),
      updateCostInput: vi.fn(),
      freezeLedgerNow: vi.fn(),
    };
  });
});

function mockColdSession() {
  useSessionMock.mockImplementation(() => {
    const [graph, setGraph] = useState(
      applyColdScope(initialSessionGraph, coldScopeDefaults.company, coldScopeDefaults.attendees),
    );

    return {
      graph,
      brand: { partnerName: "CDW" },
      viewer: { actor: "partner", name: "Ravi Menon", org: "CDW" },
      canEditSession: true,
      addCapture: vi.fn(),
      updateCapture: vi.fn(),
      saveSessionOutcome: (update: { useCase: string; constraint: string; nextStep: string }) => {
        setGraph((current) => saveSessionOutcome(current, update));
      },
      setActiveStep: vi.fn(),
      updateValue: vi.fn(),
      updateValueConfirmer: vi.fn(),
      updateCostInput: vi.fn(),
      freezeLedgerNow: vi.fn(),
    };
  });
}

afterEach(cleanup);

describe("what we heard", () => {
  it("shows every capture with an edit action", () => {
    render(<RunPage />);

    expect(screen.getByText("Intake sits six days, mostly manual PDF reading.")).toBeInTheDocument();
    expect(screen.getByText(sessionCapture.text)).toBeInTheDocument();
    expect(screen.getByText("6 captures")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Edit" })).toHaveLength(6);
  });

  it("edits the text and speaker of a capture", () => {
    render(<RunPage />);
    fireEvent.click(screen.getAllByRole("button", { name: "Edit" })[5]);

    fireEvent.change(screen.getByLabelText("Edit capture text"), {
      target: { value: "Board asked for a decision by October." },
    });
    fireEvent.change(screen.getByLabelText("Change attributed speaker"), {
      target: { value: "Michelle Dorsey" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByText("Board asked for a decision by October.")).toBeInTheDocument();
    expect(screen.queryByText(sessionCapture.text)).not.toBeInTheDocument();
    expect(screen.getByText("6 captures")).toBeInTheDocument();
  });

  it("edits a seeded capture", () => {
    render(<RunPage />);
    fireEvent.click(screen.getAllByRole("button", { name: "Edit" })[0]);

    fireEvent.change(screen.getByLabelText("Edit capture text"), {
      target: { value: "Intake sits five days once the backlog clears." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByText("Intake sits five days once the backlog clears.")).toBeInTheDocument();
    expect(screen.queryByText("Intake sits six days, mostly manual PDF reading.")).not.toBeInTheDocument();
  });

  it("discards an edit on cancel", () => {
    render(<RunPage />);
    fireEvent.click(screen.getAllByRole("button", { name: "Edit" })[5]);
    fireEvent.change(screen.getByLabelText("Edit capture text"), { target: { value: "Rewritten." } });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.getByText(sessionCapture.text)).toBeInTheDocument();
    expect(screen.queryByText("Rewritten.")).not.toBeInTheDocument();
  });
});

describe("what the session agreed", () => {
  it("starts empty in a cold session and confirms the save", () => {
    mockColdSession();
    render(<RunPage />);

    const useCase = screen.getByLabelText("Use case");
    expect(useCase).toHaveValue("");
    expect(screen.getByRole("button", { name: "Save outcome" })).toBeDisabled();

    fireEvent.change(useCase, { target: { value: "AI-assisted claims intake extraction" } });
    fireEvent.change(screen.getByLabelText("Constraint"), { target: { value: "Human review on low-confidence fields" } });
    fireEvent.change(screen.getByLabelText("Next step"), { target: { value: "6-week pilot on 500 claims" } });
    expect(screen.getByText("Unsaved changes")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Save outcome" }));

    expect(screen.getByText(/^Saved/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save outcome" })).toBeDisabled();
    expect(screen.getByLabelText("Use case")).toHaveValue("AI-assisted claims intake extraction");
  });

  it("prefills the seeded outcome so it can be edited", () => {
    render(<RunPage />);

    expect(screen.getByLabelText("Use case")).toHaveValue("AI-assisted claims intake extraction");
    expect(screen.getByLabelText("Next step")).toHaveValue("3-day hackathon to scope a six-week pilot");
  });
});

describe("board-slide close", () => {
  it("shows the facilitator sub-prompt on the active closing step", () => {
    useSessionMock.mockReturnValue({
      graph: {
        ...initialSessionGraph,
        session: { ...initialSessionGraph.session, closeStyle: "board-slide" },
        agenda: initialSessionGraph.agenda.map((step) => ({
          ...step,
          state: step.id === "owner-and-ask" ? "active" : "done",
        })),
      },
      brand: { partnerName: "CDW" },
      viewer: { actor: "partner", name: "Ravi Menon", org: "CDW" },
      canEditSession: true,
      addCapture: vi.fn(),
      updateCapture: vi.fn(),
      saveSessionOutcome: vi.fn(),
      setActiveStep: vi.fn(),
      updateValue: vi.fn(),
      updateValueConfirmer: vi.fn(),
      updateCostInput: vi.fn(),
      freezeLedgerNow: vi.fn(),
    });

    render(<RunPage />);

    expect(screen.getByRole("heading", {
      name: "It's March. The pilot worked. Dana, what do you tell your board?",
    })).toBeInTheDocument();
    expect(screen.getByText("Capture the answer verbatim. Their words, not a summary.")).toBeInTheDocument();
  });
});

describe("agenda step navigation", () => {
  function mockAgendaAt(
    stepId: string,
    setActiveStep = vi.fn(),
    extras: { canEditSession?: boolean; viewer?: { actor: string; name: string; org: string } } = {},
  ) {
    useSessionMock.mockReturnValue({
      graph: {
        ...initialSessionGraph,
        agenda: initialSessionGraph.agenda.map((step) => ({
          ...step,
          state: step.id === stepId ? "active" : step.order < (initialSessionGraph.agenda.find((item) => item.id === stepId)?.order ?? 1) ? "done" : "upcoming",
        })),
      },
      brand: { partnerName: "CDW" },
      viewer: extras.viewer ?? { actor: "partner", name: "Ravi Menon", org: "CDW" },
      canEditSession: extras.canEditSession ?? true,
      addCapture: vi.fn(),
      updateCapture: vi.fn(),
      saveSessionOutcome: vi.fn(),
      setActiveStep,
      updateValue: vi.fn(),
      updateValueConfirmer: vi.fn(),
      updateCostInput: vi.fn(),
      freezeLedgerNow: vi.fn(),
    });
    return setActiveStep;
  }

  it("continues to the next agenda step from the main panel", () => {
    const setActiveStep = mockAgendaAt("constraints");
    render(<RunPage />);

    expect(screen.getByRole("link", { name: "Skip to rank" })).toHaveAttribute("href", "/rank");
    expect(screen.getByText(/Step 3 of 5/)).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: /Continue to Shape the pilot/i })[0]);

    expect(setActiveStep).toHaveBeenCalledWith("shape-the-pilot");
  });

  it("goes back to the previous agenda step", () => {
    const setActiveStep = mockAgendaAt("constraints");
    render(<RunPage />);

    fireEvent.click(screen.getAllByRole("button", { name: /Back to Volume and cost/i })[0]);

    expect(setActiveStep).toHaveBeenCalledWith("volume-and-cost");
  });

  it("still moves the agenda on a read-only session", () => {
    const setActiveStep = mockAgendaAt("constraints", vi.fn(), {
      canEditSession: false,
      viewer: { actor: "customer", name: "Dana Reyes", org: "Platform vendor" },
    });
    render(<RunPage />);

    expect(screen.getByText(/Historical session record/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Skip to rank" })).toHaveAttribute("href", "/rank");
    fireEvent.click(screen.getAllByRole("button", { name: /Continue to Shape the pilot/i })[0]);
    fireEvent.click(screen.getAllByRole("button", { name: /Back to Volume and cost/i })[0]);

    expect(setActiveStep).toHaveBeenCalledWith("shape-the-pilot");
    expect(setActiveStep).toHaveBeenCalledWith("volume-and-cost");
    expect(screen.queryByRole("button", { name: "Add capture" })).not.toBeInTheDocument();
  });

  it("shows one continue and no partner confirmer controls for a customer value step", () => {
    const started = chooseCustomerFormat(initialSessionGraph, "value-sprint");
    const graph = applyColdScope(started, coldScopeDefaults.company, coldScopeDefaults.attendees);
    useSessionMock.mockReturnValue({
      graph,
      brand: { partnerName: "CDW" },
      viewer: { actor: "customer", name: "Dana Reyes", org: "Platform vendor" },
      canEditSession: true,
      addCapture: vi.fn(),
      updateCapture: vi.fn(),
      saveSessionOutcome: vi.fn(),
      setActiveStep: vi.fn(),
      updateValue: vi.fn(),
      updateValueConfirmer: vi.fn(),
      updateCostInput: vi.fn(),
      freezeLedgerNow: vi.fn(),
    });
    render(<RunPage />);

    expect(screen.getByRole("heading", { name: "Walk me through what happens when a claim arrives." })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Continue to Volume and cost/i })).toHaveLength(1);
    expect(screen.queryByText(/not facilitator-verified/)).not.toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: /Confirmer for/i })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Claims per day")).toBeInTheDocument();
    expect(screen.getByLabelText("Avoidable delay")).toBeInTheDocument();
    expect(screen.getByLabelText("Handling cost")).toBeInTheDocument();
  });

  it("keeps partner confirmer controls and repeated continue actions on a self-service value step", () => {
    const started = chooseCustomerFormat(initialSessionGraph, "value-sprint");
    const graph = applyColdScope(started, coldScopeDefaults.company, coldScopeDefaults.attendees);
    useSessionMock.mockReturnValue({
      graph,
      brand: { partnerName: "CDW" },
      viewer: { actor: "partner", name: "Ravi Menon", org: "CDW" },
      canEditSession: true,
      addCapture: vi.fn(),
      updateCapture: vi.fn(),
      saveSessionOutcome: vi.fn(),
      setActiveStep: vi.fn(),
      updateValue: vi.fn(),
      updateValueConfirmer: vi.fn(),
      updateCostInput: vi.fn(),
      freezeLedgerNow: vi.fn(),
    });
    render(<RunPage />);

    expect(screen.getAllByRole("button", { name: /Continue to Volume and cost/i }).length).toBeGreaterThan(1);
    expect(screen.getByRole("combobox", { name: "Confirmer for Claims per day" })).toBeInTheDocument();
    expect(screen.getAllByText(/not facilitator-verified/).length).toBeGreaterThan(0);
    expect(screen.getByLabelText("Claims per day")).toBeInTheDocument();
  });

  it("shows the self-service line, not the historical banner, for an editable customer", () => {
    useSessionMock.mockReturnValue({
      graph: {
        ...initialSessionGraph,
        session: { ...initialSessionGraph.session, delivery: "self-service" },
      },
      brand: { partnerName: "CDW" },
      viewer: { actor: "customer", name: "Dana Reyes", org: "Platform vendor" },
      canEditSession: true,
      addCapture: vi.fn(),
      updateCapture: vi.fn(),
      saveSessionOutcome: vi.fn(),
      setActiveStep: vi.fn(),
      updateValue: vi.fn(),
      updateValueConfirmer: vi.fn(),
      updateCostInput: vi.fn(),
      freezeLedgerNow: vi.fn(),
    });
    render(<RunPage />);

    expect(screen.getByText(/Customer self-service/)).toBeInTheDocument();
    expect(screen.queryByText(/Historical session record/)).not.toBeInTheDocument();
    expect(screen.queryByText(/editing remains partner-owned/)).not.toBeInTheDocument();
  });

  it("offers Rank solutions on the last step instead of Continue", () => {
    mockAgendaAt("owner-and-ask");
    render(<RunPage />);

    expect(screen.queryByRole("link", { name: "Skip to rank" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Continue to/i })).not.toBeInTheDocument();
    const rankLinks = screen.getAllByRole("link", { name: /Rank solutions/i });
    expect(rankLinks.length).toBeGreaterThan(0);
    expect(rankLinks[0]).toHaveAttribute("href", "/rank");
    expect(screen.getAllByRole("button", { name: /Back to Shape the pilot/i }).length).toBeGreaterThan(0);
  });
});

describe("handoff controls", () => {
  function mockStep(
    stepId: string,
    viewer = { actor: "partner", name: "Ravi Menon", org: "CDW" },
    recordHandoff = vi.fn(),
  ) {
    useSessionMock.mockReturnValue({
      graph: {
        ...initialSessionGraph,
        agenda: initialSessionGraph.agenda.map((step) => ({
          ...step,
          state: step.id === stepId ? "active" : step.order < (initialSessionGraph.agenda.find((item) => item.id === stepId)?.order ?? 1) ? "done" : "upcoming",
        })),
      },
      brand: { partnerName: "CDW" },
      viewer,
      canEditSession: viewer.actor !== "customer",
      addCapture: vi.fn(),
      updateCapture: vi.fn(),
      saveSessionOutcome: vi.fn(),
      setActiveStep: vi.fn(),
      updateValue: vi.fn(),
      updateValueConfirmer: vi.fn(),
      updateCostInput: vi.fn(),
      freezeLedgerNow: vi.fn(),
      recordHandoff,
    });
    return recordHandoff;
  }

  it("shows the three controls to the partner on Owner and ask and records the choice", () => {
    const recordHandoff = mockStep("owner-and-ask");
    render(<RunPage />);

    expect(screen.getByText("Not yet handed off")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Prepare the DAF claim/i })).toHaveAttribute("href", "/funding");
    fireEvent.click(screen.getByRole("button", { name: "File the pilot" }));
    expect(recordHandoff).toHaveBeenCalledWith("pilot");
    fireEvent.click(screen.getByRole("button", { name: "Notify the PDM" }));
    expect(recordHandoff).toHaveBeenCalledWith("pdm-notified");
    fireEvent.click(screen.getByRole("link", { name: /Prepare the DAF claim/i }));
    expect(recordHandoff).toHaveBeenCalledWith("daf");
  });

  it("hides the controls on earlier steps", () => {
    mockStep("constraints");
    render(<RunPage />);

    expect(screen.queryByRole("button", { name: "File the pilot" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Prepare the DAF claim/i })).not.toBeInTheDocument();
  });

  it.each([
    { actor: "customer", name: "Dana Reyes", org: "Platform vendor" },
    { actor: "pdm", name: "Priya Raghavan", org: "Google" },
  ])("never shows the controls to the $actor", (viewer) => {
    mockStep("owner-and-ask", viewer);
    render(<RunPage />);

    expect(screen.queryByRole("button", { name: "File the pilot" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Notify the PDM" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Prepare the DAF claim/i })).not.toBeInTheDocument();
  });
});
