"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, ChevronDown, TriangleAlert } from "lucide-react";

import { AccountLookupPanel, ColdAccountEditor } from "@/components/account-lookup-panel";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useSession } from "@/components/session-provider";
import {
  crmBadge,
  deriveKarenObservation,
  heartlandAccountRecord,
  prmBadge,
} from "@/lib/seed/accountRecord";
import type { ColdAttendee, PartnerNote } from "@/lib/seed";
import { isCustomerViewer,
  canViewPartnerScope,
  claimsPayoffCopy,
  coldScopeDefaults,
  demonstrationColdAccount,
  enrichAttendeeName,
  withDemonstrationColdAccount,
  isCustomerAttending,
  isValidExactClaimsVolume,
  missingColdRoles,
  type ClaimsVolumeChoice,
  type FundingRoute,
} from "@/lib/session";
import { formatCompactCurrency } from "@/lib/value";
import { cn } from "@/lib/utils";

const claimsChoices: { label: string; value: ClaimsVolumeChoice }[] = [
  { label: "~400 a day", value: "about-400" },
  { label: "250–500 a day", value: "range-250-500" },
  { label: "Not confirmed yet", value: "unconfirmed" },
  { label: "Enter exact number", value: "exact" },
];

function withAttendeeIds(attendees: ColdAttendee[]): ColdAttendee[] {
  return attendees.map((person, index) => ({
    ...person,
    id: person.id?.trim() || `cold-attendee-${index + 1}`,
  }));
}

export default function ScopePage() {
  const {
    brand,
    graph,
    viewer,
    canEditSession,
    applyClaimsChoice,
    applyExactClaims,
    applyFunding,
    applyPattern,
    applyReusePilot,
    savePartnerNote,
    setColdScope,
    restoreSeededScope,
  } = useSession();
  const mode = graph.session.scopeMode;
  const partnerContext = graph.partnerNotes[0] ?? null;
  const claimsQuantity = graph.valueInputs.find((input) => input.id === "claims")?.quantity ?? null;
  const fundingRef = useRef<HTMLDivElement>(null);
  const observation = mode === "seeded" ? deriveKarenObservation(heartlandAccountRecord) : null;
  const claimsChoice = graph.session.claimsVolumeChoice;
  const fundingRoute = graph.session.fundingRoute;
  const claimsComplete = Boolean(
    claimsChoice
    && (claimsChoice !== "exact" || isValidExactClaimsVolume(claimsQuantity)),
  );
  const seededComplete = Boolean(claimsComplete && fundingRoute);
  const coldCompany = graph.coldCompany ?? coldScopeDefaults.company;
  const coldAttendees = withAttendeeIds(
    graph.coldAttendees.length ? graph.coldAttendees : coldScopeDefaults.attendees,
  );
  const companyComplete = Boolean(coldCompany.name.trim() && coldCompany.industry.trim() && coldCompany.sizeBand.trim());
  const completeAttendees = coldAttendees.filter((person) => person.name.trim() && person.role.trim());
  const coldComplete = companyComplete && completeAttendees.length >= 3;
  const coldGaps = missingColdRoles(graph);
  const scopeComplete = mode === "seeded" ? seededComplete : coldComplete;
  const missingAttendeeCount = Math.max(0, 3 - completeAttendees.length);
  const scopeEditable = canEditSession || isCustomerViewer(viewer.actor);
  const [seededNameCheck, setSeededNameCheck] = useState("");
  const seededEnrichment = seededNameCheck.trim()
    ? enrichAttendeeName(seededNameCheck, true)
    : null;
  const scopeGuidance = mode === "seeded"
    ? !claimsComplete && !fundingRoute
      ? "Confirm claims volume and funding route."
      : !claimsComplete
        ? "Confirm claims volume."
        : !fundingRoute
          ? "Confirm funding route."
          : "Scope complete."
    : !companyComplete && missingAttendeeCount > 0
      ? `Complete company details and add ${missingAttendeeCount} complete ${missingAttendeeCount === 1 ? "attendee" : "attendees"}.`
      : !companyComplete
        ? "Complete company details."
        : missingAttendeeCount > 0
          ? `Add ${missingAttendeeCount} complete ${missingAttendeeCount === 1 ? "attendee" : "attendees"}.`
          : "Scope complete.";

  function revealFunding() {
    requestAnimationFrame(() => {
      fundingRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  function chooseClaims(choice: ClaimsVolumeChoice) {
    applyClaimsChoice(choice);
    if (choice !== "exact" && !fundingRoute) revealFunding();
  }

  function chooseFunding(route: FundingRoute) {
    applyFunding(route);
  }

  useEffect(() => {
    if (mode !== "cold" || !scopeEditable) return;
    const filled = withDemonstrationColdAccount(graph.coldCompany, graph.coldAttendees);
    if (!filled) return;
    setColdScope(filled.company, withAttendeeIds(filled.attendees));
  }, [mode, scopeEditable, graph.coldCompany, graph.coldAttendees, setColdScope]);

  function clearToColdMode() {
    if (!scopeEditable) return;
    setColdScope(coldScopeDefaults.company, withAttendeeIds(coldScopeDefaults.attendees));
  }

  function handleLookupHit() {
    restoreSeededScope();
  }

  function handleLookupMiss(query: string) {
    if (!scopeEditable) return;
    const demo = demonstrationColdAccount(query);
    setColdScope(demo.company, withAttendeeIds(demo.attendees));
  }

  const lookupPanel = (
    <AccountLookupPanel
      actor={viewer.actor}
      onHit={handleLookupHit}
      onMiss={handleLookupMiss}
    />
  );

  // Partner-led, and not the Customer card: attend the session. No lookup, no door.
  if (isCustomerAttending(viewer.actor, graph)) {
    return (
      <div className="mx-auto max-w-5xl px-5 py-8 lg:px-8">
        <p className="text-sm text-black/48">Attending</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Scope the value session</h1>
        <p className="mt-2 text-sm text-black/55">You are attending. The pain is already on the account.</p>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <section className="rounded-sm border border-black/10 bg-white p-6">
            <h2 className="font-semibold">Account</h2>
            <p className="mt-3 text-lg font-semibold">{graph.session.customerName}</p>
            <p className="mt-1 text-sm text-black/55">{graph.session.industry}</p>
            <p className="mt-3 text-sm leading-6 text-black/68">{graph.session.customerContext}</p>
          </section>

          <section className="rounded-sm border border-black/10 bg-white p-6">
            <h2 className="font-semibold">Known pain</h2>
            {graph.captures.length === 0 ? (
              <p className="mt-3 text-sm text-black/55">Nothing captured yet.</p>
            ) : (
              <ul className="mt-3 space-y-3 text-sm">
                {graph.captures.map((capture) => (
                  <li key={capture.id}>
                    <span className="font-medium">{capture.attributedTo}</span>
                    <span className="text-black/62"> · {capture.text}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="mt-6">
          <Link href="/run" className={cn(buttonVariants({ className: "bg-[var(--brand-accent)] hover:bg-[var(--brand-accent-dark)]" }))}>
            Open the session <ArrowRight />
          </Link>
        </div>
      </div>
    );
  }

  if (isCustomerViewer(viewer.actor)) {
    return (
      <div className="mx-auto max-w-6xl px-5 py-8 lg:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-black/48">Customer entry</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Scope the value session</h1>
            <p className="mt-2 text-sm text-black/55">Look up your account, or add it.</p>
          </div>
          <ScopeNextStep
            complete={mode === "cold" && coldComplete}
            guidance={mode === "cold" ? scopeGuidance : "Look up your account, or add it."}
          />
        </div>
        {lookupPanel}
        {mode === "cold" && (
          <ColdAccountEditor
            coldCompany={coldCompany}
            coldAttendees={coldAttendees}
            accountHit={false}
            canEdit={scopeEditable}
            setColdScope={setColdScope}
            coldGaps={coldGaps}
            graphAttendeeCount={graph.attendees.length}
          />
        )}
      </div>
    );
  }

  if (!canViewPartnerScope(viewer.actor)) {
    const patternName = graph.session.patternId === "fraud-triage"
      ? "Fraud triage"
      : graph.session.patternId === "contact-centre-summarisation"
        ? "Contact-centre summarisation"
        : graph.session.patternId === "knowledge-retrieval"
          ? "Knowledge retrieval"
          : "Document-heavy intake";

    return (
      <div className="mx-auto max-w-5xl px-5 py-8 lg:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-black/48">Read-only vendor view</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Scope the value session</h1>
          </div>
          <ScopeNextStep
            complete={scopeComplete}
            guidance={scopeComplete ? "Scope complete." : "The session plan is available when scoping is complete."}
          />
        </div>
        <p className="mt-5 rounded-sm border border-black/10 bg-[#fafaf8] px-5 py-4 text-sm leading-6 text-black/65">
          Account record is partner-held. The vendor sees the session outcome, not the CRM.
        </p>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <section className="rounded-sm border border-black/10 bg-white p-6">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-semibold">Matched pattern</h2>
              <span className="text-[11px] text-black/42">Curated library</span>
            </div>
            <p className="mt-3 text-lg font-semibold">{patternName}</p>
          </section>

          <section className="rounded-sm border border-black/10 bg-white p-6">
            <h2 className="font-semibold">Session outcome</h2>
            <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
              <div><dt className="text-xs text-black/45">Use case</dt><dd className="mt-1 font-medium">{graph.outcome.useCase || "Not captured"}</dd></div>
              <div><dt className="text-xs text-black/45">Annual value</dt><dd className="mt-1 font-medium">{graph.outcome.annualValue ? formatCompactCurrency(graph.outcome.annualValue) : "Pending session inputs"}</dd></div>
              <div><dt className="text-xs text-black/45">Owner</dt><dd className="mt-1 font-medium">{graph.outcome.owner ?? "Not confirmed"}</dd></div>
              <div><dt className="text-xs text-black/45">Next step</dt><dd className="mt-1 font-medium">{graph.outcome.nextStep || "Not captured"}</dd></div>
            </dl>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-black/48">{mode === "seeded" ? "Seeded from the account record" : "Cold account"}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Scope the value session</h1>
          <p className="mt-2 text-sm text-black/55">
            {mode === "seeded" ? "Two questions · about three minutes" : "Company and attendees · about five minutes"}
          </p>
          {mode === "seeded" && (
            <p className="mt-1 text-sm text-black/55">You&apos;ve already done this work — it&apos;s in your CRM.</p>
          )}
          {mode === "seeded" && (
            <p className="mt-2 text-xs text-black/45">{crmBadge(brand.partnerName)}</p>
          )}
        </div>
        <ScopeNextStep
          complete={scopeComplete}
          guidance={scopeGuidance}
          secondaryAction={mode === "seeded" && scopeEditable ? (
              <Button variant="outline" onClick={clearToColdMode}>
                Start without the record
              </Button>
            ) : mode === "cold" && scopeEditable ? (
              <Button variant="outline" onClick={restoreSeededScope}>
                Use account record instead
              </Button>
            ) : null}
        />
      </div>

      {mode === "seeded" ? (
        <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,24rem)]">
          <div className="space-y-4">
            <section className="rounded-sm border border-black/10 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold">{heartlandAccountRecord.account.name}</h2>
                  <p className="mt-1 text-sm text-black/50">
                    {heartlandAccountRecord.account.industry} · {heartlandAccountRecord.account.revenue}
                  </p>
                </div>
                <div className="text-right text-sm">
                  <p className="font-medium">{heartlandAccountRecord.opportunity.name}</p>
                  <p className="mt-1 text-black/52">
                    {heartlandAccountRecord.opportunity.stage} · {formatCompactCurrency(heartlandAccountRecord.opportunity.value)}
                  </p>
                  <p className="mt-1 text-xs font-medium text-amber-800">
                    Close date pushed twice · last updated {heartlandAccountRecord.opportunity.weeksSinceUpdate} weeks ago
                  </p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-7 text-black/70">
                Dana Reyes called the claims team “drowning” on 14 Jan while raising board pressure on AI. The team handles a document-heavy intake process with PDF claim forms and a six-day cycle to first decision. Heartland covered Q1 volume with overtime rather than hiring. Compliance was flagged early: Robert Osei requires an audit trail on anything automated.
              </p>
            </section>

            <section className="rounded-sm border border-black/10 bg-white p-5">
              <h2 className="font-semibold">Confirm who is in the room</h2>
              <p className="mt-1 text-sm text-black/55">Enter a name from the Heartland record to confirm their role.</p>
              <Input
                className="mt-3 rounded-sm"
                value={seededNameCheck}
                onChange={(event) => setSeededNameCheck(event.target.value)}
                placeholder="Dana Reyes"
                aria-label="Confirm attendee name"
                readOnly={!scopeEditable}
              />
              {seededEnrichment && (
                <div className="mt-3 rounded-sm border border-black/10 bg-[#fafaf8] p-3 text-sm" role="status">
                  {seededEnrichment.kind === "known" ? (
                    <>
                      <p className="font-medium">{seededEnrichment.name} · {seededEnrichment.role}</p>
                      <p className="mt-1 text-black/62">{seededEnrichment.prompt}</p>
                      <div className="mt-2 flex gap-2">
                        <Button type="button" size="sm" variant="outline" onClick={() => setSeededNameCheck("")}>Yes</Button>
                        <Button type="button" size="sm" variant="outline" onClick={() => setSeededNameCheck("")}>No</Button>
                      </div>
                      <p className="mt-2 text-xs text-black/45">Source stays CRM.</p>
                    </>
                  ) : (
                    <p className="text-black/62">{seededEnrichment.prompt}</p>
                  )}
                </div>
              )}
            </section>

            <section className="rounded-sm border border-[var(--brand-accent)]/35 bg-[color-mix(in_srgb,var(--brand-accent)_4%,white)] p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold">Partner context</h2>
                  <p className="mt-1 text-xs font-medium text-black/48">Partner input · not from CRM</p>
                </div>
              </div>

              <PartnerContextForm
                key={partnerContext?.id ?? "new-partner-context"}
                context={partnerContext}
                canEdit={canEditSession}
                onSave={savePartnerNote}
              />

              <div className="mt-5 border-t border-black/10 pt-4">
                <p className="text-xs font-medium text-black/45">Pattern</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <ChoiceChip selected={graph.session.patternId === "document-intake"} disabled={!canEditSession} onClick={() => applyPattern("document-intake")}>Document-heavy intake</ChoiceChip>
                  <ChoiceChip selected={graph.session.patternId === "fraud-triage"} disabled={!canEditSession} onClick={() => applyPattern("fraud-triage")}>Fraud triage</ChoiceChip>
                </div>
                <p className="mt-4 text-xs font-medium text-black/45">Pilot spec</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <ChoiceChip selected={graph.session.reusePriorPilotSpec !== false} disabled={!canEditSession} onClick={() => applyReusePilot(true)}>Reuse prior spec</ChoiceChip>
                  <ChoiceChip selected={graph.session.reusePriorPilotSpec === false} disabled={!canEditSession} onClick={() => applyReusePilot(false)}>Start fresh</ChoiceChip>
                </div>
              </div>
            </section>

            <section className="rounded-sm border border-black/10 bg-white p-5">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-semibold">Matched pattern</h2>
                <span className="text-[11px] text-black/42">Curated library</span>
              </div>
              <p className="mt-3 text-sm leading-6 text-black/68">
                Matched on document volume and manual review. Typically $2M–$9M annually.
              </p>
              <p className="mt-3 text-sm font-semibold">
                {graph.session.patternId === "fraud-triage" ? "Fraud triage" : "Document-heavy intake"}
              </p>
            </section>

            <section className="rounded-sm border border-black/10 bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-semibold">Partner record</h2>
                <span className="rounded-sm border border-[var(--brand-accent)]/30 bg-[color-mix(in_srgb,var(--brand-accent)_8%,white)] px-2 py-0.5 text-[11px] text-black/70">
                  {prmBadge}
                </span>
              </div>
              <p className="mt-3 text-sm">{brand.partnerName} · AI & Data practice</p>
              <p className="mt-1 text-sm leading-6 text-black/62">
                Both prior pilots were document patterns — reuse that pilot spec?
              </p>
              <p className="mt-3 text-sm font-semibold">
                {graph.session.reusePriorPilotSpec === false ? "Starting a fresh pilot spec" : "Reusing the prior pilot spec"}
              </p>
            </section>

            <p className="px-1 text-sm leading-6 text-black/55">
              Not in the record: claim volume, current handling cost, whether Karen has seen anything.
            </p>

            <details className="group rounded-sm border border-black/10 bg-white p-5">
              <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold">
                <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
                Evidence behind the questions
              </summary>
              <div className="mt-4 space-y-4">
                <div>
                  <p className="text-xs font-medium text-black/45">Source notes</p>
                  <div className="mt-2 space-y-3">
                    {heartlandAccountRecord.notes.map((note) => (
                      <article key={`${note.date}-${note.author}`} className="rounded-sm bg-[#fafaf8] p-4">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-black/48">
                          <span>{note.date} · {note.author} · {note.kind}</span>
                          {note.partial && (
                            <span className="rounded-sm border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-amber-800">
                              Note incomplete
                            </span>
                          )}
                        </div>
                        <p className="mt-2 text-sm leading-6 text-black/68">{note.text}</p>
                      </article>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-black/45">Known contacts</p>
                  <ul className="mt-2 space-y-2 text-sm">
                    {heartlandAccountRecord.contacts.map((contact) => (
                      <li key={contact.name}>
                        <span className="font-medium">{contact.name}</span>
                        <span className="text-black/48"> · {contact.role}{contact.relationship ? ` · ${contact.relationship}` : ""}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </details>
          </div>

          <section className="rounded-sm border border-black/10 bg-white p-5 md:p-6 lg:sticky lg:top-24">
            <div className="flex items-center gap-2 border-b border-black/10 pb-4">
              <span className="grid size-7 place-items-center rounded-sm bg-black text-xs font-semibold text-white">AI</span>
              <div>
                <p className="text-sm font-semibold">Two things to confirm</p>
                <p className="text-xs text-black/45">The record supplies the rest · Seeded responses, no live model</p>
              </div>
            </div>

            <div className="mt-5 space-y-6">
              <div>
                <p className="text-xs font-medium text-black/45">1 of 2</p>
                <p className="mt-2 text-sm font-medium">Roughly how many claims a day?</p>
                <p className="mt-1 text-xs leading-5 text-black/48">The business case depends on this number, and it is not in the record.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {claimsChoices.map((chip) => (
                    <ChoiceChip
                      key={chip.value}
                      selected={claimsChoice === chip.value}
                      disabled={!canEditSession}
                      onClick={() => chooseClaims(chip.value)}
                    >
                      {chip.label}
                    </ChoiceChip>
                  ))}
                </div>
                {claimsChoice === "exact" && (
                  <ExactClaimsField
                    quantity={claimsQuantity}
                    disabled={!canEditSession}
                    onChange={applyExactClaims}
                  />
                )}
                {claimsChoice && claimsPayoffCopy(graph) && (
                  <p className="mt-3 whitespace-pre-line rounded-sm bg-[#fafaf8] p-3 text-sm leading-6 text-black/72">
                    {claimsPayoffCopy(graph)}
                  </p>
                )}
              </div>

              {observation && (
                <div ref={fundingRef} className="scroll-mt-24">
                  <p className="text-xs font-medium text-black/45">2 of 2</p>
                  <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-amber-950">
                    <TriangleAlert className="size-4" /> Economic-buyer observation
                  </p>
                  <p className="mt-2 text-sm leading-6 text-black/68">
                    Karen Whitfield, the economic buyer, has no logged activity. The close date has slipped twice. Those facts are likely related. I&apos;d get her in the room.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <ChoiceChip
                      selected={fundingRoute === "invite-karen"}
                      disabled={!canEditSession}
                      onClick={() => chooseFunding("invite-karen")}
                    >
                      Invite Karen
                    </ChoiceChip>
                    <ChoiceChip
                      selected={fundingRoute === "brief-dana"}
                      disabled={!canEditSession}
                      onClick={() => chooseFunding("brief-dana")}
                    >
                      Brief Dana to carry it
                    </ChoiceChip>
                  </div>
                  {fundingRoute && (
                    <p className="mt-3 text-xs font-medium text-black/58">
                      {fundingRoute === "invite-karen" ? "Karen is in the room" : "Dana carries the ask"} · step 5 updated
                    </p>
                  )}
                </div>
              )}

            </div>
          </section>
        </div>
      ) : (
        <ColdAccountEditor
          coldCompany={coldCompany}
          coldAttendees={coldAttendees}
          accountHit={false}
          canEdit={scopeEditable}
          setColdScope={setColdScope}
          coldGaps={coldGaps}
          graphAttendeeCount={graph.attendees.length}
        />
      )}
    </div>
  );
}

function PartnerContextForm({
  context,
  canEdit,
  onSave,
}: {
  context: PartnerNote | null;
  canEdit: boolean;
  onSave: (noteId: string | null, text: string) => void;
}) {
  const [draft, setDraft] = useState(context?.text ?? "");
  const savedText = context?.text ?? "";
  const unsaved = draft.trim() !== savedText;

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!canEdit || !draft.trim() || !unsaved) return;
    onSave(context?.id ?? null, draft);
  }

  return (
    <form onSubmit={submit} className="mt-4">
      <label className="text-sm font-medium">
        Partner context
        <Textarea
          value={draft}
          disabled={!canEdit}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Add partner context that is not in CRM…"
          className="mt-2 rounded-sm bg-white"
        />
      </label>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Button
          type="submit"
          size="sm"
          disabled={!canEdit || !draft.trim() || !unsaved}
        >
          Save context
        </Button>
        <p
          role="status"
          aria-live="polite"
          className={cn("text-xs font-medium", unsaved ? "text-amber-800" : "text-black/48")}
        >
          {unsaved
            ? savedText && "Unsaved changes"
            : savedText && "Saved · carried into the plan and business case"}
        </p>
      </div>
    </form>
  );
}

function ExactClaimsField({
  quantity,
  disabled,
  onChange,
}: {
  quantity: number | null;
  disabled: boolean;
  onChange: (quantity: number | null) => void;
}) {
  const [draft, setDraft] = useState(
    isValidExactClaimsVolume(quantity) ? String(quantity) : "",
  );
  const parsed = draft === "" ? null : Number(draft);
  const valid = isValidExactClaimsVolume(parsed);

  function update(value: string) {
    setDraft(value);
    onChange(value === "" ? null : Number(value));
  }

  return (
    <div className="mt-3">
      <label htmlFor="exact-claims" className="text-xs font-medium text-black/58">
        Claims per day
      </label>
      <Input
        id="exact-claims"
        aria-describedby="exact-claims-guidance"
        aria-invalid={draft !== "" && !valid}
        type="number"
        min={1}
        max={Number.MAX_SAFE_INTEGER}
        step={1}
        inputMode="numeric"
        value={draft}
        disabled={disabled}
        onChange={(event) => update(event.target.value)}
        className="mt-2"
      />
      <p
        id="exact-claims-guidance"
        className={cn("mt-2 text-xs", draft !== "" && !valid ? "text-amber-800" : "text-black/48")}
      >
        Enter a positive whole number of claims.
      </p>
    </div>
  );
}

function ScopeNextStep({
  complete,
  guidance,
  secondaryAction,
}: {
  complete: boolean;
  guidance: string;
  secondaryAction?: ReactNode;
}) {
  return (
    <div className="flex w-full flex-col items-start gap-2 sm:w-auto sm:items-end">
      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        {complete ? (
          <Link
            href="/plan"
            aria-describedby="scope-next-step-status"
            className={cn(buttonVariants({ className: "bg-[var(--brand-accent)] hover:bg-[var(--brand-accent-dark)]" }))}
          >
            Review session plan <ArrowRight />
          </Link>
        ) : (
          <Button type="button" disabled aria-describedby="scope-next-step-status">
            Review session plan <ArrowRight />
          </Button>
        )}
        {secondaryAction}
      </div>
      <p id="scope-next-step-status" role="status" aria-live="polite" className="text-xs text-black/55">
        {guidance}
      </p>
    </div>
  );
}

function ChoiceChip({
  selected,
  disabled,
  onClick,
  children,
}: {
  selected: boolean;
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => {
        if (disabled) return;
        onClick();
      }}
      disabled={disabled}
      aria-pressed={selected}
      className={cn("rounded-full font-normal", selected && "border-[var(--brand-accent)] bg-[color-mix(in_srgb,var(--brand-accent)_8%,white)]")}
    >
      {children}
    </Button>
  );
}
