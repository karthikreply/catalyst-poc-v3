import { describe, expect, it } from "vitest";

import { brands } from "./brands";
import { freezeLedger, ledgerAnnualTotal } from "./cost-model";
import { initialSessionGraph } from "./seed";
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
  lockRanking,
  moveSolution,
  unlockRanking,
  winningSolution,
  canFlagReferenceStory,
  canViewPartnerScope,
  claimsArtifactCopy,
  claimsPayoffCopy,
  claimsVolumeProvenanceCopy,
  coldRoleMatch,
  coldScopeDefaults,
  fundingAskCopy,
  graphForActor,
  hydrateSessionGraph,
  inputsConfirmedByCopy,
  missingColdRoles,
  isQualified,
  isSessionReadOnly,
  pdmPartnerInvitationCopy,
  preworkForMechanic,
  restoreSeededGraph,
  savePartnerNote,
  saveSessionOutcome,
  shouldResetGraph,
  updateCapture,
  updateValueConfirmer,
  viewerForActor,
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
    expect(viewerForActor("cpm", brands.cdw)).toEqual({
      actor: "cpm",
      name: "Marcus Hale",
      org: "Platform vendor",
    });
    expect(isSessionReadOnly("pdm")).toBe(false);
    expect(isSessionReadOnly("partner")).toBe(false);
    expect(isSessionReadOnly("cpm")).toBe(true);
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
    expect(artifactActions("cpm", false, "facilitated").secondary).toBeNull();
  });

  it("offers reference-story review to vendor actors on the pilot spec", () => {
    expect(canFlagReferenceStory("partner")).toBe(false);
    expect(canFlagReferenceStory("pdm")).toBe(true);
    expect(canFlagReferenceStory("cpm")).toBe(true);
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
  it("reserves partner-held scope details and controls for the partner", () => {
    expect(canViewPartnerScope("partner")).toBe(true);
    expect(canViewPartnerScope("pdm")).toBe(false);
    expect(canViewPartnerScope("cpm")).toBe(false);
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
  it("reorders solutions until locked, then books a dated hackathon", () => {
    const first = initialSessionGraph.ranking.order[0];
    const second = initialSessionGraph.ranking.order[1];
    const moved = moveSolution(initialSessionGraph, second, "up");
    expect(moved.ranking.order[0]).toBe(second);
    expect(moved.ranking.order[1]).toBe(first);

    const locked = lockRanking(moved);
    expect(locked.ranking.locked).toBe(true);
    expect(winningSolution(locked)?.id).toBe(second);
    expect(moveSolution(locked, first, "up")).toBe(locked);

    const booked = bookHackathon(locked, {
      date: "2026-10-14",
      googleFacilitator: "Priya Raghavan",
      partnerSpecialist: "Ravi Menon",
      customerOwner: "Dana Reyes",
      question: "Can we prove handwritten-note assist on Heartland forms?",
    });
    expect(booked.hackathon?.booked).toBe(true);
    expect(booked.outcome.nextStep).toContain("2026-10-14");
    expect(artifactLimitsCopy(booked).body).toContain("2026-10-14");

    const unlocked = unlockRanking(booked);
    expect(unlocked.ranking.locked).toBe(false);
    expect(unlocked.hackathon).toBeNull();
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
});
