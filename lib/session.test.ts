import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { brands } from "./brands";
import { freezeLedger, ledgerAnnualTotal } from "./cost-model";
import { sampleClaims } from "./sample-claims";
import { initialSessionGraph } from "./seed";
import { buildTelemetrySessions, summarizeTelemetry } from "./telemetry";
import {
  agendaForSession,
  applyClaimsVolumeChoice,
  applyColdScope,
  applyDeliveryMode,
  applyExactClaimsVolume,
  applyFundingRoute,
  applyMechanic,
  applyCloseStyle,
  artifactActions,
  artifactHeadline,
  artifactLimitsCopy,
  artifactPilotScopeCopy,
  bookHackathon,
  bindAnnualValue,
  chooseCustomerFormat,
  customerGreeting,
  customerHasAccount,
  sessionHasNamedCompany,
  customerHomeSummary,
  latestStepCapture,
  lockRanking,
  moveSolution,
  unlockRanking,
  selectedSolutions,
  toggleSelected,
  castVote,
  voteTallies,
  lookupAccount,
  enrichAttendeeName,
  bookedSolutionTitles,
  rankedSolutions,
  canFlagReferenceStory,
  bookBlockReason,
  canBookHackathon,
  canViewPartnerScope,
  claimsArtifactCopy,
  claimsPayoffCopy,
  claimsVolumeProvenanceCopy,
  coldRoleMatch,
  coldScopeDefaults,
  demonstrationColdAccount,
  withDemonstrationColdAccount,
  fundingAskCopy,
  googleCalendarComposeUrl,
  googleMeetUrl,
  graphForActor,
  hackathonGoogleStack,
  markHackathonCalendarAdded,
  markHackathonMeetAdded,
  hydrateSessionGraph,
  migrateStoredActor,
  inputsConfirmedByCopy,
  missingColdRoles,
  isQualified,
  isCustomerAttending,
  isCustomerViewer,
  isSessionReadOnly,
  canMutateSampleRun,
  customerSampleRunLabel,
  documentExtractionSolution,
  liveSampleRunFlag,
  markSampleClaim,
  rankOneSolutionId,
  setSamplePosition,
  showsTryItCard,
  startOverSampleRun,
  startSampleRun,
  pdmPartnerInvitationCopy,
  preworkForMechanic,
  restoreSeededGraph,
  savePartnerNote,
  saveSessionOutcome,
  shouldResetGraph,
  updateCapture,
  updateValueConfirmer,
  viewerForActor,
  viewingAsCustomerLabel,
  bookedSolutionPains,
  defaultShowcaseAt,
  pilotNextStepCopy,
  pilotPickTitle,
  pilotScopeLine,
  pilotSpecUseCase,
  sampleRunEntryReady,
  showsSampleRunLink,
  setPilotPick,
  showcaseLabel,
  handoffLabel,
  hasCompleteValueInputs,
  recordHandoff,
} from "./session";
import { calculateAnnualValue } from "./value";

describe("self-service input confirmation", () => {
  it("updates one confirmer without changing values, captures, or other confirmers", () => {
    const selfService = {
      ...applyDeliveryMode(initialSessionGraph, "self-service"),
      valueInputs: initialSessionGraph.valueInputs.map((input, index) => ({
        ...input,
        confirmedBy: ["Michelle Dorsey", "Dana Reyes", "Alex Chen"][index],
      })),
    };
    const updated = updateValueConfirmer(selfService, "claims", "Dana Reyes");

    expect(updated.valueInputs.find((item) => item.id === "claims")?.confirmedBy).toBe("Dana Reyes");
    expect(updated.valueInputs.find((item) => item.id === "delay")?.confirmedBy).toBe("Dana Reyes");
    expect(updated.valueInputs.find((item) => item.id === "handling")?.confirmedBy).toBe("Alex Chen");
    expect(updated.valueInputs.map((item) => item.quantity)).toEqual(
      selfService.valueInputs.map((item) => item.quantity),
    );
    expect(updated.captures).toEqual(selfService.captures);
  });
});

describe("applyDeliveryMode", () => {
  it("preserves named confirmers when self-service is selected again", () => {
    const selfService = {
      ...applyDeliveryMode(initialSessionGraph, "self-service"),
      valueInputs: initialSessionGraph.valueInputs.map((input, index) => ({
        ...input,
        confirmedBy: ["Michelle Dorsey", "Dana Reyes", "Alex Chen"][index],
      })),
    };

    expect(applyDeliveryMode(selfService, "self-service").valueInputs).toEqual(selfService.valueInputs);
  });

  it("keeps edited values and captures when switching delivery", () => {
    const edited = {
      ...initialSessionGraph,
      valueInputs: initialSessionGraph.valueInputs.map((input) =>
        input.id === "handling" ? { ...input, quantity: 31 } : input,
      ),
      captures: [
        ...initialSessionGraph.captures,
        {
          id: "cap-extra",
          sessionId: initialSessionGraph.session.id,
          stepId: "constraints",
          attributedTo: "Dana Reyes",
          text: "Keep the overtime evidence.",
          capturedAt: "2026-09-21T10:50:00-05:00",
        },
      ],
    };
    const selfServe = applyDeliveryMode(edited, "self-service");
    expect(selfServe.session.delivery).toBe("self-service");
    expect(selfServe.session.facilitator).toBeNull();
    expect(selfServe.valueInputs.every((input) => input.confirmedBy === null)).toBe(true);
    expect(selfServe.valueInputs.find((input) => input.id === "handling")?.quantity).toBe(31);
    expect(selfServe.captures).toHaveLength(edited.captures.length);
    expect(isQualified(selfServe)).toBe(true);

    const back = applyDeliveryMode(selfServe, "facilitated");
    expect(back.session.facilitator?.name).toBe("Ravi Menon");
    expect(back.valueInputs.find((input) => input.id === "handling")?.quantity).toBe(31);
    expect(back.valueInputs.find((input) => input.id === "handling")?.confirmedBy).toBe("Michelle Dorsey");
    expect(back.captures).toHaveLength(edited.captures.length);
    expect(back.outcome.annualValue).toBe(calculateAnnualValue(400, 2, 31));
  });
});

describe("ghost-ledger annual value binding", () => {
  it("keeps delivery changes on the ledger annual rather than the sprint annual", () => {
    const frozen = freezeLedger(applyMechanic(initialSessionGraph, "ghost-ledger"));
    const changed = applyDeliveryMode(frozen, "self-service");

    expect(changed.session.ledgerFrozen).toBe(true);
    expect(changed.outcome.annualValue).toBe(ledgerAnnualTotal(changed.costComponents));
  });

  it("unfreezes and recomputes the ledger when a source quantity changes", () => {
    const frozen = freezeLedger(applyMechanic(initialSessionGraph, "ghost-ledger"));
    const changed = applyClaimsVolumeChoice(frozen, "range-250-500");

    expect(changed.session.ledgerFrozen).toBe(false);
    expect(changed.outcome.annualValue).toBe(ledgerAnnualTotal(changed.costComponents));
  });
});

describe("applyMechanic", () => {
  it("preserves session evidence while rebinding the active mechanic value", () => {
    const edited = applyDeliveryMode(initialSessionGraph, "self-service");
    const ghost = applyMechanic(edited, "ghost-ledger");
    expect(ghost.session.mechanic).toBe("ghost-ledger");
    expect(ghost.session.delivery).toBe("self-service");
    expect(ghost.captures).toEqual(edited.captures);
    expect(ghost.agenda).toEqual(edited.agenda);
    expect(ghost.valueInputs).toEqual(edited.valueInputs);
    expect(ghost.costComponents).toEqual(edited.costComponents);
    expect(ghost.outcome.annualValue).toBe(ledgerAnnualTotal(ghost.costComponents));
    const restored = applyMechanic(freezeLedger(ghost), "value-sprint");
    expect(restored.session.mechanic).toBe("value-sprint");
    expect(restored.session.ledgerFrozen).toBe(false);
    expect(restored.outcome.annualValue).toBe(calculateAnnualValue(400, 2, 38.75));
  });
});

describe("close style", () => {
  it("uses the board-slide variant without changing the required outcome", () => {
    const boardSlide = applyCloseStyle(initialSessionGraph, "board-slide");
    const step = agendaForSession(boardSlide).find((item) => item.id === "owner-and-ask");

    expect(boardSlide.session.mechanic).toBe(initialSessionGraph.session.mechanic);
    expect(boardSlide.outcome.owner).toBe(initialSessionGraph.outcome.owner);
    expect(boardSlide.outcome.nextStep).toBe(initialSessionGraph.outcome.nextStep);
    expect(step).toMatchObject({
      title: "The board slide",
      durationMinutes: 30,
      prompt: "It's March. The pilot worked. Dana, what do you tell your board?",
      subPrompt: "Capture the answer verbatim. Their words, not a summary.",
    });
  });

  it("keeps owner and next step populated under both close styles", () => {
    for (const closeStyle of ["owner-and-ask", "board-slide"] as const) {
      const graph = applyCloseStyle(initialSessionGraph, closeStyle);
      expect(graph.outcome.owner).toBeTruthy();
      expect(graph.outcome.nextStep).toBeTruthy();
    }
  });
});

describe("plan consequences", () => {
  it("turns agenda step 2 and pre-work into a ghost ledger plan", () => {
    const ghost = applyMechanic(initialSessionGraph, "ghost-ledger");
    const step = agendaForSession(ghost).find((item) => item.id === "volume-and-cost");

    expect(step?.title).toBe("Build the ledger");
    expect(step?.prompt).toMatch(/tool spend, overtime, rework rate, and review hours/i);
    expect(preworkForMechanic("ghost-ledger")).toEqual(expect.arrayContaining([
      expect.stringMatching(/tool spend/i),
      expect.stringMatching(/overtime/i),
      expect.stringMatching(/rework rate/i),
      expect.stringMatching(/review hours/i),
    ]));
    expect(preworkForMechanic("value-sprint")).not.toEqual(expect.arrayContaining([
      expect.stringMatching(/tool spend/i),
    ]));
  });

  it("removes ghost-ledger agenda and pre-work when value sprint is restored", () => {
    const ghost = applyMechanic(initialSessionGraph, "ghost-ledger");
    const restored = applyMechanic(ghost, "value-sprint");

    expect(agendaForSession(restored).find((item) => item.id === "volume-and-cost")?.title)
      .toBe("Volume and cost");
    expect(preworkForMechanic(restored.session.mechanic)).not.toEqual(expect.arrayContaining([
      expect.stringMatching(/tool spend|overtime|rework rate|review hours/i),
    ]));
  });

  it("carries the funding route into agenda step 5", () => {
    const invited = applyFundingRoute(initialSessionGraph, "invite-karen");
    const delegated = applyFundingRoute(initialSessionGraph, "brief-dana");

    expect(agendaForSession(invited).find((item) => item.id === "owner-and-ask")?.prompt)
      .toMatch(/asking Karen/i);
    expect(agendaForSession(delegated).find((item) => item.id === "owner-and-ask")?.prompt)
      .toMatch(/Dana carry the funding ask/i);
  });

  it("creates a vendor PDM invitation to the partner", () => {
    const invitation = pdmPartnerInvitationCopy(brands.cdw);

    expect(invitation).toMatch(/^Hi Ravi,/);
    expect(invitation).toContain("Heartland Mutual Insurance");
    expect(invitation).toMatch(/account you own/i);
    expect(invitation).toMatch(/funding available/i);
    expect(invitation).toMatch(/CDW('s)? brand/i);
    expect(invitation).toContain("Priya Raghavan · Platform vendor");
  });

  it("gives Softchoice its own document and invitation voice", () => {
    expect(brands.softchoice.partnerName).toBe("Softchoice");
    expect(brands.softchoice.emailIntro).not.toBe(brands.cdw.emailIntro);
    expect(brands.softchoice.artifactIntro).toMatch(/Softchoice/);
    expect(brands.softchoice.artifactClosing).toMatch(/Softchoice/);
    expect(pdmPartnerInvitationCopy(brands.softchoice)).toMatch(/Softchoice('s)? brand/);
    expect(viewerForActor("partner", brands.softchoice).org).toBe("Softchoice");
  });
});

describe("shouldResetGraph", () => {
  it("does not treat gate or scope as a graph reset", () => {
    expect(shouldResetGraph("/")).toBe(false);
    expect(shouldResetGraph("/scope")).toBe(false);
    expect(shouldResetGraph("/run")).toBe(false);
  });
});

describe("actor model", () => {
  it("maps the three authenticated actors without an end-customer viewer", () => {
    expect(viewerForActor("pdm", brands.cdw)).toEqual({
      actor: "pdm",
      name: "Priya Raghavan",
      org: "Platform vendor",
    });
    expect(viewerForActor("partner", brands.cdw)).toEqual({
      actor: "partner",
      name: "Ravi Menon",
      org: "CDW",
    });
    expect(viewerForActor("customer", brands.cdw)).toEqual({
      actor: "customer",
      name: "Dana Reyes",
      org: "Heartland Mutual Insurance",
    });
    expect(isSessionReadOnly("pdm", initialSessionGraph)).toBe(false);
    expect(isSessionReadOnly("partner", initialSessionGraph)).toBe(false);
    expect(isSessionReadOnly("customer", initialSessionGraph)).toBe(true);
    expect(isSessionReadOnly("customer", applyDeliveryMode(initialSessionGraph, "self-service"))).toBe(false);
    expect(isSessionReadOnly(
      "customer",
      applyColdScope(initialSessionGraph, coldScopeDefaults.company, coldScopeDefaults.attendees),
    )).toBe(false);
  });

  it("restores facilitated handling cost to Michelle", () => {
    const facilitated = applyDeliveryMode(
      applyDeliveryMode(initialSessionGraph, "self-service"),
      "facilitated",
    );
    expect(facilitated.valueInputs.find((input) => input.id === "handling")?.confirmedBy)
      .toBe("Michelle Dorsey");
  });
});

describe("scope decisions", () => {
  it("turns ~400 claims into visible daily and annual arithmetic", () => {
    const next = applyClaimsVolumeChoice(initialSessionGraph, "about-400");
    const claims = next.valueInputs.find((input) => input.id === "claims");
    expect(claims?.quantity).toBe(400);
    expect(claims?.confirmedBy).toBe("Michelle Dorsey");
    expect(next.outcome.partiallyEstimated).toBeFalsy();
    expect(next.outcome.annualValue).toBe(calculateAnnualValue(400, 2, 38.75));
    expect(claimsPayoffCopy(next)).toBe(
      "400 × 2 × $38.75 → $31,000/day · $7.75M/year · top of the library range",
    );
  });

  it("marks an unconfirmed volume as an estimate on the artifact", () => {
    const next = applyClaimsVolumeChoice(initialSessionGraph, "unconfirmed");
    expect(next.valueInputs.find((input) => input.id === "claims")?.confirmedBy).toBeNull();
    expect(next.outcome.partiallyEstimated).toBe(true);
    expect(claimsPayoffCopy(next)).toMatch(/unconfirmed estimate/i);
    expect(claimsArtifactCopy(next).headline).toBe("Value pending volume confirmation");
    expect(claimsArtifactCopy(next).status).toBe("Unconfirmed estimate");
    expect(claimsArtifactCopy(next).headline).not.toContain("$7.75M");
  });

  it("carries a claims range into the artifact instead of collapsing it to a midpoint", () => {
    const next = applyClaimsVolumeChoice(initialSessionGraph, "range-250-500");
    const copy = claimsArtifactCopy(next);

    expect(next.outcome.partiallyEstimated).toBe(true);
    expect(claimsPayoffCopy(next)).toContain("$19,000–$39,000/day");
    expect(claimsPayoffCopy(next)).toContain("$4.8M–$9.7M/year");
    expect(claimsPayoffCopy(next)).toContain("spans the library range");
    expect(copy.headline).toBe("$19,000–$39,000 / day");
    expect(copy.detail).toContain("$4.8M–$9.7M per year");
    expect(copy.status).toBe("Range estimate · spans the library range");
    expect(copy.headline).not.toContain("$7.75M");
  });

  it("uses a valid exact claims volume in quantity, arithmetic, and artifact copy", () => {
    const graphWithIndependentHandlingConfirmer = {
      ...initialSessionGraph,
      session: { ...initialSessionGraph.session, ledgerFrozen: true },
      costComponents: initialSessionGraph.costComponents.map((component) =>
        component.id === "handling" ? { ...component, confirmedBy: "Alex Chen" } : component,
      ),
    };
    const exactSelected = applyClaimsVolumeChoice(graphWithIndependentHandlingConfirmer, "exact");
    const next = applyExactClaimsVolume(exactSelected, 275);
    const claims = next.valueInputs.find((input) => input.id === "claims");

    expect(claims?.quantity).toBe(275);
    expect(claims?.confirmedBy).toBeNull();
    expect(claims?.respondentConfirmed).toBe(false);
    expect(next.costComponents.find((item) => item.id === "handling")?.inputs[0].quantity).toBe(275);
    expect(next.costComponents.find((item) => item.id === "handling")?.confirmedBy).toBe("Alex Chen");
    expect(next.session.ledgerFrozen).toBe(false);
    expect(next.outcome.annualValue).toBe(calculateAnnualValue(275, 2, 38.75));
    expect(claimsPayoffCopy(next)).toContain("275 × 2 × $38.75 → $21,313/day");
    expect(claimsArtifactCopy(next).headline).toBe("275 × 2 × $38.75 = $21,313 / day");
    expect(claimsArtifactCopy(next).detail).toContain("$5,328,250 per year");
    expect(claimsVolumeProvenanceCopy(next)).toBe(
      "Volume entered by partner in Scope · not respondent-confirmed",
    );
  });

  it.each([null, 0, -1, 1.5, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1])(
    "does not complete exact claims for invalid quantity %s",
    (quantity) => {
      const exactSelected = applyClaimsVolumeChoice(
        initialSessionGraph,
        "exact",
      );
      const next = applyExactClaimsVolume(exactSelected, quantity);

      expect(next.valueInputs.find((input) => input.id === "claims")?.quantity).toBeNull();
      expect(next.outcome.annualValue).toBe(0);
      expect(claimsPayoffCopy(next)).toBe("");
      expect(claimsArtifactCopy(next).headline).toBe("Value inputs not captured yet");
    },
  );

  it("preserves a saved exact quantity when exact is selected again", () => {
    const exact = applyExactClaimsVolume(
      applyClaimsVolumeChoice(initialSessionGraph, "exact"),
      275,
    );

    expect(applyClaimsVolumeChoice(exact, "exact")).toEqual(exact);
  });

  it("round-trips exact claims to the about-400 choice", () => {
    const exact = applyExactClaimsVolume(
      applyClaimsVolumeChoice(initialSessionGraph, "exact"),
      275,
    );
    const about = applyClaimsVolumeChoice(exact, "about-400");
    const claims = about.valueInputs.find((input) => input.id === "claims");

    expect(claims).toMatchObject({
      quantity: 400,
      confirmedBy: "Michelle Dorsey",
      respondentConfirmed: true,
    });
    expect(claimsPayoffCopy(about)).toContain("400 × 2 × $38.75");
    expect(about.outcome.partiallyEstimated).toBe(false);
  });

  it("round-trips exact claims to the range choice", () => {
    const exact = applyExactClaimsVolume(
      applyClaimsVolumeChoice(initialSessionGraph, "exact"),
      275,
    );
    const range = applyClaimsVolumeChoice(exact, "range-250-500");
    const claims = range.valueInputs.find((input) => input.id === "claims");

    expect(claims).toMatchObject({
      quantity: 375,
      confirmedBy: "Michelle Dorsey",
      respondentConfirmed: true,
    });
    expect(claimsPayoffCopy(range)).toContain("$19,000–$39,000/day");
    expect(claimsArtifactCopy(range).status).toBe("Range estimate · spans the library range");
    expect(range.outcome.partiallyEstimated).toBe(true);
  });

  it("lists each confirmer once on the artifact", () => {
    expect(inputsConfirmedByCopy(initialSessionGraph)).toBe(
      "Inputs confirmed by Michelle Dorsey and Dana Reyes.",
    );
    expect(inputsConfirmedByCopy(initialSessionGraph)).not.toMatch(/Michelle Dorsey and Michelle Dorsey/);
  });

  it("names the case's unproven limits so the pilot is the next step", () => {
    const limits = artifactLimitsCopy(initialSessionGraph);
    expect(limits.heading).toBe("What this case does not yet prove");
    expect(limits.body).toMatch(/handwritten adjuster notes/i);
    expect(limits.body).toMatch(/15%/);
    expect(limits.body).toMatch(/review time/i);
    expect(limits.body).toMatch(/hackathon exists to answer these/i);
  });

  it("carries reuse of the prior pilot spec into the artifact pilot section", () => {
    expect(artifactPilotScopeCopy(initialSessionGraph, brands.cdw)).toMatch(
      /reuses CDW's prior document-pattern pilot spec/i,
    );
  });
});

describe("cold scope", () => {
  const company = {
    name: "Northwind Insurance",
    industry: "Insurance",
    sizeBand: "$500M–$1B",
  };
  const attendees = [
    { name: "Dana Lee", role: "VP Claims Operations" },
    { name: "Mina Shah", role: "Claims Supervisor" },
    { name: "Alex Kim", role: "Senior Developer" },
    { name: "Sam Patel", role: "Infrastructure Director" },
  ];

  it("persists typed company and people without retaining Heartland attendees", () => {
    const next = applyColdScope(initialSessionGraph, company, attendees);

    expect(next.session.scopeMode).toBe("cold");
    expect(next.session.customerName).toBe("Northwind Insurance");
    expect(next.session.industry).toBe("Insurance");
    expect(next.coldCompany).toEqual(company);
    expect(next.coldAttendees).toEqual(attendees);
    expect(next.attendees.map((person) => person.name)).toEqual(
      ["Dana Lee", "Mina Shah", "Alex Kim", "Sam Patel"],
    );
    expect(next.attendees.some((person) => person.name === "Karen Whitfield")).toBe(false);
    expect(next.captures).toEqual([]);
    expect(next.valueInputs.every((input) => input.quantity === null && input.confirmedBy === null)).toBe(true);
    expect(next.costComponents.every((component) =>
      component.confirmedBy === null && component.inputs.every((input) => input.quantity === null),
    )).toBe(true);
    expect(next.outcome.useCase).toBe("");
    expect(next.outcome.annualValue).toBe(0);
    expect(next.outcome.constraint).toBe("");
    expect(next.outcome.nextStep).toBe("");
    expect(next.outcome.owner).toBe("Alex Kim");
    expect(next.agenda[0].state).toBe("active");
    expect(next.agenda.slice(1).every((step) => step.state === "upcoming")).toBe(true);
    expect(agendaForSession(next).map((step) => step.prompt).join(" ")).not.toMatch(/Karen|Dana|Heartland/i);
    expect(claimsArtifactCopy(next)).toEqual({
      headline: "Value inputs not captured yet",
      detail: expect.stringMatching(/add claims volume/i),
      status: null,
    });
    expect(artifactHeadline(next.outcome.useCase)).toBe("Business case awaiting session evidence");
    expect(artifactPilotScopeCopy(next, brands.cdw)).toBe("Not yet defined");
    expect(fundingAskCopy(next)).not.toMatch(/Dana Reyes|Karen Whitfield|Alex Chen/);
    expect(applyDeliveryMode(next, "facilitated").valueInputs.every((input) => input.confirmedBy === null)).toBe(true);
  });

  it("preserves intentionally empty cold evidence during hydration", () => {
    const cold = applyColdScope(initialSessionGraph, company, attendees);
    const persisted = {
      ...cold,
      captures: [],
    };

    expect(hydrateSessionGraph(persisted).captures).toEqual([]);
    expect(hydrateSessionGraph(persisted).valueInputs.every((input) => input.quantity === null)).toBe(true);
  });

  it("scrubs legacy persisted cold data but preserves newly entered cold values", () => {
    const legacyCold = {
      ...initialSessionGraph,
      session: { ...initialSessionGraph.session, scopeMode: "cold" as const },
      coldCompany: company,
      coldAttendees: attendees,
    };
    const scrubbed = hydrateSessionGraph(legacyCold);
    expect(scrubbed.captures).toEqual([]);
    expect(scrubbed.valueInputs.every((input) => input.quantity === null)).toBe(true);

    const editedCold = {
      ...applyColdScope(initialSessionGraph, company, attendees),
      valueInputs: applyColdScope(initialSessionGraph, company, attendees).valueInputs.map((input) =>
        input.id === "claims" ? { ...input, quantity: 275 } : input,
      ),
    };
    expect(hydrateSessionGraph(editedCold).valueInputs.find((input) => input.id === "claims")?.quantity).toBe(275);
  });

  it("uses the pattern to explain attendees and name missing roles", () => {
    const next = applyColdScope(initialSessionGraph, company, attendees);

    expect(next.attendees.find((person) => person.name === "Dana Lee")?.reason)
      .toMatch(/operating outcome/i);
    expect(missingColdRoles(next)).toEqual([
      expect.objectContaining({ role: "Compliance", reason: expect.stringMatching(/lose two weeks/i) }),
      expect.objectContaining({ role: "Economic buyer", reason: expect.stringMatching(/fund the pilot/i) }),
    ]);
  });

  it("explains how free-text roles map to required pattern roles", () => {
    expect(coldRoleMatch("Frontline")).toBe("Frontline supervisor");
    expect(coldRoleMatch("Analyst")).toBeNull();
    expect(coldRoleMatch("CFO")).toBe("Economic buyer");
  });

  it("prefills an editable starting company and three matched attendees", () => {
    const next = applyColdScope(
      initialSessionGraph,
      coldScopeDefaults.company,
      coldScopeDefaults.attendees,
    );

    expect(coldScopeDefaults.company.name).toBe("Northwind Insurance");
    expect(coldScopeDefaults.attendees).toHaveLength(3);
    expect(coldScopeDefaults.attendees.every((person) => person.name.trim() && person.role.trim())).toBe(true);
    expect(coldScopeDefaults.attendees.map((person) => coldRoleMatch(person.role))).toEqual([
      "Operations owner",
      "Frontline supervisor",
      "Developer",
    ]);
    expect(next.session.customerName).toBe("Northwind Insurance");
    expect(next.attendees).toHaveLength(3);
    expect(next.outcome.owner).toBe(coldScopeDefaults.attendees[2].name);
    expect(next.attendees.some((person) => /Dana Reyes|Karen Whitfield|Alex Chen|Michelle Dorsey/.test(person.name))).toBe(false);
  });

  it("fills a blank lookup with demonstration company and room details", () => {
    const named = demonstrationColdAccount("Reply");
    expect(named.company).toEqual({
      name: "Reply",
      industry: "Insurance",
      sizeBand: "$500M–$1B",
    });
    expect(named.attendees.map((person) => person.name)).toEqual([
      "Laura Beckett",
      "Sam Ortiz",
      "Devin Cole",
    ]);

    const filled = withDemonstrationColdAccount(
      { name: "Reply", industry: "", sizeBand: "" },
      [{ name: "", role: "" }, { name: "", role: "" }, { name: "", role: "" }],
    );
    expect(filled?.company.industry).toBe("Insurance");
    expect(filled?.attendees[0].name).toBe("Laura Beckett");
    expect(withDemonstrationColdAccount(named.company, named.attendees)).toBeNull();
  });

  it("restores a saved seeded graph and rejects a cold backup", () => {
    const editedSeeded = applyClaimsVolumeChoice(initialSessionGraph, "range-250-500");
    const cold = applyColdScope(initialSessionGraph, company, attendees);

    expect(restoreSeededGraph(editedSeeded)).toEqual(editedSeeded);
    expect(restoreSeededGraph(editedSeeded).captures).toEqual(editedSeeded.captures);
    expect(restoreSeededGraph(editedSeeded).valueInputs).toEqual(editedSeeded.valueInputs);
    expect(restoreSeededGraph(cold)).toEqual(initialSessionGraph);
    expect(restoreSeededGraph(null)).toEqual(initialSessionGraph);
  });

  it("hydrates a seeded v3 snapshot before restoring it", () => {
    const legacy = { ...initialSessionGraph } as Partial<typeof initialSessionGraph>;
    delete legacy.partnerNotes;

    expect(restoreSeededGraph(legacy as typeof initialSessionGraph).partnerNotes).toEqual([]);
  });
});

describe("artifact consequences", () => {
  it("keeps the AI acronym capitalised in the CFO-facing headline", () => {
    expect(artifactHeadline("AI-assisted claims intake extraction")).toBe(
      "A grounded case for AI-assisted claims intake extraction",
    );
  });

  it("does not assert the $7.75M point estimate when volume is a range", () => {
    const next = applyClaimsVolumeChoice(initialSessionGraph, "range-250-500");
    const copy = claimsArtifactCopy(next);
    expect(copy.headline).toBe("$19,000–$39,000 / day");
    expect(copy.headline).not.toContain("$31,000");
    expect(`${copy.headline} ${copy.detail}`).not.toContain("$7.75M");
  });

  it("labels the artifact unconfirmed when volume was not confirmed", () => {
    const next = applyClaimsVolumeChoice(initialSessionGraph, "unconfirmed");
    const copy = claimsArtifactCopy(next);
    expect(copy.status).toBe("Unconfirmed estimate");
    expect(copy.headline).toBe("Value pending volume confirmation");
    expect(`${copy.headline} ${copy.detail} ${copy.status}`).not.toContain("$7.75M");
  });

  it("switches the artifact cost section to the four-component ledger", () => {
    const ghost = applyMechanic(initialSessionGraph, "ghost-ledger");
    expect(ghost.session.mechanic).toBe("ghost-ledger");
    expect(ghost.costComponents.map((row) => row.label)).toEqual([
      "Handling labour",
      "Manual review hours",
      "Rework and leakage",
      "Overtime",
    ]);
  });

  it("gives the partner a path back to their PDM", () => {
    expect(artifactActions("partner", false, "facilitated").tertiary).toBe(
      "Contact my partner manager with this business case",
    );
    expect(artifactActions("pdm", false, "facilitated")).toEqual({
      primary: "Review funding request",
      secondary: null,
      tertiary: null,
    });
    expect(artifactActions("customer", false, "facilitated")).toEqual({
      primary: null,
      secondary: null,
      tertiary: null,
    });
  });

  it("offers reference-story review to vendor actors on the pilot spec", () => {
    expect(canFlagReferenceStory("partner")).toBe(false);
    expect(canFlagReferenceStory("pdm")).toBe(true);
    expect(canFlagReferenceStory("customer")).toBe(false);
  });

  it("leads a self-service artifact with facilitated verification", () => {
    expect(artifactActions("partner", true, "self-service").primary).toBe(
      "Request a facilitated session",
    );
    expect(artifactActions("partner", true, "self-service").secondary).toBe(
      "Start DAF funding request",
    );
  });

  it("inviting Karen keeps the artifact ask on her and lists her as invited", () => {
    const next = applyFundingRoute(initialSessionGraph, "invite-karen");
    const karen = next.attendees.find((person) => person.id === "karen");
    expect(karen?.reason).toBe("Economic buyer · invited");
    expect(fundingAskCopy(next)).toContain("Karen Whitfield");
    expect(fundingAskCopy(next)).not.toMatch(/^Dana Reyes/);
  });

  it("briefing Dana marks Karen not attending and addresses Dana on the artifact", () => {
    const next = applyFundingRoute(initialSessionGraph, "brief-dana");
    const karen = next.attendees.find((person) => person.id === "karen");
    expect(karen?.attendance).toBe("invited-not-attending");
    expect(karen?.reason).toBe("not attending — Dana carries the ask");
    expect(fundingAskCopy(next)).toContain("Dana Reyes");
    expect(fundingAskCopy(next)).not.toContain("Karen Whitfield, CFO:");
  });
});

describe("scope access", () => {
  it("reserves partner-held scope details for partner and PDM doors", () => {
    expect(canViewPartnerScope("partner")).toBe(true);
    expect(canViewPartnerScope("pdm")).toBe(true);
    expect(canBookHackathon("partner")).toBe(true);
    expect(canBookHackathon("customer")).toBe(true);
    expect(canBookHackathon("pdm")).toBe(false);
    expect(canViewPartnerScope("customer")).toBe(false);
  });

  it("explains why booking is unavailable, and the role check wins", () => {
    const three = {
      ...initialSessionGraph,
      ranking: { ...initialSessionGraph.ranking, selected: ["a", "b", "c"] },
    };
    expect(bookBlockReason("pdm", three)).toBe("The partner or customer books the hackathon.");
    expect(bookBlockReason("partner", initialSessionGraph)).toBe("Select three solutions first.");
    expect(bookBlockReason("customer", initialSessionGraph)).toBe("Select three solutions first.");
    expect(bookBlockReason("pdm", initialSessionGraph)).toBe("The partner or customer books the hackathon.");
    expect(bookBlockReason("partner", three)).toBeNull();
    expect(bookBlockReason("customer", three)).toBeNull();
  });

  it("starts the PDM scenario from clean seeded data after a cold customer", () => {
    const fujitsu = applyColdScope(
      initialSessionGraph,
      { name: "Fujitsu", industry: "Technology", sizeBand: "$1B+" },
      coldScopeDefaults.attendees,
    );

    expect(graphForActor(fujitsu, "pdm")).toEqual(initialSessionGraph);
    expect(graphForActor(fujitsu, "partner")).toBe(fujitsu);
  });
});

describe("partner session notes", () => {
  const note = {
    id: "partner-note-1",
    author: "Ravi Menon",
    text: "Claims leadership wants the first review in October.",
    updatedAt: "2026-09-23T15:00:00.000Z",
  };

  it("replaces existing partner context without changing captured testimony", () => {
    const existing = {
      ...initialSessionGraph,
      partnerNotes: [
        note,
        {
          ...note,
          id: "partner-note-2",
          text: "Older context that should be replaced.",
          updatedAt: "2026-09-23T14:00:00.000Z",
        },
      ],
    };
    const replacement = {
      ...note,
      id: "partner-note-3",
      text: "Claims leadership wants an October review.",
      updatedAt: "2026-09-23T16:00:00.000Z",
    };
    const saved = savePartnerNote(existing, replacement);

    expect(saved.partnerNotes).toEqual([replacement]);
    expect(saved.captures).toEqual(initialSessionGraph.captures);
  });

  it("hydrates only the most recently updated persisted partner context", () => {
    const newest = {
      ...note,
      id: "partner-note-2",
      text: "Newest context.",
      updatedAt: "2026-09-23T16:00:00.000Z",
    };
    const persisted = {
      ...initialSessionGraph,
      partnerNotes: [
        newest,
        note,
        { ...note, id: "partner-note-3", updatedAt: "invalid timestamp" },
      ],
    };

    expect(hydrateSessionGraph(persisted).partnerNotes).toEqual([newest]);
    expect(hydrateSessionGraph(persisted).captures).toEqual(initialSessionGraph.captures);
  });

  it("hydrates an existing v3 graph without partner notes", () => {
    const legacy = { ...initialSessionGraph } as Partial<typeof initialSessionGraph>;
    delete legacy.partnerNotes;
    expect(hydrateSessionGraph(legacy as typeof initialSessionGraph).partnerNotes).toEqual([]);
  });

  it("keeps seeded partner context out of a cold session and restores the seeded copy", () => {
    const seeded = savePartnerNote(initialSessionGraph, note);
    const cold = applyColdScope(seeded, coldScopeDefaults.company, coldScopeDefaults.attendees);
    expect(cold.partnerNotes).toEqual([]);
    expect(restoreSeededGraph(seeded).partnerNotes).toEqual([note]);
  });
});

describe("session captures", () => {
  const sessionCapture = {
    id: "capture-1758645600000",
    sessionId: initialSessionGraph.session.id,
    stepId: "where-it-hurts",
    attributedTo: "Dana Reyes",
    text: "Board asked for a decision by November.",
    capturedAt: "2026-09-23T16:00:00.000Z",
  };
  const withSessionCapture = {
    ...initialSessionGraph,
    captures: [...initialSessionGraph.captures, sessionCapture],
  };

  it("edits the text and attribution of one capture only", () => {
    const updated = updateCapture(withSessionCapture, sessionCapture.id, {
      attributedTo: "Michelle Dorsey",
      text: "  Board asked for a decision by October.  ",
    });

    expect(updated.captures).toHaveLength(withSessionCapture.captures.length);
    expect(updated.captures.at(-1)).toEqual({
      ...sessionCapture,
      attributedTo: "Michelle Dorsey",
      text: "Board asked for a decision by October.",
    });
    expect(updated.captures.slice(0, -1)).toEqual(initialSessionGraph.captures);
  });

  it("edits a seeded capture in place", () => {
    const seeded = initialSessionGraph.captures[0];
    const updated = updateCapture(withSessionCapture, seeded.id, {
      attributedTo: "Robert Osei",
      text: "Intake sits five days once the backlog clears.",
    });

    expect(updated.captures[0]).toEqual({
      ...seeded,
      attributedTo: "Robert Osei",
      text: "Intake sits five days once the backlog clears.",
    });
    expect(updated.captures.slice(1)).toEqual(withSessionCapture.captures.slice(1));
  });

  it("refuses to blank a capture", () => {
    expect(updateCapture(withSessionCapture, sessionCapture.id, { attributedTo: "Dana Reyes", text: "   " }).captures)
      .toEqual(withSessionCapture.captures);
  });
});

describe("session outcome", () => {
  it("captures the use case, constraint, and next step a cold session agreed", () => {
    const cold = applyColdScope(initialSessionGraph, coldScopeDefaults.company, coldScopeDefaults.attendees);
    expect(cold.outcome.useCase).toBe("");

    const agreed = saveSessionOutcome(cold, {
      useCase: "  AI-assisted claims intake extraction  ",
      constraint: "Human review on low-confidence extractions",
      nextStep: "3-day hackathon to scope a six-week pilot",
    });

    expect(agreed.outcome.useCase).toBe("AI-assisted claims intake extraction");
    expect(agreed.outcome.constraint).toBe("Human review on low-confidence extractions");
    expect(agreed.outcome.nextStep).toBe("3-day hackathon to scope a six-week pilot");
    expect(artifactHeadline(agreed.outcome.useCase)).not.toBe("Business case awaiting session evidence");
    expect(artifactPilotScopeCopy(agreed, brands.cdw)).not.toBe("Not yet defined");
  });

  it("edits the seeded outcome without touching captures or value inputs", () => {
    const edited = saveSessionOutcome(initialSessionGraph, {
      useCase: "AI-assisted first-notice-of-loss triage",
      constraint: initialSessionGraph.outcome.constraint,
      nextStep: initialSessionGraph.outcome.nextStep,
    });

    expect(edited.outcome.useCase).toBe("AI-assisted first-notice-of-loss triage");
    expect(edited.outcome.owner).toBe(initialSessionGraph.outcome.owner);
    expect(edited.captures).toEqual(initialSessionGraph.captures);
    expect(edited.valueInputs).toEqual(initialSessionGraph.valueInputs);
  });
});

describe("solution ranking and hackathon booking", () => {
  function selectIds(graph: typeof initialSessionGraph, ids: string[]) {
    return ids.reduce((current, id) => toggleSelected(current, id), graph);
  }

  it("caps selection at three and refuses a fourth", () => {
    const ids = rankedSolutions(initialSessionGraph).map((solution) => solution.id);
    const three = selectIds(initialSessionGraph, ids.slice(0, 3));
    expect(three.ranking.selected).toHaveLength(3);
    const fourth = toggleSelected(three, ids[3]);
    expect(fourth.ranking.selected).toEqual(three.ranking.selected);
    expect(selectedSolutions(three).map((s) => s.id)).toEqual(ids.slice(0, 3));
  });

  it("refuses remove and move while locked, and unlock after booking is a no-op", () => {
    const ids = rankedSolutions(initialSessionGraph).map((solution) => solution.id);
    const selected = selectIds(initialSessionGraph, ids.slice(0, 3));
    const locked = lockRanking(selected);
    expect(locked.ranking.locked).toBe(true);
    expect(toggleSelected(locked, ids[0])).toBe(locked);
    expect(moveSolution(locked, ids[1], "up")).toBe(locked);

    const booked = bookHackathon(locked, {
      date: "2026-10-14",
      googleFacilitator: "Priya Raghavan",
      partnerSpecialist: "Ravi Menon",
      customerOwner: "Dana Reyes",
      question: "Can we prove the three selected solutions?",
    });
    expect(booked.hackathon?.solutionIds).toEqual(ids.slice(0, 3));
    expect(booked.hackathon?.solutionIds).not.toContain(ids[3]);
    expect(unlockRanking(booked)).toBe(booked);
    expect(booked.outcome.nextStep).toContain("2026-10-14");
    expect(artifactLimitsCopy(booked).body).toContain("2026-10-14");
  });

  it("books without prior lock when three are selected, and names them in funding copy", () => {
    const ids = rankedSolutions(initialSessionGraph).map((solution) => solution.id);
    const selected = selectIds(initialSessionGraph, ids.slice(0, 3));
    expect(lockRanking(initialSessionGraph).ranking.locked).toBe(false);

    const booked = bookHackathon(selected, {
      date: "2026-10-14",
      googleFacilitator: "Priya Raghavan",
      partnerSpecialist: "Ravi Menon",
      customerOwner: "Dana Reyes",
      question: "Can we prove the three?",
    });
    expect(booked.ranking.locked).toBe(true);
    expect(booked.hackathon?.booked).toBe(true);
    const titles = bookedSolutionTitles(booked);
    expect(titles).toHaveLength(3);
    const ask = fundingAskCopy(booked);
    for (const title of titles) {
      expect(ask).toContain(title);
    }
  });

  it("filters shortlists by mechanic without dropping ranking.order ids", () => {
    const ids = rankedSolutions(initialSessionGraph).map((solution) => solution.id);
    const selected = selectIds(initialSessionGraph, ids.slice(0, 3));
    expect(rankedSolutions(selected)).toHaveLength(4);

    const ledger = applyMechanic(selected, "ghost-ledger");
    expect(rankedSolutions(ledger)).toHaveLength(3);
    expect(ledger.ranking.order).toEqual(initialSessionGraph.ranking.order);
    expect(ledger.ranking.selected).toEqual([]);

    const reselected = selectIds(ledger, rankedSolutions(ledger).map((s) => s.id).slice(0, 3));
    const booked = bookHackathon(reselected, {
      date: "2026-11-01",
      googleFacilitator: "Priya Raghavan",
      partnerSpecialist: "Ravi Menon",
      customerOwner: "Dana Reyes",
      question: "Ledger path?",
    });
    const switched = applyMechanic(booked, "value-sprint");
    expect(switched.hackathon?.solutionIds).toEqual(booked.hackathon?.solutionIds);
    expect(bookedSolutionTitles(switched)).toEqual(bookedSolutionTitles(booked));
  });

  it("looks up Heartland for partner/PDM and always misses for customer", () => {
    expect(lookupAccount("heartland ", "partner").hit).toBe(true);
    expect(lookupAccount("Heartland Mutual Insurance", "pdm").hit).toBe(true);
    expect(lookupAccount("heart", "partner").hit).toBe(false);
    expect(lookupAccount("Heartland", "customer").hit).toBe(false);
    expect(lookupAccount("Reply", "customer").hit).toBe(false);
    expect(lookupAccount("Heartland", "partner")).not.toHaveProperty("publicProfile");
  });

  it("attaches a public profile only to a Reply miss", () => {
    const reply = lookupAccount(" reply ", "partner");
    expect(reply.hit).toBe(false);
    if (!reply.hit) {
      expect(reply.publicProfile).toEqual({
        companyName: "Reply",
        industry: "Technology",
        sentence: "A services company. This sentence is public. It is not the business case.",
      });
    }
    const customerReply = lookupAccount("REPLY", "customer");
    expect(customerReply.hit).toBe(false);
    if (!customerReply.hit) expect(customerReply.publicProfile?.companyName).toBe("Reply");
    const other = lookupAccount("Northwind", "partner");
    expect(other.hit).toBe(false);
    if (!other.hit) expect(other.publicProfile).toBeNull();
    const customerHeartland = lookupAccount("Heartland", "customer");
    expect(customerHeartland.hit).toBe(false);
    if (!customerHeartland.hit) expect(customerHeartland.publicProfile).toBeNull();
  });

  it("enriches Heartland names on a hit and never on a miss", () => {
    const known = enrichAttendeeName("Dana Reyes", true);
    expect(known.kind).toBe("known");
    if (known.kind === "known") {
      expect(known.role).toBe("VP Claims Operations");
      expect(known.prompt).toBe("Is that the role in this session?");
    }
    const miss = enrichAttendeeName("Dana Reyes", false);
    expect(miss.kind).toBe("unknown");
    expect(miss.prompt).toContain("Couldn't find information on Dana Reyes");
  });

  it("stores one vote per attendee without reordering ranking", () => {
    const order = [...initialSessionGraph.ranking.order];
    const ids = rankedSolutions(initialSessionGraph).map((s) => s.id);
    const first = castVote(initialSessionGraph, "dana", ids[0]);
    const second = castVote(first, "dana", ids[1]);
    expect(second.votes.dana).toBe(ids[1]);
    expect(voteTallies(second)[ids[0]] ?? 0).toBe(0);
    expect(voteTallies(second)[ids[1]]).toBe(1);
    expect(second.ranking.order).toEqual(order);
  });

  it("clears booking selection and votes when entering cold scope", () => {
    const ids = rankedSolutions(initialSessionGraph).map((s) => s.id);
    const seeded = castVote(selectIds(initialSessionGraph, ids.slice(0, 3)), "dana", ids[0]);
    const cold = applyColdScope(seeded, { name: "Reply", industry: "Technology", sizeBand: "1,000–5,000" }, [
      { id: "cold-1", name: "Dana Reyes", role: "Ops" },
    ]);
    expect(cold.session.scopeMode).toBe("cold");
    expect(cold.hackathon).toBeNull();
    expect(cold.ranking.selected).toEqual([]);
    expect(cold.votes).toEqual({});
    expect(cold.attendees.every((person) => person.source === "inferred")).toBe(true);
  });

  it("uses hackathon-substantiating artifact actions instead of a pilot kickoff", () => {
    const actions = artifactActions("partner", false, "facilitated");
    expect(actions.primary).toBe("Start DAF funding request");
    expect(actions.secondary).toBeNull();
    expect(JSON.stringify(actions)).not.toMatch(/pilot kickoff|confirm hackathon capacity/i);
  });

  it("sets a Google facilitator when delivery is google-facilitated", () => {
    const next = applyDeliveryMode(initialSessionGraph, "google-facilitated");
    expect(next.session.delivery).toBe("google-facilitated");
    expect(next.session.facilitator?.name).toBe("Priya Raghavan");
  });

  it("builds a Google stack and Calendar compose URL after booking", () => {
    const ids = rankedSolutions(initialSessionGraph).map((solution) => solution.id).slice(0, 3);
    const selected = ids.reduce((current, id) => toggleSelected(current, id), initialSessionGraph);
    const booked = bookHackathon(selected, {
      date: "2026-10-14",
      googleFacilitator: "Priya Raghavan",
      partnerSpecialist: "Ravi Menon",
      customerOwner: "Dana Reyes",
      question: "Can we prove the three?",
    });
    const stack = hackathonGoogleStack(booked);
    expect(stack.map((item) => item.product)).toEqual(
      expect.arrayContaining(["Gemini", "Google Calendar", "Google Meet"]),
    );
    expect(hackathonGoogleStack(initialSessionGraph)).toEqual([]);
    const url = googleCalendarComposeUrl(booked);
    expect(url).toContain("calendar.google.com/calendar/render");
    expect(url).toContain("action=TEMPLATE");
    expect(url).toContain("20261014");
    expect(url).toContain("20261017");
    expect(decodeURIComponent(url.replace(/\+/g, "%20"))).toContain("Join with Google Meet");
    expect(googleCalendarComposeUrl(initialSessionGraph)).toBe("");
    expect(googleMeetUrl(booked)).toBe("https://meet.google.com/new");
    expect(googleMeetUrl(initialSessionGraph)).toBe("");
  });

  it("marks the Calendar hold as done after the compose click", () => {
    const ids = rankedSolutions(initialSessionGraph).map((solution) => solution.id).slice(0, 3);
    const selected = ids.reduce((current, id) => toggleSelected(current, id), initialSessionGraph);
    const booked = bookHackathon(selected, {
      date: "2026-10-14",
      googleFacilitator: "Priya Raghavan",
      partnerSpecialist: "Ravi Menon",
      customerOwner: "Dana Reyes",
      question: "Can we prove the three?",
    });
    expect(booked.hackathon?.calendarAdded).toBe(false);
    const marked = markHackathonCalendarAdded(booked);
    expect(marked.hackathon?.calendarAdded).toBe(true);
    expect(markHackathonCalendarAdded(marked)).toBe(marked);
    expect(markHackathonCalendarAdded(initialSessionGraph)).toBe(initialSessionGraph);
    expect(booked.hackathon?.meetAdded).toBe(false);
    const withMeet = markHackathonMeetAdded(marked);
    expect(withMeet.hackathon?.meetAdded).toBe(true);
    expect(markHackathonMeetAdded(withMeet)).toBe(withMeet);
    expect(markHackathonMeetAdded(initialSessionGraph)).toBe(initialSessionGraph);
  });
});

describe("customer home", () => {
  function bookThree(graph = initialSessionGraph) {
    const ids = rankedSolutions(graph).map((solution) => solution.id).slice(0, 3);
    const selected = ids.reduce((current, id) => toggleSelected(current, id), graph);
    return bookHackathon(selected, {
      date: "2026-10-14",
      googleFacilitator: "Priya Raghavan",
      partnerSpecialist: "Ravi Menon",
      customerOwner: "Devin Cole",
      question: "Can we prove the three?",
    });
  }

  it("is true only for a customer with a named cold account", () => {
    expect(customerHasAccount("customer", initialSessionGraph)).toBe(false);
    expect(customerHasAccount("partner", applyColdScope(initialSessionGraph, { name: "Reply", industry: "Insurance", sizeBand: "Enterprise" }, coldScopeDefaults.attendees))).toBe(false);
    expect(customerHasAccount("pdm", applyColdScope(initialSessionGraph, { name: "Reply", industry: "Insurance", sizeBand: "Enterprise" }, coldScopeDefaults.attendees))).toBe(false);
    const named = applyColdScope(initialSessionGraph, { name: "Reply", industry: "Insurance", sizeBand: "Enterprise" }, coldScopeDefaults.attendees);
    expect(customerHasAccount("customer", named)).toBe(true);
    const blank = applyColdScope(initialSessionGraph, { name: "  ", industry: "Insurance", sizeBand: "Enterprise" }, coldScopeDefaults.attendees);
    expect(customerHasAccount("customer", blank)).toBe(false);
  });

  it("treats a named company as on the session even when the scope is seeded", () => {
    expect(sessionHasNamedCompany(initialSessionGraph)).toBe(true);
    const named = applyColdScope(initialSessionGraph, { name: "Reply", industry: "Insurance", sizeBand: "Enterprise" }, coldScopeDefaults.attendees);
    expect(sessionHasNamedCompany(named)).toBe(true);
    const blank = applyColdScope(initialSessionGraph, { name: "  ", industry: "Insurance", sizeBand: "Enterprise" }, coldScopeDefaults.attendees);
    expect(sessionHasNamedCompany(blank)).toBe(false);
    expect(customerHasAccount("customer", initialSessionGraph)).toBe(false);
  });

  it("treats the seeded facilitated graph as not started", () => {
    const summary = customerHomeSummary(initialSessionGraph, "CDW");
    expect(summary.started).toBe(false);
    expect(summary.company).toBe("No account yet");
    expect(summary.stage).toBe("Not started");
    expect(summary.annualValue).toBeNull();
    expect(summary.continueHref).toBeNull();
    expect(summary.funding).toBe("Not started");
    expect(isSessionReadOnly("customer", initialSessionGraph)).toBe(true);
  });

  it("starts a customer session by choosing a format", () => {
    const ledger = chooseCustomerFormat(initialSessionGraph, "ghost-ledger");
    expect(ledger.session.customerFormatChosen).toBe(true);
    expect(ledger.session.delivery).toBe("self-service");
    expect(ledger.session.mechanic).toBe("ghost-ledger");
    expect(ledger.agenda.every((step) => step.state === "upcoming")).toBe(true);
    expect(isSessionReadOnly("customer", ledger)).toBe(false);

    const summary = customerHomeSummary(ledger, "CDW");
    expect(summary.started).toBe(true);
    expect(summary.company).toBe("No account yet");
    expect(summary.format).toBe("Show me the cost of waiting");
    expect(summary.partner).toBe("CDW");
    expect(summary.stage).toBe("Scope");
    expect(summary.annualValue).toBeNull();
    expect(summary.continueHref).toBe("/scope");

    const sprint = chooseCustomerFormat(initialSessionGraph, "value-sprint");
    expect(customerHomeSummary(sprint, "CDW").format).toBe("Prioritize my use cases");
    expect(hydrateSessionGraph(JSON.parse(JSON.stringify(sprint))).session.customerFormatChosen).toBe(true);
    expect(hydrateSessionGraph(JSON.parse(JSON.stringify(initialSessionGraph))).session.customerFormatChosen).toBeFalsy();
  });

  it("loads a missing customer door as closed and keeps an open door", () => {
    expect(initialSessionGraph.session.customerDoor).toBe(false);
    const legacy = JSON.parse(JSON.stringify(initialSessionGraph)) as typeof initialSessionGraph;
    delete (legacy.session as { customerDoor?: boolean }).customerDoor;
    expect(hydrateSessionGraph(legacy).session.customerDoor).toBe(false);

    const opened = hydrateSessionGraph({
      ...initialSessionGraph,
      session: { ...initialSessionGraph.session, customerDoor: true },
    });
    expect(opened.session.customerDoor).toBe(true);
    expect(opened.session.delivery).toBe("facilitated");
    expect(opened.session.mechanic).toBe(initialSessionGraph.session.mechanic);
    expect(opened.session.customerName).toBe(initialSessionGraph.session.customerName);
    expect(isCustomerAttending("customer", initialSessionGraph)).toBe(true);
    expect(isCustomerAttending("customer", opened)).toBe(false);
    expect(isCustomerAttending("customer", chooseCustomerFormat(opened, "value-sprint"))).toBe(false);
    expect(isCustomerAttending("partner", opened)).toBe(false);
  });

  it("shows the account, stage, and value only once captured on the cold session", () => {
    const started = chooseCustomerFormat(initialSessionGraph, "value-sprint");
    const cold = applyColdScope(
      started,
      { name: "Reply", industry: "Insurance", sizeBand: "$500M–$1B" },
      coldScopeDefaults.attendees,
    );
    const summary = customerHomeSummary(cold, "SoftwareOne");
    expect(summary.company).toBe("Reply");
    expect(summary.stage).toBe("Where it hurts");
    expect(summary.continueHref).toBe("/run");
    expect(summary.annualValue).toBeNull();
    expect(summary.partner).toBe("SoftwareOne");

    const withInputs = bindAnnualValue({
      ...cold,
      valueInputs: cold.valueInputs.map((input) => ({
        ...input,
        quantity: input.id === "claims" ? 300 : input.id === "delay" ? 2 : 40,
      })),
    });
    expect(customerHomeSummary(withInputs, "SoftwareOne").annualValue).toBe(withInputs.outcome.annualValue);

    const funded = applyFundingRoute(withInputs, "brief-dana");
    expect(customerHomeSummary(funded, "SoftwareOne").funding).toBe("Dana carries the ask");
  });

  it("builds a schedule URL with the date, partner, and booked titles", () => {
    const booked = bookThree();
    const url = googleCalendarComposeUrl(booked, "CDW");
    const decoded = decodeURIComponent(url.replace(/\+/g, "%20"));
    expect(url).toContain("20261014");
    expect(decoded).toContain("Partner: CDW");
    for (const title of bookedSolutionTitles(booked)) {
      expect(decoded).toContain(title);
    }
  });

  it("finds the latest capture for the active or most recent done step", () => {
    expect(latestStepCapture(initialSessionGraph)?.text).toBe("Our forms have handwritten adjuster notes in the margin.");
    const noActive = {
      ...initialSessionGraph,
      agenda: initialSessionGraph.agenda.map((step) => ({
        ...step,
        state: step.id === "where-it-hurts" ? "done" as const : "upcoming" as const,
      })),
    };
    expect(latestStepCapture(noActive)?.text).toBe("We handled Q1 volume by paying overtime, not by hiring.");
    const cold = applyColdScope(initialSessionGraph, coldScopeDefaults.company, coldScopeDefaults.attendees);
    expect(latestStepCapture(cold)).toBeNull();
  });
});

describe("after the calendar hold: showcase and pilot pick", () => {
  const draft = {
    date: "2026-10-14",
    googleFacilitator: "Priya Raghavan",
    partnerSpecialist: "Ravi Menon",
    customerOwner: "Dana Reyes",
    question: "Can we prove the three?",
  };

  function bookThree(graph = initialSessionGraph, showcaseAt?: string) {
    const ids = rankedSolutions(graph).map((solution) => solution.id).slice(0, 3);
    const selected = ids.reduce((current, id) => toggleSelected(current, id), graph);
    return bookHackathon(selected, showcaseAt ? { ...draft, showcaseAt } : draft);
  }

  it("defaults the showcase to 14:00 on the third day", () => {
    expect(defaultShowcaseAt("2026-10-14")).toBe("2026-10-16T14:00");
    expect(defaultShowcaseAt("2026-12-31")).toBe("2027-01-02T14:00");
    expect(defaultShowcaseAt("")).toBe("");
    expect(showcaseLabel("2026-10-16T14:00")).toBe("2026-10-16 · 14:00");
  });

  it("stores showcaseAt on booking and carries it in the compose URL", () => {
    const booked = bookThree();
    expect(booked.hackathon?.showcaseAt).toBe("2026-10-16T14:00");
    const decoded = decodeURIComponent(googleCalendarComposeUrl(booked).replace(/\+/g, "%20"));
    expect(decoded).toContain("Showcase: 2026-10-16T14:00");

    const moved = bookThree(initialSessionGraph, "2026-10-16T16:30");
    expect(moved.hackathon?.showcaseAt).toBe("2026-10-16T16:30");
    expect(decodeURIComponent(googleCalendarComposeUrl(moved).replace(/\+/g, "%20"))).toContain("Showcase: 2026-10-16T16:30");
  });

  it("hydrates old graphs with a default showcase and a null pilot pick", () => {
    const booked = bookThree();
    const legacy = JSON.parse(JSON.stringify(booked)) as typeof booked;
    delete legacy.hackathon!.showcaseAt;
    delete (legacy.outcome as Partial<typeof legacy.outcome>).pilotPick;
    const hydrated = hydrateSessionGraph(legacy);
    expect(hydrated.hackathon?.showcaseAt).toBe("2026-10-16T14:00");
    expect(hydrated.outcome.pilotPick).toBeNull();
    expect(hydrateSessionGraph(JSON.parse(JSON.stringify(initialSessionGraph))).outcome.pilotPick).toBeNull();
  });

  it("pairs each booked title with the latest capture on the step that named it, else its outcome", () => {
    const booked = bookThree();
    const rows = bookedSolutionPains(booked);
    expect(rows.map((row) => row.title)).toEqual(bookedSolutionTitles(booked));
    const intake = rows.find((row) => row.id === "sol-intake-extraction")!;
    expect(intake.pain).toBe("We handled Q1 volume by paying overtime, not by hiring.");
    const review = rows.find((row) => row.id === "sol-low-confidence-review")!;
    expect(review.pain).toBe("Our forms have handwritten adjuster notes in the margin.");

    const noCaptures = { ...booked, captures: [] };
    expect(bookedSolutionPains(noCaptures).map((row) => row.pain)).toEqual(
      booked.hackathon!.solutionIds.map((id) => initialSessionGraph.solutions.find((s) => s.id === id)!.outcome),
    );
    expect(bookedSolutionPains(initialSessionGraph)).toEqual([]);
  });

  it("sets and replaces the pilot pick only among the three booked, separate from votes", () => {
    const booked = bookThree();
    const [first, second] = booked.hackathon!.solutionIds;
    expect(pilotPickTitle(booked)).toBeNull();
    expect(setPilotPick(initialSessionGraph, first)).toBe(initialSessionGraph);
    expect(setPilotPick(booked, "sol-audit-trail")).toBe(booked);

    const picked = setPilotPick(booked, first);
    expect(picked.outcome.pilotPick).toBe(first);
    expect(pilotPickTitle(picked)).toBe(bookedSolutionTitles(booked)[0]);
    expect(picked.votes).toEqual(booked.votes);
    expect(picked.ranking).toEqual(booked.ranking);

    const replaced = setPilotPick(picked, second);
    expect(replaced.outcome.pilotPick).toBe(second);
    expect(setPilotPick(replaced, second)).toBe(replaced);
    expect(castVote(replaced, "dana", first).outcome.pilotPick).toBe(second);
  });

  it("hands off to the pilot spec, business case, and customer stage once picked", () => {
    const booked = bookThree(chooseCustomerFormat(initialSessionGraph, "value-sprint"));
    expect(pilotNextStepCopy(booked)).toBe(booked.outcome.nextStep);
    expect(pilotScopeLine(booked)).toBeNull();
    expect(customerHomeSummary(booked, "CDW").stage).not.toBe("Pilot scoped");

    const picked = setPilotPick(booked, booked.hackathon!.solutionIds[1]);
    const title = bookedSolutionTitles(booked)[1];
    expect(pilotNextStepCopy(picked)).toBe(`Six-week pilot on ${title}`);
    expect(pilotScopeLine(picked)).toBe(`Six-week pilot on ${title}, scoped in the three-day hackathon.`);
    expect(customerHomeSummary(picked, "CDW").stage).toBe("Pilot scoped");
    expect(picked.outcome.useCase).toBe(booked.outcome.useCase);
  });

  it("clears the pick when the graph enters cold scope", () => {
    const picked = setPilotPick(bookThree(), bookThree().hackathon!.solutionIds[0]);
    const cold = applyColdScope(picked, coldScopeDefaults.company, coldScopeDefaults.attendees);
    expect(cold.outcome.pilotPick).toBeNull();
    expect(pilotPickTitle(cold)).toBeNull();
  });

  it("keeps the mechanic and the customer format once the hackathon is booked", () => {
    const booked = bookThree();
    expect(applyMechanic(booked, "ghost-ledger")).toBe(booked);
    expect(booked.session.mechanic).toBe("value-sprint");

    const formatted = chooseCustomerFormat(booked, "ghost-ledger");
    expect(formatted).toBe(booked);
    expect(formatted.session.delivery).toBe(booked.session.delivery);
    expect(formatted.session.customerFormatChosen).toBe(booked.session.customerFormatChosen);
  });
});

describe("handoff", () => {
  const ids = rankedSolutions(initialSessionGraph).map((solution) => solution.id).slice(0, 3);
  const booked = bookHackathon(ids.reduce((current, id) => toggleSelected(current, id), initialSessionGraph), {
    date: "2026-10-14",
    googleFacilitator: "Priya Raghavan",
    partnerSpecialist: "Ravi Menon",
    customerOwner: "Dana Reyes",
    question: "Can we prove the three?",
  });

  it("starts null and loads as null when missing", () => {
    expect(initialSessionGraph.session.handoff).toBeNull();
    const legacy = JSON.parse(JSON.stringify(initialSessionGraph));
    delete legacy.session.handoff;
    expect(hydrateSessionGraph(legacy).session.handoff).toBeNull();
  });

  it("writes once with the sponsor and time, then ignores a second kind", () => {
    const before = Date.now();
    const handed = recordHandoff(initialSessionGraph, "daf");
    expect(handed.session.handoff?.kind).toBe("daf");
    expect(handed.session.handoff?.sponsor).toBe("Alex Chen");
    expect(Date.parse(handed.session.handoff!.at)).toBeGreaterThanOrEqual(before);

    const again = recordHandoff(handed, "pilot");
    expect(again).toBe(handed);
    expect(again.session.handoff?.kind).toBe("daf");
    expect(hydrateSessionGraph(JSON.parse(JSON.stringify(handed))).session.handoff).toEqual(handed.session.handoff);
  });

  it("falls back to the attending sponsor when no owner is named", () => {
    const noOwner = { ...initialSessionGraph, outcome: { ...initialSessionGraph.outcome, owner: null } };
    expect(recordHandoff(noOwner, "pdm-notified").session.handoff?.sponsor).toBe("Dana Reyes");
  });

  it("stays separate from the pilot pick", () => {
    const picked = setPilotPick(booked, booked.hackathon!.solutionIds[0]);
    expect(picked.session.handoff).toBeNull();
    const handed = recordHandoff(booked, "pilot");
    expect(handed.outcome.pilotPick).toBeNull();
  });

  it("labels each state in sentence case", () => {
    expect(handoffLabel(null)).toBe("Not yet handed off");
    expect(handoffLabel({ kind: "daf", at: "", sponsor: "" })).toBe("DAF with the partner");
    expect(handoffLabel({ kind: "pilot", at: "", sponsor: "" })).toBe("Pilot filed");
    expect(handoffLabel({ kind: "pdm-notified", at: "", sponsor: "" })).toBe("PDM notified");
  });
});

describe("ghost-ledger gate", () => {
  const coldPartner = applyColdScope(initialSessionGraph, coldScopeDefaults.company, coldScopeDefaults.attendees);

  it("does not move a partner-led session to the ledger without complete value inputs", () => {
    expect(hasCompleteValueInputs(coldPartner)).toBe(false);
    expect(applyMechanic(coldPartner, "ghost-ledger")).toBe(coldPartner);
    expect(applyMechanic(initialSessionGraph, "ghost-ledger").session.mechanic).toBe("ghost-ledger");
  });

  it("lets a self-service session choose the ledger and enter the numbers there", () => {
    const selfService = applyDeliveryMode(coldPartner, "self-service");
    expect(applyMechanic(selfService, "ghost-ledger").session.mechanic).toBe("ghost-ledger");
    const door = chooseCustomerFormat(coldPartner, "ghost-ledger");
    expect(door.session.mechanic).toBe("ghost-ledger");
    expect(door.session.delivery).toBe("self-service");
  });
});

describe("sample run", () => {
  const at = "2026-10-01T12:00:00.000Z";

  function credibility(graph: typeof initialSessionGraph) {
    return {
      annualValue: graph.outcome.annualValue,
      outcome: graph.outcome,
      valueInputs: graph.valueInputs,
      captures: graph.captures,
      costComponents: graph.costComponents,
      hackathon: graph.hackathon,
      fundingRoute: graph.session.fundingRoute,
      qualified: graph.session.qualified,
      votes: graph.votes,
      partnerNotes: graph.partnerNotes,
    };
  }

  it("resolves one document-extraction solution from the seed", () => {
    const solution = documentExtractionSolution(initialSessionGraph);
    expect(solution?.id).toBe("sol-intake-extraction");
    expect(solution?.title).toBe("AI-assisted claims intake extraction");
    expect(rankOneSolutionId(initialSessionGraph)).toBe("sol-intake-extraction");
    const duplicated = {
      ...initialSessionGraph,
      solutions: initialSessionGraph.solutions.flatMap((item) => item.id === "sol-intake-extraction" ? [item, { ...item }] : [item]),
    };
    expect(documentExtractionSolution(duplicated)).toBeNull();
  });

  it("runs, marks, resumes, changes a mark, and starts over", () => {
    const started = startSampleRun(initialSessionGraph, "partner", "Ravi Menon", at);
    expect(started.sampleRun).toMatchObject({
      solutionId: "sol-intake-extraction",
      status: "ran",
      position: 0,
      reviewedBy: "Ravi Menon",
      at,
      marks: {},
    });

    const first = markSampleClaim(started, "partner", "claim-1", "right", [], "Ravi Menon", at, true);
    expect(first.sampleRun?.position).toBe(1);
    expect(first.sampleRun?.marks["claim-1"]).toEqual({ verdict: "right", fields: [] });

    const parked = setSamplePosition(first, "partner", 4);
    expect(parked.sampleRun?.position).toBe(4);

    const changed = markSampleClaim(parked, "partner", "claim-1", "fix", ["dateOfLoss", "nope"], "Ravi Menon", at, false);
    expect(changed.sampleRun?.position).toBe(4);
    expect(changed.sampleRun?.marks["claim-1"]).toEqual({ verdict: "fix", fields: ["dateOfLoss"] });
    expect(changed.sampleRun?.status).toBe("ran");

    let reviewed = started;
    sampleClaims.forEach((claim, index) => {
      reviewed = markSampleClaim(
        reviewed,
        "partner",
        claim.id,
        index === 2 || index === 5 ? "fix" : "right",
        index === 2 ? ["dateOfLoss"] : index === 5 ? ["policy"] : [],
        "Ravi Menon",
        at,
        true,
      );
    });
    expect(reviewed.sampleRun?.status).toBe("reviewed");
    const marks = reviewed.sampleRun?.marks ?? {};
    const right = Object.values(marks).filter((mark) => mark.verdict === "right").length;
    const fix = Object.values(marks).filter((mark) => mark.verdict === "fix").length;
    expect(right).toBe(6);
    expect(fix).toBe(2);

    expect(startOverSampleRun(reviewed, "partner").sampleRun).toBeNull();
    expect(customerSampleRunLabel(startOverSampleRun(lockRanking(selectSample(reviewed)), "partner"))).toBe("Not run yet");
  });

  it("nulls the sample run when cold scope is entered", () => {
    const started = startSampleRun(initialSessionGraph, "partner", "Ravi Menon", at);
    const cold = applyColdScope(started, coldScopeDefaults.company, coldScopeDefaults.attendees);
    expect(cold.sampleRun).toBeNull();
    expect(cold.hackathon).toBeNull();
    expect(cold.outcome.pilotPick).toBeNull();

    const rerun = startSampleRun(cold, "partner", "Ravi Menon", at);
    const again = applyColdScope(rerun, coldScopeDefaults.company, coldScopeDefaults.attendees);
    expect(again.sampleRun?.status).toBe("ran");
  });

  it("leaves value, evidence, and pilot counts unchanged", () => {
    const before = credibility(initialSessionGraph);
    const telemetryBefore = summarizeTelemetry(buildTelemetrySessions());
    const started = startSampleRun(initialSessionGraph, "partner", "Ravi Menon", at);
    const marked = markSampleClaim(started, "partner", "claim-1", "fix", ["policy"], "Ravi Menon", at, true);
    const cleared = startOverSampleRun(marked, "partner");

    expect(started.sampleRun?.status).toBe("ran");
    expect(credibility(started)).toEqual(before);
    expect(credibility(marked)).toEqual(before);
    expect(credibility(cleared)).toEqual(before);
    expect(summarizeTelemetry(buildTelemetrySessions())).toEqual(telemetryBefore);
    expect(telemetryBefore.hackathonsBooked).toBe(buildTelemetrySessions().filter((row) => row.converted).length);
    expect(telemetryBefore.pilotsSigned).toBe(buildTelemetrySessions().filter((row) => row.outcome === "Pilot signed").length);
  });

  it("guards marks by role", () => {
    expect(isCustomerViewer("customer")).toBe(true);
    expect(isCustomerViewer("partner")).toBe(false);
    expect(isCustomerViewer("pdm")).toBe(false);
    expect(canMutateSampleRun("partner", initialSessionGraph)).toBe(true);
    expect(canMutateSampleRun("pdm", initialSessionGraph)).toBe(false);
    expect(canMutateSampleRun("customer", initialSessionGraph)).toBe(false);
    expect(canMutateSampleRun("customer", applyDeliveryMode(initialSessionGraph, "self-service"))).toBe(true);

    const door = { ...initialSessionGraph, session: { ...initialSessionGraph.session, customerDoor: true } };
    expect(canMutateSampleRun("partner", door)).toBe(false);
    expect(canMutateSampleRun("partner", applyDeliveryMode(initialSessionGraph, "self-service"))).toBe(false);
    expect(canMutateSampleRun("partner", applyDeliveryMode(initialSessionGraph, "google-facilitated"))).toBe(false);

    const started = startSampleRun(initialSessionGraph, "partner", "Ravi Menon", at);
    expect(markSampleClaim(started, "customer", "claim-1", "right", [], "Dana Reyes", at)).toBe(started);
    expect(markSampleClaim(started, "pdm", "claim-1", "right", [], "Priya Raghavan", at)).toBe(started);
    expect(startSampleRun(initialSessionGraph, "pdm", "Priya Raghavan", at)).toBe(initialSessionGraph);
    expect(startSampleRun(door, "partner", "Ravi Menon", at)).toBe(door);
  });

  it("drops a stale run when rank 1 changes and keeps it when the same solution stays first", () => {
    const started = startSampleRun(initialSessionGraph, "partner", "Ravi Menon", at);
    const locked = lockRanking(selectSample(started));
    expect(unlockRanking(locked).sampleRun?.solutionId).toBe("sol-intake-extraction");

    const moved = moveSolution(started, "sol-intake-extraction", "down");
    expect(rankOneSolutionId(moved)).not.toBe("sol-intake-extraction");
    expect(moved.sampleRun).toBeNull();
    expect(showsTryItCard(lockRanking(selectSample(moved)))).toBe(false);
    expect(showsTryItCard(locked)).toBe(true);
  });

  it("hydrates a missing sample run as null", () => {
    const stored = JSON.parse(JSON.stringify(initialSessionGraph)) as typeof initialSessionGraph;
    delete (stored as { sampleRun?: unknown }).sampleRun;
    expect(hydrateSessionGraph(stored).sampleRun).toBeNull();

    const started = startSampleRun(initialSessionGraph, "partner", "Ravi Menon", at);
    const roundTrip = hydrateSessionGraph(JSON.parse(JSON.stringify(started)));
    expect(roundTrip.sampleRun).toEqual(started.sampleRun);

    const partial = hydrateSessionGraph({
      ...initialSessionGraph,
      sampleRun: {
        solutionId: "sol-intake-extraction",
        status: "reviewed",
        marks: { "claim-1": { verdict: "right", fields: [] } },
        position: 3,
        reviewedBy: "Ravi Menon",
        at,
      },
    });
    expect(partial.sampleRun?.status).toBe("ran");
    expect(partial.sampleRun?.position).toBe(3);
    expect(liveSampleRunFlag(started)).toBe(true);
    expect(liveSampleRunFlag(initialSessionGraph)).toBe(false);
  });
});

describe("customer persona", () => {
  it("names Dana on the seeded account and the first cold attendee otherwise", () => {
    expect(viewerForActor("customer", brands.cdw).name).toBe("Dana Reyes");
    expect(customerGreeting("Dana Reyes")).toBe("Hello, Dana");
    expect(viewingAsCustomerLabel("Dana Reyes")).toBe("Dana Reyes · customer");

    const cold = applyColdScope(
      initialSessionGraph,
      { name: "Northwind", industry: "Insurance", sizeBand: "Enterprise" },
      [{ name: "Alex Chen", role: "Developer" }],
    );
    expect(viewerForActor("customer", brands.cdw, cold)).toMatchObject({
      actor: "customer",
      name: "Alex Chen",
    });

    const empty = applyColdScope(
      initialSessionGraph,
      { name: "", industry: "Insurance", sizeBand: "Enterprise" },
      [{ name: "  ", role: "Developer" }],
    );
    expect(viewerForActor("customer", brands.cdw, empty).name).toBe("");
    expect(customerGreeting("")).toBe("Welcome");
    expect(viewingAsCustomerLabel("")).toBe("Customer");
  });

  it("migrates a stored customer actor id without treating person names as actors", () => {
    const retired = "c\u0070m";
    expect(migrateStoredActor(retired)).toBe("customer");
    const stored = {
      ...initialSessionGraph,
      captures: [{ ...initialSessionGraph.captures[0], attributedTo: retired }],
      valueInputs: initialSessionGraph.valueInputs.map((input, index) => (
        index === 0 ? { ...input, confirmedBy: retired } : input
      )),
      votes: { [retired]: "sol-intake-extraction" },
      sampleRun: {
        solutionId: "sol-intake-extraction",
        status: "ran" as const,
        marks: {},
        position: 0,
        reviewedBy: retired,
        at: "2026-10-01T00:00:00.000Z",
      },
      session: {
        ...initialSessionGraph.session,
        handoff: { kind: "pilot" as const, at: "2026-10-01T00:00:00.000Z", sponsor: retired },
      },
    };
    const hydrated = hydrateSessionGraph(stored);
    expect(hydrated.captures[0].attributedTo).toBe("customer");
    expect(hydrated.valueInputs[0].confirmedBy).toBe("customer");
    expect(hydrated.votes.customer).toBe("sol-intake-extraction");
    expect(hydrated.sampleRun?.reviewedBy).toBe("customer");
    expect(hydrated.session.handoff?.sponsor).toBe("customer");
    expect(hydrated.valueInputs.find((input) => input.id === "delay")?.confirmedBy).toBe("Dana Reyes");
  });

  it("keeps the retired customer actor id out of source", () => {
    const retired = "c\u0070m";
    const files = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) return files(full);
      return /\.(ts|tsx)$/.test(entry.name) ? [full] : [];
    });
    const hits = ["lib", "app", "components"].flatMap((dir) => files(dir)).filter((file) => readFileSync(file, "utf8").includes(retired));
    expect(hits).toEqual([]);
  });

  it("shows the pilot use case as a solution title", () => {
    const fragment = { ...initialSessionGraph, outcome: { ...initialSessionGraph.outcome, useCase: "document" } };
    expect(pilotSpecUseCase(fragment)).toBe("Not captured yet");
    const booked = bookHackathon(selectSample(fragment), {
      date: "2026-10-14",
      googleFacilitator: "Priya Raghavan",
      partnerSpecialist: "Ravi Menon",
      customerOwner: "Dana Reyes",
      question: "Can we prove the three?",
    });
    expect(pilotSpecUseCase({ ...booked, outcome: { ...booked.outcome, useCase: "document" } })).toBe(
      bookedSolutionTitles(booked).join(", "),
    );
    const picked = setPilotPick(booked, booked.hackathon!.solutionIds[1]);
    expect(pilotSpecUseCase(picked)).toBe(bookedSolutionTitles(booked)[1]);
    expect(pilotSpecUseCase(picked)).not.toBe("document");
  });

  it("links the sample run for the customer and a facilitated partner, and counts only for the PDM", () => {
    const locked = lockRanking(selectSample(initialSessionGraph));
    expect(sampleRunEntryReady(locked)).toBe(true);
    expect(showsSampleRunLink("customer", locked)).toBe(true);
    expect(showsSampleRunLink("partner", locked)).toBe(true);
    expect(showsSampleRunLink("pdm", locked)).toBe(false);
    expect(showsSampleRunLink("partner", applyDeliveryMode(locked, "self-service"))).toBe(false);
    const booked = bookHackathon(locked, {
      date: "2026-10-14",
      googleFacilitator: "Priya Raghavan",
      partnerSpecialist: "Ravi Menon",
      customerOwner: "Dana Reyes",
      question: "Can we prove the three?",
    });
    expect(showsSampleRunLink("customer", booked)).toBe(true);
    const other = setPilotPick(booked, booked.hackathon!.solutionIds[1]);
    expect(sampleRunEntryReady(other)).toBe(false);
    expect(showsSampleRunLink("customer", other)).toBe(false);
  });
});

function selectSample(graph: typeof initialSessionGraph) {
  const ids = rankedSolutions(graph).map((solution) => solution.id).slice(0, 3);
  return ids.reduce((current, id) => toggleSelected(current, id), graph);
}