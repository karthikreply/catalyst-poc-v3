"use client";

import { createContext, useContext, useEffect, useState } from "react";

import { brands, type Brand, type BrandId } from "@/lib/brands";
import { freezeLedger } from "@/lib/cost-model";
import {
  initialSessionGraph,
  type Actor,
  type Capture,
  type CloseStyle,
  type ColdAttendee,
  type ColdCompany,
  type Delivery,
  type Mechanic,
  type SessionGraph,
} from "@/lib/seed";
import {
  applyClaimsVolumeChoice,
  applyCloseStyle,
  applyColdScope,
  applyDeliveryMode,
  applyExactClaimsVolume,
  applyFundingRoute,
  applyMechanic,
  applyPatternChoice,
  applyReusePriorPilotSpec,
  bindAnnualValue,
  bookHackathon as bookHackathonInGraph,
  graphForActor,
  hydrateSessionGraph,
  isSessionReadOnly,
  lockRanking as lockRankingInGraph,
  moveSolution as moveSolutionInGraph,
  restoreSeededGraph,
  savePartnerNote as savePartnerNoteInGraph,
  saveSessionOutcome as saveSessionOutcomeInGraph,
  unlockRanking as unlockRankingInGraph,
  updateCapture as updateCaptureInGraph,
  updateValueConfirmer as updateValueConfirmerInGraph,
  viewerForActor,
  type ClaimsVolumeChoice,
  type FundingRoute,
  type Viewer,
} from "@/lib/session";
import type { HackathonBooking } from "@/lib/seed";

type SessionContextValue = {
  graph: SessionGraph;
  brandId: BrandId;
  brand: Brand;
  viewer: Viewer;
  setBrandId: (id: BrandId) => void;
  setActor: (actor: Actor) => void;
  setDelivery: (delivery: Delivery) => void;
  setMechanic: (mechanic: Mechanic) => void;
  setCloseStyle: (closeStyle: CloseStyle) => void;
  updateValue: (id: string, quantity: number | null) => void;
  updateValueConfirmer: (inputId: string, confirmer: string | null) => void;
  updateCostInput: (componentId: string, inputLabel: string, quantity: number | null) => void;
  freezeLedgerNow: () => void;
  addCapture: (capture: Omit<Capture, "id" | "sessionId" | "capturedAt">) => void;
  updateCapture: (captureId: string, update: { attributedTo: string; text: string }) => void;
  saveSessionOutcome: (update: { useCase: string; constraint: string; nextStep: string }) => void;
  setActiveStep: (stepId: string) => void;
  applyClaimsChoice: (choice: ClaimsVolumeChoice) => void;
  applyExactClaims: (quantity: number | null) => void;
  applyFunding: (route: FundingRoute) => void;
  applyPattern: (patternId: string) => void;
  applyReusePilot: (reuse: boolean) => void;
  setCustomerProfile: (profile: { name?: string; context?: string }) => void;
  setColdScope: (company: ColdCompany, attendees: ColdAttendee[]) => void;
  restoreSeededScope: () => void;
  savePartnerNote: (noteId: string | null, text: string) => void;
  moveSolution: (solutionId: string, direction: "up" | "down") => void;
  lockRanking: () => void;
  unlockRanking: () => void;
  bookHackathon: (draft: Omit<HackathonBooking, "booked">) => void;
  canEditSession: boolean;
};

const SessionContext = createContext<SessionContextValue | null>(null);
const GRAPH_KEY = "catalyst-session-graph-v4";
const BRAND_KEY = "catalyst-brand";
const ACTOR_KEY = "catalyst-viewer-actor";
const SEEDED_GRAPH_KEY = "catalyst-seeded-graph-v4";
const SUPERSEDED_KEYS = [
  "catalyst-session-graph",
  "catalyst-seeded-graph",
  "catalyst-session-graph-v2",
  "catalyst-seeded-graph-v2",
  "catalyst-session-graph-v3",
  "catalyst-seeded-graph-v3",
];

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [graph, setGraph] = useState<SessionGraph>(initialSessionGraph);
  const [brandId, setBrandIdState] = useState<BrandId>("cdw");
  const [actor, setActorState] = useState<Actor>("partner");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (hydrated) return;
    SUPERSEDED_KEYS.forEach((key) => localStorage.removeItem(key));
    const savedGraph = localStorage.getItem(GRAPH_KEY);
    const savedBrand = localStorage.getItem(BRAND_KEY) as BrandId | null;
    const savedActor = sessionStorage.getItem(ACTOR_KEY) as Actor | null;
    const frame = requestAnimationFrame(() => {
      if (savedGraph) {
        try {
          const savedViewer = savedActor === "pdm" || savedActor === "partner" || savedActor === "cpm"
            ? savedActor
            : "partner";
          setGraph(graphForActor(hydrateSessionGraph(JSON.parse(savedGraph) as SessionGraph), savedViewer));
        } catch {
          localStorage.removeItem(GRAPH_KEY);
        }
      }
      if (savedBrand && brands[savedBrand]) setBrandIdState(savedBrand);
      if (savedActor === "pdm" || savedActor === "partner" || savedActor === "cpm") {
        setActorState(savedActor);
      }
      setHydrated(true);
    });
    return () => cancelAnimationFrame(frame);
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(GRAPH_KEY, JSON.stringify(graph));
  }, [graph, hydrated]);

  const brand = brands[brandId];
  const viewer = viewerForActor(actor, brand);
  const canEditSession = !isSessionReadOnly(actor);

  function setBrandId(id: BrandId) {
    setBrandIdState(id);
    localStorage.setItem(BRAND_KEY, id);
    setGraph((current) => ({ ...current, session: { ...current.session, partnerId: id } }));
  }

  function setActor(next: Actor) {
    setActorState(next);
    sessionStorage.setItem(ACTOR_KEY, next);
    setGraph((current) => graphForActor(current, next));
  }

  function setDelivery(delivery: Delivery) {
    if (!canEditSession) return;
    setGraph((current) => applyDeliveryMode(current, delivery));
  }

  function setMechanic(mechanic: Mechanic) {
    if (!canEditSession) return;
    setGraph((current) => applyMechanic(current, mechanic));
  }

  function setCloseStyle(closeStyle: CloseStyle) {
    if (!canEditSession) return;
    setGraph((current) => applyCloseStyle(current, closeStyle));
  }

  function updateValue(id: string, quantity: number | null) {
    if (!canEditSession || (quantity !== null && (!Number.isFinite(quantity) || quantity < 0))) return;
    setGraph((current) => {
      const valueInputs = current.valueInputs.map((input) => (input.id === id ? { ...input, quantity } : input));
      const next = { ...current, valueInputs };
      if (current.session.mechanic !== "value-sprint") return next;
      return bindAnnualValue(next);
    });
  }

  function updateValueConfirmer(inputId: string, confirmer: string | null) {
    if (!canEditSession) return;
    setGraph((current) => updateValueConfirmerInGraph(current, inputId, confirmer));
  }

  function updateCostInput(componentId: string, inputLabel: string, quantity: number | null) {
    if (!canEditSession || (quantity !== null && (!Number.isFinite(quantity) || quantity < 0))) return;
    setGraph((current) => ({
      ...current,
      costComponents: current.costComponents.map((component) =>
        component.id === componentId
          ? {
              ...component,
              inputs: component.inputs.map((input) => (input.label === inputLabel ? { ...input, quantity } : input)),
            }
          : component,
      ),
    }));
  }

  function freezeLedgerNow() {
    if (!canEditSession) return;
    setGraph((current) => freezeLedger(current));
  }

  function addCapture(capture: Omit<Capture, "id" | "sessionId" | "capturedAt">) {
    if (!canEditSession) return;
    setGraph((current) => ({
      ...current,
      captures: [
        ...current.captures,
        {
          ...capture,
          id: `capture-${Date.now()}`,
          sessionId: current.session.id,
          capturedAt: new Date().toISOString(),
        },
      ],
    }));
  }

  function updateCapture(captureId: string, update: { attributedTo: string; text: string }) {
    if (!canEditSession) return;
    setGraph((current) => updateCaptureInGraph(current, captureId, update));
  }

  function saveSessionOutcome(update: { useCase: string; constraint: string; nextStep: string }) {
    if (!canEditSession) return;
    setGraph((current) => saveSessionOutcomeInGraph(current, update));
  }

  function setActiveStep(stepId: string) {
    if (!canEditSession) return;
    setGraph((current) => ({
      ...current,
      agenda: current.agenda.map((step) => ({
        ...step,
        state: step.id === stepId ? "active" : step.order < (current.agenda.find((item) => item.id === stepId)?.order ?? 1) ? "done" : "upcoming",
      })),
    }));
  }

  function applyClaimsChoice(choice: ClaimsVolumeChoice) {
    if (!canEditSession) return;
    setGraph((current) => applyClaimsVolumeChoice(current, choice));
  }

  function applyExactClaims(quantity: number | null) {
    if (!canEditSession) return;
    setGraph((current) => (
      current.session.claimsVolumeChoice === "exact"
        ? applyExactClaimsVolume(current, quantity)
        : current
    ));
  }

  function applyFunding(route: FundingRoute) {
    if (!canEditSession) return;
    setGraph((current) => applyFundingRoute(current, route));
  }

  function applyPattern(patternId: string) {
    if (!canEditSession) return;
    setGraph((current) => applyPatternChoice(current, patternId));
  }

  function applyReusePilot(reuse: boolean) {
    if (!canEditSession) return;
    setGraph((current) => applyReusePriorPilotSpec(current, reuse));
  }

  function setCustomerProfile({ name, context }: { name?: string; context?: string }) {
    if (!canEditSession) return;
    setGraph((current) => ({
      ...current,
      session: {
        ...current.session,
        customerName: name ?? current.session.customerName,
        customerContext: context ?? current.session.customerContext,
      },
    }));
  }

  function setColdScope(company: ColdCompany, attendees: ColdAttendee[]) {
    if (!canEditSession) return;
    setGraph((current) => {
      if (current.session.scopeMode === "seeded") {
        localStorage.setItem(SEEDED_GRAPH_KEY, JSON.stringify(current));
      }
      return applyColdScope(current, company, attendees);
    });
  }

  function restoreSeededScope() {
    if (!canEditSession) return;
    const saved = localStorage.getItem(SEEDED_GRAPH_KEY);
    let parsed: SessionGraph | null = null;
    if (saved) {
      try {
        parsed = JSON.parse(saved) as SessionGraph;
      } catch {
        localStorage.removeItem(SEEDED_GRAPH_KEY);
      }
    }
    setGraph(restoreSeededGraph(parsed));
  }

  function savePartnerNote(noteId: string | null, text: string) {
    if (!canEditSession) return;
    setGraph((current) => savePartnerNoteInGraph(current, {
      id: noteId ?? `partner-note-${Date.now()}`,
      author: viewer.name,
      text: text.trim(),
      updatedAt: new Date().toISOString(),
    }));
  }

  function moveSolution(solutionId: string, direction: "up" | "down") {
    if (!canEditSession) return;
    setGraph((current) => moveSolutionInGraph(current, solutionId, direction));
  }

  function lockRanking() {
    if (!canEditSession) return;
    setGraph((current) => lockRankingInGraph(current));
  }

  function unlockRanking() {
    if (!canEditSession) return;
    setGraph((current) => unlockRankingInGraph(current));
  }

  function bookHackathon(draft: Omit<HackathonBooking, "booked">) {
    if (!canEditSession) return;
    setGraph((current) => bookHackathonInGraph(current, draft));
  }

  const value = {
    graph,
    brandId,
    brand,
    viewer,
    setBrandId,
    setActor,
    setDelivery,
    setMechanic,
    setCloseStyle,
    updateValue,
    updateValueConfirmer,
    updateCostInput,
    freezeLedgerNow,
    addCapture,
    updateCapture,
    saveSessionOutcome,
    setActiveStep,
    applyClaimsChoice,
    applyExactClaims,
    applyFunding,
    applyPattern,
    applyReusePilot,
    setCustomerProfile,
    setColdScope,
    restoreSeededScope,
    savePartnerNote,
    moveSolution,
    lockRanking,
    unlockRanking,
    bookHackathon,
    canEditSession,
  };

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error("useSession must be used inside SessionProvider");
  return context;
}