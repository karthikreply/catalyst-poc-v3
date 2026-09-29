// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { initialSessionGraph } from "@/lib/seed";
import { applyDeliveryMode } from "@/lib/session";

import { SessionProvider, useSession } from "./session-provider";

function SessionActionsProbe() {
  const {
    graph,
    viewer,
    savePartnerNote,
    updateValueConfirmer,
    applyClaimsChoice,
    applyExactClaims,
    setActiveStep,
    updateValue,
    canEditSession,
  } = useSession();
  const claims = graph.valueInputs.find((input) => input.id === "claims");
  const handling = graph.costComponents.find((component) => component.id === "handling");
  const activeStep = graph.agenda.find((step) => step.state === "active");

  return (
    <>
      <output aria-label="actor">{viewer.actor}</output>
      <output aria-label="can-edit">{String(canEditSession)}</output>
      <output aria-label="active-step">{activeStep?.id ?? "none"}</output>
      <button type="button" onClick={() => setActiveStep("shape-the-pilot")}>Go to shape</button>
      <button type="button" onClick={() => updateValue("claims", 275)}>Set claims 275</button>
      <output aria-label="partner-note-count">{graph.partnerNotes.length}</output>
      <output aria-label="claims-confirmer">{claims?.confirmedBy ?? "none"}</output>
      <output aria-label="claims-respondent-confirmed">{String(claims?.respondentConfirmed)}</output>
      <output aria-label="claims-quantity">{claims?.quantity ?? "none"}</output>
      <output aria-label="handling-confirmer">{handling?.confirmedBy ?? "none"}</output>
      <button type="button" onClick={() => savePartnerNote(null, "Partner context")}>Save note</button>
      <button type="button" onClick={() => updateValueConfirmer("claims", "Alex Chen")}>Update confirmer</button>
      <button type="button" onClick={() => applyClaimsChoice("exact")}>Select exact</button>
      <button type="button" onClick={() => applyExactClaims(275)}>Set exact claims</button>
      <button type="button" onClick={() => applyExactClaims(0)}>Clear invalid exact claims</button>
    </>
  );
}

function renderForActor(actor: "pdm" | "partner" | "cpm", graph = initialSessionGraph) {
  localStorage.setItem("catalyst-session-graph-v4", JSON.stringify(graph));
  sessionStorage.setItem("catalyst-viewer-actor", actor);
  render(
    <SessionProvider>
      <SessionActionsProbe />
    </SessionProvider>,
  );
}

describe("SessionProvider action permissions", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      return window.setTimeout(() => callback(0), 0);
    });
    vi.stubGlobal("cancelAnimationFrame", (handle: number) => window.clearTimeout(handle));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("does not save partner notes or update confirmers for CPM", async () => {
    renderForActor("cpm");
    await waitFor(() => expect(screen.getByLabelText("actor")).toHaveTextContent("cpm"));

    fireEvent.click(screen.getByRole("button", { name: "Save note" }));
    fireEvent.click(screen.getByRole("button", { name: "Update confirmer" }));

    expect(screen.getByLabelText("partner-note-count")).toHaveTextContent("0");
    expect(screen.getByLabelText("claims-confirmer")).toHaveTextContent("Michelle Dorsey");
  });

  it.each(["pdm", "partner"] as const)("allows the editable %s actor to save partner notes and update confirmers", async (actor) => {
    renderForActor(actor);
    await waitFor(() => expect(screen.getByLabelText("actor")).toHaveTextContent(actor));

    fireEvent.click(screen.getByRole("button", { name: "Save note" }));
    fireEvent.click(screen.getByRole("button", { name: "Update confirmer" }));

    expect(screen.getByLabelText("partner-note-count")).toHaveTextContent("1");
    expect(screen.getByLabelText("claims-confirmer")).toHaveTextContent("Alex Chen");
  });

  it("applies only valid exact claims for an editable actor", async () => {
    renderForActor("partner");
    await waitFor(() => expect(screen.getByLabelText("actor")).toHaveTextContent("partner"));

    fireEvent.click(screen.getByRole("button", { name: "Select exact" }));
    expect(screen.getByLabelText("claims-quantity")).toHaveTextContent("none");

    fireEvent.click(screen.getByRole("button", { name: "Set exact claims" }));
    expect(screen.getByLabelText("claims-quantity")).toHaveTextContent("275");
    expect(screen.getByLabelText("claims-confirmer")).toHaveTextContent("none");
    expect(screen.getByLabelText("claims-respondent-confirmed")).toHaveTextContent("false");
    expect(screen.getByLabelText("handling-confirmer")).toHaveTextContent("Michelle Dorsey");

    fireEvent.click(screen.getByRole("button", { name: "Clear invalid exact claims" }));
    expect(screen.getByLabelText("claims-quantity")).toHaveTextContent("none");
  });

  it("moves the agenda for a read-only customer but drops value edits", async () => {
    renderForActor("cpm");
    await waitFor(() => expect(screen.getByLabelText("actor")).toHaveTextContent("cpm"));

    expect(screen.getByLabelText("can-edit")).toHaveTextContent("false");
    fireEvent.click(screen.getByRole("button", { name: "Go to shape" }));
    fireEvent.click(screen.getByRole("button", { name: "Set claims 275" }));

    expect(screen.getByLabelText("active-step")).toHaveTextContent("shape-the-pilot");
    expect(screen.getByLabelText("claims-quantity")).toHaveTextContent("400");
  });

  it("lets a self-service customer edit values", async () => {
    renderForActor("cpm", applyDeliveryMode(initialSessionGraph, "self-service"));
    await waitFor(() => expect(screen.getByLabelText("can-edit")).toHaveTextContent("true"));

    fireEvent.click(screen.getByRole("button", { name: "Set claims 275" }));

    expect(screen.getByLabelText("claims-quantity")).toHaveTextContent("275");
  });

  it("does not apply exact claims for CPM", async () => {
    renderForActor("cpm");
    await waitFor(() => expect(screen.getByLabelText("actor")).toHaveTextContent("cpm"));

    fireEvent.click(screen.getByRole("button", { name: "Select exact" }));
    fireEvent.click(screen.getByRole("button", { name: "Set exact claims" }));

    expect(screen.getByLabelText("claims-quantity")).toHaveTextContent("400");
    expect(screen.getByLabelText("claims-confirmer")).toHaveTextContent("Michelle Dorsey");
    expect(screen.getByLabelText("claims-respondent-confirmed")).toHaveTextContent("true");
  });
});
