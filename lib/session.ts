import type { Brand } from "./brands";
import { ledgerAnnualTotal } from "./cost-model";
import {
  heartlandSolutions,
  initialSessionGraph,
  type HackathonBooking,
  patterns,
  prework,
  type Actor,
  type CloseStyle,
  type ColdAttendee,
  type ColdCompany,
  type Delivery,
  type Mechanic,
  type PartnerNote,
  type SessionGraph,
  type SolutionCandidate,
} from "./seed";
import { calculateAnnualValue, calculateDailyValue, formatCurrency, formatPreciseCurrency } from "./value";

export type Viewer = { actor: Actor; name: string; org: string };
export type ClaimsVolumeChoice = "about-400" | "range-250-500" | "unconfirmed" | "exact";
export type FundingRoute = "invite-karen" | "brief-dana";

const coldRoleRules = [
  { role: "Operations owner", matches: ["operations", "claims ops", "vp claims", "head of claims"], reason: "Owns the operating outcome and can sponsor the pilot." },
  { role: "Frontline supervisor", matches: ["supervisor", "frontline", "team lead", "claims manager"], reason: "Brings the frontline workflow and handling-cost evidence." },
  { role: "Developer", matches: ["developer", "engineer", "technical lead"], reason: "Can confirm integration constraints and own the pilot." },
  { role: "Compliance", matches: ["compliance", "risk", "audit"], reason: "Sessions that invite compliance late lose two weeks." },
  { role: "Infrastructure", matches: ["infrastructure", "platform", "cloud", "architect"], reason: "Confirms data access, security, and deployment boundaries." },
  { role: "Economic buyer", matches: ["cfo", "finance", "economic buyer", "executive sponsor"], reason: "Can fund the pilot." },
] as const;

function matchedColdRole(role: string) {
  const normalized = role.toLowerCase();
  return coldRoleRules.find((rule) => rule.matches.some((term) => normalized.includes(term)));
}

export function coldRoleMatch(role: string) {
  return matchedColdRole(role)?.role ?? null;
}

const seededSolutionsById = new Map(heartlandSolutions.map((solution) => [solution.id, solution]));

/** Merge product chips from seed when older stored graphs omit them. */
export function withSolutionProducts(solutions: SolutionCandidate[]): SolutionCandidate[] {
  return solutions.map((solution) => {
    const seeded = seededSolutionsById.get(solution.id);
    const products = solution.products?.length ? solution.products : seeded?.products ?? [];
    return {
      ...solution,
      title: solution.title || seeded?.title || solution.id,
      outcome: solution.outcome || seeded?.outcome || "",
      valueAnchor: solution.valueAnchor || seeded?.valueAnchor || "",
      products,
    };
  });
}

export const coldScopeDefaults: { company: ColdCompany; attendees: ColdAttendee[] } = {
  company: { name: "Northwind Insurance", industry: "Insurance", sizeBand: "$500M–$1B" },
  attendees: [
    { name: "Laura Beckett", role: "VP Claims Operations" },
    { name: "Sam Ortiz", role: "Claims Supervisor" },
    { name: "Devin Cole", role: "Senior Developer" },
  ],
};

export function restoreSeededGraph(saved: SessionGraph | null) {
  const hydrated = hydrateSessionGraph(saved);
  return hydrated.session.scopeMode === "seeded" ? hydrated : initialSessionGraph;
}

export function graphForActor(graph: SessionGraph, actor: Actor) {
  return actor === "pdm" && graph.session.scopeMode === "cold"
    ? initialSessionGraph
    : graph;
}

function emptyValueInputs(sessionId: string) {
  return initialSessionGraph.valueInputs.map((input) => ({
    ...input,
    sessionId,
    quantity: null,
    confirmedBy: null,
    respondentConfirmed: false,
  }));
}

function emptyCostComponents() {
  return initialSessionGraph.costComponents.map((component) => ({
    ...component,
    confirmedBy: null,
    inputs: component.inputs.map((input) => ({ ...input, quantity: null })),
  }));
}

function latestPartnerNote(notes: PartnerNote[]) {
  return notes.reduce<PartnerNote | null>((latest, note) => {
    if (!latest) return note;
    const noteTime = Date.parse(note.updatedAt);
    const latestTime = Date.parse(latest.updatedAt);
    if (Number.isNaN(noteTime)) return latest;
    if (Number.isNaN(latestTime) || noteTime > latestTime) return note;
    return latest;
  }, null);
}

export function hydrateSessionGraph(value: SessionGraph | null): SessionGraph {
  if (!value?.session) return initialSessionGraph;
  const cold = value.session.scopeMode === "cold";
  const legacyCold = cold && value.session.id !== "cold-session";
  const sessionId = cold ? "cold-session" : value.session.id;
  const partnerNote = latestPartnerNote(value.partnerNotes ?? []);
  const agenda = legacyCold
    ? (value.agenda ?? initialSessionGraph.agenda).map((step, index) => ({
        ...step,
        sessionId,
        state: index === 0 ? "active" as const : "upcoming" as const,
      }))
    : value.agenda ?? initialSessionGraph.agenda;
  const outcome = legacyCold
    ? {
        ...initialSessionGraph.outcome,
        ...value.outcome,
        sessionId,
        useCase: "",
        annualValue: 0,
        nextStep: "",
        constraint: "",
        partiallyEstimated: true,
      }
    : { ...initialSessionGraph.outcome, ...value.outcome, sessionId };
  return {
    ...initialSessionGraph,
    ...value,
    session: {
      ...initialSessionGraph.session,
      ...value.session,
      id: sessionId,
      reusePriorPilotSpec: value.session.reusePriorPilotSpec ?? (cold ? null : true),
    },
    valueInputs: legacyCold
      ? emptyValueInputs(sessionId)
      : cold && !value.valueInputs?.length
        ? emptyValueInputs(sessionId)
        : value.valueInputs ?? initialSessionGraph.valueInputs,
    costComponents: legacyCold
      ? emptyCostComponents()
      : cold && !value.costComponents?.length
        ? emptyCostComponents()
        : value.costComponents ?? initialSessionGraph.costComponents,
    agenda,
    captures: legacyCold ? [] : value.captures ?? (cold ? [] : initialSessionGraph.captures),
    partnerNotes: partnerNote ? [partnerNote] : [],
    attendees: cold
      ? value.attendees ?? []
      : value.attendees?.length
        ? value.attendees
        : initialSessionGraph.attendees,
    coldCompany: value.coldCompany ?? null,
    coldAttendees: value.coldAttendees ?? [],
    outcome,
    solutions: withSolutionProducts(
      value.solutions?.length ? value.solutions : initialSessionGraph.solutions,
    ),
    ranking: value.ranking?.order?.length
      ? { order: value.ranking.order, locked: Boolean(value.ranking.locked) }
      : initialSessionGraph.ranking,
    hackathon: value.hackathon ?? null,
  };
}

function patternForIndustry(industry: string) {
  const normalized = industry.toLowerCase();
  if (/(bank|financial|fraud)/.test(normalized)) return "fraud-triage";
  if (/(contact|call centre|telecom|retail)/.test(normalized)) return "contact-centre-summarisation";
  if (/(knowledge|professional services)/.test(normalized)) return "knowledge-retrieval";
  return "document-intake";
}

export function applyColdScope(
  graph: SessionGraph,
  company: ColdCompany,
  attendees: ColdAttendee[],
): SessionGraph {
  const enteringCold = graph.session.scopeMode !== "cold";
  const sessionId = "cold-session";
  const solutions = withSolutionProducts(
    graph.solutions.length ? graph.solutions : initialSessionGraph.solutions,
  );
  return {
    ...graph,
    session: {
      ...graph.session,
      id: sessionId,
      scopeMode: "cold",
      customerName: company.name,
      customerContext: `${company.sizeBand} ${company.industry}`,
      industry: company.industry,
      patternId: patternForIndustry(company.industry),
      fundingRoute: enteringCold ? null : graph.session.fundingRoute,
      claimsVolumeChoice: enteringCold ? null : graph.session.claimsVolumeChoice,
      reusePriorPilotSpec: enteringCold ? null : graph.session.reusePriorPilotSpec,
      ledgerFrozen: enteringCold ? false : graph.session.ledgerFrozen,
    },
    coldCompany: company,
    coldAttendees: attendees,
    agenda: enteringCold
      ? graph.agenda.map((step, index) => ({
          ...step,
          sessionId,
          state: index === 0 ? "active" : "upcoming",
        }))
      : graph.agenda,
    captures: enteringCold ? [] : graph.captures,
    partnerNotes: enteringCold ? [] : graph.partnerNotes,
    valueInputs: enteringCold ? emptyValueInputs(sessionId) : graph.valueInputs,
    costComponents: enteringCold ? emptyCostComponents() : graph.costComponents,
    outcome: {
      ...graph.outcome,
      sessionId,
      useCase: enteringCold ? "" : graph.outcome.useCase,
      annualValue: enteringCold ? 0 : graph.outcome.annualValue,
      owner: attendees.find((person) => matchedColdRole(person.role)?.role === "Developer")?.name ?? null,
      nextStep: enteringCold ? "" : graph.outcome.nextStep,
      constraint: enteringCold ? "" : graph.outcome.constraint,
      partiallyEstimated: true,
    },
    attendees: attendees.filter((person) => person.name.trim() && person.role.trim()).map((person, index) => {
      const match = matchedColdRole(person.role);
      return {
        id: `cold-attendee-${index + 1}`,
        name: person.name,
        role: person.role,
        reason: match?.reason ?? "Participant named during cold scope.",
        source: "typed",
        attendance: "attending",
      };
    }),
    solutions,
    ranking: enteringCold
      ? { order: solutions.map((s) => s.id), locked: false }
      : graph.ranking,
    hackathon: enteringCold ? null : graph.hackathon,
  };
}

export function savePartnerNote(graph: SessionGraph, note: PartnerNote): SessionGraph {
  return {
    ...graph,
    partnerNotes: [note],
  };
}

export function saveSessionOutcome(
  graph: SessionGraph,
  update: { useCase: string; constraint: string; nextStep: string },
): SessionGraph {
  return {
    ...graph,
    outcome: {
      ...graph.outcome,
      useCase: update.useCase.trim(),
      constraint: update.constraint.trim(),
      nextStep: update.nextStep.trim(),
    },
  };
}

export function updateCapture(
  graph: SessionGraph,
  captureId: string,
  update: { attributedTo: string; text: string },
): SessionGraph {
  const text = update.text.trim();
  if (!text) return graph;
  return {
    ...graph,
    captures: graph.captures.map((capture) =>
      capture.id === captureId
        ? { ...capture, attributedTo: update.attributedTo, text }
        : capture,
    ),
  };
}

export function missingColdRoles(graph: SessionGraph) {
  if (graph.session.scopeMode !== "cold") return [];
  const pattern = patterns.find((item) => item.id === graph.session.patternId);
  if (!pattern) return [];
  const matched = new Set<string>(
    graph.coldAttendees.flatMap((person) => {
      const role = matchedColdRole(person.role);
      return role ? [role.role] : [];
    }),
  );
  return pattern.requiredRoles
    .filter((role) => !matched.has(role))
    .map((role) => ({
      role,
      reason: coldRoleRules.find((rule) => rule.role === role)?.reason ?? `Add a ${role.toLowerCase()} for this pattern.`,
    }));
}

export function shouldResetGraph(_pathname: string) {
  void _pathname;
  return false;
}

export function isQualified(graph: SessionGraph) {
  return hasCompleteValueInputs(graph) && graph.valueInputs.every((input) => input.respondentConfirmed) && Boolean(graph.outcome.owner);
}

export function hasCompleteValueInputs(graph: SessionGraph) {
  return ["claims", "delay", "handling"].every((id) => {
    const quantity = graph.valueInputs.find((input) => input.id === id)?.quantity;
    return typeof quantity === "number" && Number.isFinite(quantity);
  });
}

export function hasCompleteCostComponents(graph: SessionGraph) {
  return graph.costComponents.length > 0 && graph.costComponents.every((component) =>
    component.inputs.length > 0 && component.inputs.every((input) =>
      typeof input.quantity === "number" && Number.isFinite(input.quantity),
    ),
  );
}

export function applyDeliveryMode(graph: SessionGraph, delivery: Delivery): SessionGraph {
  if (graph.session.delivery === delivery) return graph;

  const valueInputs = graph.valueInputs.map((input) =>
    delivery === "self-service"
      ? { ...input, confirmedBy: null, respondentConfirmed: true }
      : graph.session.scopeMode === "cold"
        ? { ...input, confirmedBy: null }
      : {
          ...input,
          confirmedBy: input.id === "delay" ? "Dana Reyes" : "Michelle Dorsey",
          respondentConfirmed: true,
        },
  );
  const facilitator =
    delivery === "self-service"
      ? null
      : delivery === "google-facilitated"
        ? { name: "Priya Raghavan", title: "Google Partner Development Manager" }
        : { name: "Ravi Menon", title: "Solution Specialist, AI & Data" };
  const next = {
    ...graph,
    session: {
      ...graph.session,
      delivery,
      facilitator,
      qualified: false,
    },
    valueInputs,
  };
  const qualified = delivery === "self-service" ? isQualified(next) : false;
  return bindAnnualValue({
    ...next,
    session: { ...next.session, qualified },
  });
}

export function updateValueConfirmer(
  graph: SessionGraph,
  inputId: string,
  confirmer: string | null,
): SessionGraph {
  return {
    ...graph,
    valueInputs: graph.valueInputs.map((input) =>
      input.id === inputId ? { ...input, confirmedBy: confirmer } : input,
    ),
  };
}

export function applyMechanic(graph: SessionGraph, mechanic: Mechanic): SessionGraph {
  return bindAnnualValue({
    ...graph,
    session: { ...graph.session, mechanic, ledgerFrozen: false },
  });
}

export function applyCloseStyle(graph: SessionGraph, closeStyle: CloseStyle): SessionGraph {
  return {
    ...graph,
    session: { ...graph.session, closeStyle },
  };
}

export function customerSponsor(graph: SessionGraph) {
  return graph.attendees.find((attendee) =>
    attendee.attendance === "attending" && /sponsor/i.test(attendee.reason),
  ) ?? graph.attendees.find((attendee) => attendee.attendance === "attending");
}

export function agendaForSession(graph: SessionGraph) {
  return graph.agenda.map((step) => {
    if (step.id === "volume-and-cost" && graph.session.mechanic === "ghost-ledger") {
      return {
        ...step,
        title: "Build the ledger",
        prompt: "What do tool spend, overtime, rework rate, and review hours cost today?",
      };
    }
    if (step.id === "owner-and-ask" && graph.session.closeStyle === "board-slide") {
      return {
        ...step,
        title: "The board slide",
        prompt: "It's March. The pilot worked. Dana, what do you tell your board?",
        subPrompt: "Capture the answer verbatim. Their words, not a summary.",
      };
    }
    if (step.id === "owner-and-ask" && graph.session.fundingRoute === "brief-dana") {
      return {
        ...step,
        prompt: "Who owns this, and can Dana carry the funding ask to Karen?",
      };
    }
    if (step.id === "owner-and-ask" && graph.session.scopeMode === "cold") {
      return {
        ...step,
        prompt: "Who owns this, and who can fund the pilot?",
      };
    }
    return step;
  });
}

export function preworkForMechanic(mechanic: Mechanic) {
  if (mechanic !== "ghost-ledger") return prework;
  return [
    ...prework,
    "Bring the current tool spend for claims intake.",
    "Bring recent overtime spend tied to intake volume.",
    "Estimate the current rework rate.",
    "Estimate weekly review hours for low-confidence claims.",
  ];
}

export function pdmPartnerInvitationCopy(brand: Brand, customerName = "Heartland Mutual Insurance") {
  return `Hi Ravi,

${customerName} looks ready for a focused value session on an account you own. Run it with the customer team to turn the opportunity into a scoped six-week pilot.

There is partner development funding available if the evidence supports the pilot, and the resulting business case carries ${brand.partnerName}'s brand. You keep the customer relationship and the next step.

Regards,
Priya Raghavan · Platform vendor`;
}

export function viewerForActor(actor: Actor, brand: Brand): Viewer {
  if (actor === "pdm") {
    return { actor, name: "Priya Raghavan", org: "Platform vendor" };
  }
  if (actor === "cpm") {
    return { actor, name: "Marcus Hale", org: "Platform vendor" };
  }
  return { actor, name: "Ravi Menon", org: brand.partnerName };
}

export function isSessionReadOnly(actor: Actor) {
  return actor === "cpm";
}

export function canViewPartnerScope(actor: Actor) {
  return actor === "partner";
}

export function bindAnnualValue(graph: SessionGraph): SessionGraph {
  const claims = graph.valueInputs.find((input) => input.id === "claims")?.quantity ?? 0;
  const delay = graph.valueInputs.find((input) => input.id === "delay")?.quantity ?? 0;
  const handling = graph.valueInputs.find((input) => input.id === "handling")?.quantity ?? 0;
  const annualValue = graph.session.mechanic === "ghost-ledger"
    ? hasCompleteCostComponents(graph) ? ledgerAnnualTotal(graph.costComponents) : 0
    : hasCompleteValueInputs(graph) ? calculateAnnualValue(claims, delay, handling) : 0;
  return { ...graph, outcome: { ...graph.outcome, annualValue } };
}

export function applyClaimsVolumeChoice(graph: SessionGraph, choice: ClaimsVolumeChoice): SessionGraph {
  if (choice === "exact" && graph.session.claimsVolumeChoice === "exact") return graph;

  const quantity = choice === "exact" ? null : choice === "range-250-500" ? 375 : 400;
  const confirmedBy = choice === "unconfirmed" || choice === "exact"
    ? null
    : graph.valueInputs.find((input) => input.id === "claims")?.confirmedBy ?? "Michelle Dorsey";
  const valueInputs = graph.valueInputs.map((input) =>
    input.id === "claims"
      ? {
          ...input,
          quantity,
          confirmedBy,
          respondentConfirmed: choice !== "unconfirmed" && choice !== "exact",
        }
      : input,
  );
  const costComponents = graph.costComponents.map((component) => ({
    ...component,
    inputs: component.inputs.map((input) =>
      input.label === "Claims per day" ? { ...input, quantity } : input,
    ),
  }));
  return bindAnnualValue({
    ...graph,
    session: { ...graph.session, claimsVolumeChoice: choice, ledgerFrozen: false },
    valueInputs,
    costComponents,
    outcome: { ...graph.outcome, partiallyEstimated: choice !== "about-400" },
  });
}

export function isValidExactClaimsVolume(quantity: number | null) {
  return typeof quantity === "number"
    && Number.isSafeInteger(quantity)
    && quantity > 0;
}

export function applyExactClaimsVolume(graph: SessionGraph, quantity: number | null): SessionGraph {
  if (graph.session.claimsVolumeChoice !== "exact") return graph;
  const validQuantity = isValidExactClaimsVolume(quantity) ? quantity : null;
  const valueInputs = graph.valueInputs.map((input) =>
    input.id === "claims"
      ? {
          ...input,
          quantity: validQuantity,
          confirmedBy: null,
          respondentConfirmed: false,
        }
      : input,
  );
  const costComponents = graph.costComponents.map((component) => ({
    ...component,
    inputs: component.inputs.map((input) =>
      input.label === "Claims per day" ? { ...input, quantity: validQuantity } : input,
    ),
  }));
  return bindAnnualValue({
    ...graph,
    session: { ...graph.session, ledgerFrozen: false },
    valueInputs,
    costComponents,
    outcome: { ...graph.outcome, partiallyEstimated: true },
  });
}

export function claimsPayoffCopy(graph: SessionGraph) {
  const claims = graph.valueInputs.find((input) => input.id === "claims");
  const delay = graph.valueInputs.find((input) => input.id === "delay");
  const handling = graph.valueInputs.find((input) => input.id === "handling");
  if (!claims || !delay || !handling || !hasCompleteValueInputs(graph)) return "";
  if (graph.session.claimsVolumeChoice === "exact") {
    const daily = formatCurrency(calculateDailyValue(claims.quantity!, delay.quantity!, handling.quantity!));
    const millions = (calculateAnnualValue(claims.quantity!, delay.quantity!, handling.quantity!) / 1_000_000).toFixed(2).replace(/\.00$/, "");
    return `${claims.quantity} × ${delay.quantity} × ${formatPreciseCurrency(handling.quantity!)} → ${daily}/day · $${millions}M/year`;
  }
  if (!claims.confirmedBy) {
    return "Artifact will label this an unconfirmed estimate.";
  }
  if (graph.session.claimsVolumeChoice === "range-250-500") {
    return "250–500 × 2 × $38.75 → $19,000–$39,000/day · $4.8M–$9.7M/year · spans the library range";
  }
  const daily = formatCurrency(calculateDailyValue(claims.quantity!, delay.quantity!, handling.quantity!));
  const millions = (calculateAnnualValue(claims.quantity!, delay.quantity!, handling.quantity!) / 1_000_000).toFixed(2).replace(/\.00$/, "");
  const estimate = `${claims.quantity} × ${delay.quantity} × ${formatPreciseCurrency(handling.quantity!)} → ${daily}/day · $${millions}M/year`;
  return `${estimate} · top of the library range`;
}

export function claimsVolumeProvenanceCopy(graph: SessionGraph) {
  if (graph.session.claimsVolumeChoice === "exact") {
    return "Volume entered by partner in Scope · not respondent-confirmed";
  }
  if (graph.session.claimsVolumeChoice === "range-250-500") {
    return "Volume supplied as a range · midpoint used only for planning inputs.";
  }
  if (graph.session.claimsVolumeChoice === "unconfirmed") {
    return "No respondent confirmation yet.";
  }
  if (graph.session.delivery === "self-service") {
    return "Respondent-confirmed · not facilitator-verified";
  }
  const claims = graph.valueInputs.find((input) => input.id === "claims");
  return claims?.confirmedBy
    ? inputsConfirmedByCopy(graph)
    : "Volume is an unconfirmed estimate from scope.";
}

export function inputsConfirmedByCopy(graph: SessionGraph) {
  const names = [...new Set(graph.valueInputs.flatMap((input) => (input.confirmedBy ? [input.confirmedBy] : [])))];
  if (names.length === 0) return "Volume is an unconfirmed estimate from scope.";
  if (names.length === 1) return `Inputs confirmed by ${names[0]}.`;
  if (names.length === 2) return `Inputs confirmed by ${names[0]} and ${names[1]}.`;
  return `Inputs confirmed by ${names.slice(0, -1).join(", ")}, and ${names.at(-1)}.`;
}

export function artifactLimitsCopy(graph: SessionGraph) {
  const dateLine = graph.hackathon?.booked && graph.hackathon.date
    ? ` The three-day hackathon on ${graph.hackathon.date} exists to answer these and to scope the six-week pilot.`
    : " The three-day hackathon exists to answer these and to scope the six-week pilot.";
  return {
    heading: "What this case does not yet prove",
    body: `Extraction accuracy on Heartland's own forms, including handwritten adjuster notes. Whether the 15% Michelle flagged behaves as her team expects. Actual review time once fields are pre-filled.${dateLine}`,
  };
}

export function artifactHeadline(useCase: string) {
  if (!useCase.trim()) return "Business case awaiting session evidence";
  const sentenceCase = useCase.toLowerCase().replace(/\bai-assisted\b/, "AI-assisted");
  return `A grounded case for ${sentenceCase}`;
}

export function artifactPilotScopeCopy(graph: SessionGraph, brand: Brand) {
  if (graph.session.scopeMode === "cold" && !graph.outcome.nextStep.trim()) return "Not yet defined";
  const base = "AI-assisted extraction from 500 anonymised claims";
  if (graph.session.reusePriorPilotSpec === false) return `${base}; starts a fresh pilot spec`;
  return `${base}; reuses ${brand.partnerName}'s prior document-pattern pilot spec`;
}

export function canFlagReferenceStory(actor: Actor) {
  return actor !== "partner";
}

export function artifactActions(actor: Actor, qualified: boolean, delivery: Delivery) {
  if (actor === "partner") {
    if (delivery === "self-service") {
      return {
        primary: "Request a facilitated session",
        secondary: "Start DAF funding request",
        tertiary: "Contact my partner manager with this business case",
      };
    }
    return {
      primary: "Start DAF funding request",
      secondary: qualified ? "Request a facilitated session" : null,
      tertiary: "Contact my partner manager with this business case",
    };
  }
  return {
    primary: "Review funding request",
    secondary: null,
    tertiary: null,
  };
}

export function claimsArtifactCopy(graph: SessionGraph) {
  const claims = graph.valueInputs.find((input) => input.id === "claims");
  const delay = graph.valueInputs.find((input) => input.id === "delay");
  const handling = graph.valueInputs.find((input) => input.id === "handling");
  if (!claims || !delay || !handling || !hasCompleteValueInputs(graph)) {
    return {
      headline: "Value inputs not captured yet",
      detail: "Add claims volume, avoidable delay, and handling cost during the session before calculating value.",
      status: null,
    };
  }
  if (graph.session.claimsVolumeChoice === "unconfirmed") {
    return {
      headline: "Value pending volume confirmation",
      detail: "Claims volume was not confirmed in Scope. Confirm it before using a point estimate in the funding case.",
      status: "Unconfirmed estimate",
    };
  }
  if (graph.session.claimsVolumeChoice === "range-250-500") {
    return {
      headline: "$19,000–$39,000 / day",
      detail: "250–500 claims per day × 2 avoidable days × $38.75 handling cost. At 250 working days, that is $4.8M–$9.7M per year.",
      status: "Range estimate · spans the library range",
    };
  }
  const daily = formatCurrency(calculateDailyValue(claims.quantity!, delay.quantity!, handling.quantity!));
  return {
    headline: `${claims.quantity} × ${delay.quantity} × ${formatPreciseCurrency(handling.quantity!)} = ${daily} / day`,
    detail: `${claims.quantity} claims per day × ${delay.quantity} avoidable days × ${formatPreciseCurrency(handling.quantity!)} handling cost. At 250 working days, that is ${formatCurrency(graph.outcome.annualValue)} per year.`,
    status: null,
  };
}

export function applyFundingRoute(graph: SessionGraph, route: FundingRoute): SessionGraph {
  return {
    ...graph,
    session: { ...graph.session, fundingRoute: route },
    attendees: graph.attendees.map((person) =>
      person.id === "karen"
        ? route === "invite-karen"
          ? { ...person, attendance: "attending", reason: "Economic buyer · invited" }
          : { ...person, attendance: "invited-not-attending", reason: "not attending — Dana carries the ask" }
        : person,
    ),
  };
}

export function fundingAskCopy(graph: SessionGraph) {
  const winner = winningSolution(graph);
  const winnerLabel = winner ? ` on ${winner.title}` : "";
  if (graph.session.scopeMode === "cold") {
    const economicBuyer = graph.attendees.find((attendee) => /cfo|finance|economic buyer|executive sponsor/i.test(attendee.role));
    const technicalOwner = graph.attendees.find((attendee) => /developer|engineer|technical lead/i.test(attendee.role));
    if (!economicBuyer) {
      return "Confirm an economic buyer before requesting funding that substantiates the hackathon booking.";
    }
    return `${economicBuyer.name}: substantiate the three-day hackathon${winnerLabel}${technicalOwner ? ` and confirm ${technicalOwner.name} will be in the room` : ""}.`;
  }
  if (graph.session.fundingRoute === "brief-dana") {
    return `Dana Reyes: carry the funding ask. Brief Karen so she can substantiate the three-day hackathon${winnerLabel} and confirm Alex Chen joins the room.`;
  }
  return `Karen Whitfield, CFO: substantiate the three-day hackathon${winnerLabel} and confirm Alex Chen joins the room.`;
}

export function rankedSolutions(graph: SessionGraph) {
  const byId = new Map(withSolutionProducts(graph.solutions).map((solution) => [solution.id, solution]));
  return graph.ranking.order
    .map((id) => byId.get(id))
    .filter((solution): solution is NonNullable<typeof solution> => Boolean(solution));
}

export function winningSolution(graph: SessionGraph) {
  if (!graph.ranking.locked || graph.ranking.order.length === 0) return null;
  const winner = withSolutionProducts(graph.solutions).find(
    (solution) => solution.id === graph.ranking.order[0],
  );
  return winner ?? null;
}

export function reorderSolutions(graph: SessionGraph, order: string[]): SessionGraph {
  if (graph.ranking.locked || graph.hackathon?.booked) return graph;
  const validIds = new Set(graph.solutions.map((solution) => solution.id));
  if (order.length !== graph.solutions.length || order.some((id) => !validIds.has(id))) return graph;
  return { ...graph, ranking: { ...graph.ranking, order: [...order] } };
}

export function moveSolution(graph: SessionGraph, solutionId: string, direction: "up" | "down"): SessionGraph {
  const index = graph.ranking.order.indexOf(solutionId);
  if (index < 0) return graph;
  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (swapWith < 0 || swapWith >= graph.ranking.order.length) return graph;
  const order = [...graph.ranking.order];
  [order[index], order[swapWith]] = [order[swapWith], order[index]];
  return reorderSolutions(graph, order);
}

export function lockRanking(graph: SessionGraph): SessionGraph {
  if (graph.ranking.order.length === 0) return graph;
  return {
    ...graph,
    ranking: { ...graph.ranking, locked: true },
    outcome: {
      ...graph.outcome,
      nextStep: graph.outcome.nextStep.trim() || "3-day hackathon to scope a six-week pilot",
    },
  };
}

export function unlockRanking(graph: SessionGraph): SessionGraph {
  return {
    ...graph,
    ranking: { ...graph.ranking, locked: false },
    hackathon: null,
  };
}

export function defaultHackathonDraft(graph: SessionGraph): HackathonBooking {
  const customerOwner =
    graph.outcome.owner
    ?? customerSponsor(graph)?.name
    ?? "Dana Reyes";
  const partnerSpecialist =
    graph.session.delivery === "google-facilitated"
      ? "Ravi Menon"
      : graph.session.facilitator?.name ?? "Ravi Menon";
  const googleFacilitator =
    graph.session.delivery === "google-facilitated"
      ? graph.session.facilitator?.name ?? "Priya Raghavan"
      : "Priya Raghavan";
  const winner = winningSolution(graph);
  return {
    date: "",
    googleFacilitator,
    partnerSpecialist,
    customerOwner,
    question: winner
      ? `Can we prove ${winner.title.toLowerCase()} on Heartland's own forms in three days?`
      : "Can we prove the winning solution on Heartland's own forms in three days?",
    booked: false,
  };
}

export function bookHackathon(
  graph: SessionGraph,
  draft: Omit<HackathonBooking, "booked">,
): SessionGraph {
  if (!graph.ranking.locked) return graph;
  const date = draft.date.trim();
  const googleFacilitator = draft.googleFacilitator.trim();
  const partnerSpecialist = draft.partnerSpecialist.trim();
  const customerOwner = draft.customerOwner.trim();
  const question = draft.question.trim();
  if (!date || !googleFacilitator || !partnerSpecialist || !customerOwner || !question) return graph;
  return {
    ...graph,
    hackathon: {
      date,
      googleFacilitator,
      partnerSpecialist,
      customerOwner,
      question,
      booked: true,
    },
    outcome: {
      ...graph.outcome,
      nextStep: `3-day hackathon on ${date} to scope a six-week pilot`,
      owner: customerOwner,
    },
    session: {
      ...graph.session,
      status: "complete",
    },
  };
}

export function applyPatternChoice(graph: SessionGraph, patternId: string): SessionGraph {
  return { ...graph, session: { ...graph.session, patternId } };
}

export function applyReusePriorPilotSpec(graph: SessionGraph, reuse: boolean): SessionGraph {
  return { ...graph, session: { ...graph.session, reusePriorPilotSpec: reuse } };
}
