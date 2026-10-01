"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Lightbulb, Pencil, Plus } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { GhostLedgerPanel } from "@/components/ghost-ledger-panel";
import { Input } from "@/components/ui/input";
import { useSession } from "@/components/session-provider";
import { ValueSprintPanel } from "@/components/value-sprint-panel";
import { nextQuestionSuggestion } from "@/lib/facilitation";
import { isCustomerViewer, agendaForSession, handoffLabel } from "@/lib/session";
import type { Capture, Handoff, HandoffKind } from "@/lib/seed";
import { cn } from "@/lib/utils";

export default function RunPage() {
  const { graph, brand, addCapture, updateCapture, saveSessionOutcome, setActiveStep, canEditSession, viewer, recordHandoff } = useSession();
  const agenda = agendaForSession(graph);
  const activeStep = agenda.find((step) => step.state === "active") ?? agenda[2];
  const activeIndex = Math.max(0, agenda.findIndex((step) => step.id === activeStep.id));
  const prevStep = activeIndex > 0 ? agenda[activeIndex - 1] : null;
  const nextStep = activeIndex < agenda.length - 1 ? agenda[activeIndex + 1] : null;
  const isLastStep = !nextStep;
  const capturePeople = graph.attendees.map((attendee) => attendee.name);
  const [captureText, setCaptureText] = useState("");
  const [person, setPerson] = useState(capturePeople[0] ?? "Participant");
  const [suggesting, setSuggesting] = useState(false);
  const [suggestion, setSuggestion] = useState<{ stepId: string; text: string } | null>(null);
  const selfService = graph.session.delivery === "self-service";
  const customer = isCustomerViewer(viewer.actor);
  const showHandoff = viewer.actor === "partner" && activeStep.id === "owner-and-ask";
  const selectedPerson = capturePeople.includes(person) ? person : capturePeople[0] ?? "Participant";
  const capturePerson = selfService ? capturePeople[0] ?? "Respondent" : selectedPerson;

  function submitCapture(event: FormEvent) {
    event.preventDefault();
    if (!captureText.trim() || !canEditSession) return;
    addCapture({ stepId: activeStep.id, attributedTo: capturePerson, text: captureText.trim() });
    setCaptureText("");
  }

  function suggestQuestion() {
    if (!canEditSession) return;
    setSuggesting(true);
    window.setTimeout(() => {
      const previous = suggestion?.stepId === activeStep.id ? suggestion.text : null;
      setSuggestion({
        stepId: activeStep.id,
        text: nextQuestionSuggestion(graph, activeStep.id, previous),
      });
      setSuggesting(false);
    }, 450);
  }

  return (
    <div className="mx-auto max-w-[1440px]">
      {selfService && (
        <p className="border-b border-black/10 bg-[#fafaf8] px-5 py-2 text-xs text-black/55 lg:px-8">Customer self-service — no partner facilitator present. Output is a qualification-grade business case.</p>
      )}
      {isCustomerViewer(viewer.actor) && !canEditSession && (
        <p className="border-b border-black/10 bg-[#fafaf8] px-5 py-2 text-xs text-black/55 lg:px-8">Historical session record — the platform vendor sees completed evidence shared by the partner, not live session activity.</p>
      )}

      <div className="grid min-h-[calc(100vh-181px)] md:grid-cols-[180px_1fr]">
        <aside className="border-b border-black/10 bg-white p-4 md:border-b-0 md:border-r">
          <div className="grid grid-cols-5 gap-2 md:block md:space-y-1">
            {agenda.map((step) => (
              <div key={step.id}>
                <button
                  type="button"
                  onClick={() => setActiveStep(step.id)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-sm px-2 py-2.5 text-left text-xs transition-colors hover:bg-black/[.04] focus-visible:outline-2",
                    step.state === "active" && "bg-black/[.05] font-semibold",
                    step.state === "upcoming" && "text-black/45",
                  )}
                >
                  <span
                    className="grid size-5 shrink-0 place-items-center rounded-full border border-black/15 text-[10px]"
                    style={step.state !== "upcoming" ? { background: brand.accent, borderColor: brand.accent, color: "white" } : undefined}
                  >
                    {step.state === "done" ? <Check className="size-3" /> : step.order}
                  </span>
                  <span className="hidden md:block">{step.title}</span>
                </button>
              </div>
            ))}
          </div>
        </aside>

        <section className="p-5 lg:p-8">
          <div className="mx-auto max-w-5xl">
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:justify-between">
              <div className="min-w-0 flex-1">
                <p className="mb-2 text-sm font-medium text-black/45">
                  Step {activeStep.order} of {agenda.length} · {activeStep.title} · {activeStep.durationMinutes} min
                </p>
                <h2 className="max-w-4xl text-2xl font-semibold leading-tight tracking-tight md:text-3xl">{activeStep.prompt}</h2>
                {activeStep.subPrompt && (
                  <p className="mt-2 text-sm text-black/55">{activeStep.subPrompt}</p>
                )}
              </div>
              {(!customer || !isLastStep) && (
                <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
                  {!customer && (
                    <AgendaStepPrimary
                      nextStep={nextStep}
                      isLastStep={isLastStep}
                      onContinue={(stepId) => setActiveStep(stepId)}
                    />
                  )}
                  {!isLastStep && (
                    <Link href="/rank" className="text-center text-sm text-black/55 underline-offset-4 hover:underline sm:text-right">
                      Skip to rank
                    </Link>
                  )}
                </div>
              )}
            </div>
            {!selfService && (
              <div className="mt-4 max-w-4xl">
                {suggestion?.stepId === activeStep.id ? (
                  <aside className="border-l-4 border-[var(--brand-accent)] bg-black/[.035] px-4 py-3" aria-live="polite">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-black/50">
                        <Lightbulb className="size-4" /> Ask next
                      </p>
                      <Button variant="outline" size="sm" onClick={suggestQuestion} disabled={suggesting || !canEditSession}>
                        <Lightbulb />{suggesting ? "Thinking…" : "Suggest another"}
                      </Button>
                    </div>
                    <p className="mt-1 text-sm leading-6 text-black/75">{suggestion.text}</p>
                  </aside>
                ) : (
                  <Button variant="outline" onClick={suggestQuestion} disabled={suggesting || !canEditSession}>
                    <Lightbulb />{suggesting ? "Thinking…" : "Suggest a question to ask"}
                  </Button>
                )}
              </div>
            )}

            {graph.session.mechanic === "ghost-ledger" ? <GhostLedgerPanel /> : <ValueSprintPanel />}

            <AgendaStepNav
              className="mt-5"
              prevStep={prevStep}
              nextStep={nextStep}
              isLastStep={isLastStep}
              onBack={(stepId) => setActiveStep(stepId)}
              onContinue={(stepId) => setActiveStep(stepId)}
            />

            <div className="mt-7">
              <div className="mb-3 flex items-end justify-between">
                <div>
                  <h3 className="font-semibold">What we heard</h3>
                  <p className="text-sm text-black/50">Every note stays attributed to someone in the room.</p>
                </div>
                <span className="text-xs text-black/40">{graph.captures.length} captures</span>
              </div>
              <div className="divide-y divide-black/10 rounded-sm border border-black/10 bg-white">
                {graph.captures.length === 0 && (
                  <p className="p-4 text-sm text-black/55">No captures yet. Attribute each note to someone in the room.</p>
                )}
                {graph.captures.map((capture) => (
                  <CaptureRow
                    key={capture.id}
                    capture={capture}
                    people={capturePeople}
                    canEdit={canEditSession}
                    showAttribution={!selfService}
                    onSave={updateCapture}
                  />
                ))}
                {canEditSession && (
                  <form onSubmit={submitCapture} className="flex flex-wrap items-center gap-2 p-3">
                    {!selfService && (
                      <label>
                        <span className="sr-only">Attribute capture to</span>
                        <select value={selectedPerson} onChange={(event) => setPerson(event.target.value)} className="h-9 rounded-sm border border-black/15 bg-white px-2 text-sm outline-none focus:border-[var(--brand-accent)]">
                          {capturePeople.map((name) => <option key={name}>{name}</option>)}
                        </select>
                      </label>
                    )}
                    <label className="min-w-[220px] flex-1">
                      <span className="sr-only">Capture what was agreed</span>
                      <Input value={captureText} onChange={(event) => setCaptureText(event.target.value)} placeholder="Capture what was agreed…" className="rounded-sm" />
                    </label>
                    <Button type="submit" variant="outline" size="sm"><Plus /> Add capture</Button>
                  </form>
                )}
              </div>
            </div>

            {canEditSession && (
              <SessionOutcomeForm
                key={`${graph.session.id}-outcome`}
                useCase={graph.outcome.useCase}
                constraint={graph.outcome.constraint}
                nextStep={graph.outcome.nextStep}
                onSave={saveSessionOutcome}
              />
            )}

            {showHandoff && <HandoffControls handoff={graph.session.handoff} onRecord={recordHandoff} />}

            <div className="h-20" aria-hidden />
          </div>
        </section>
      </div>

      {!customer && (
        <div className="sticky bottom-0 z-20 border-t border-black/10 bg-white/95 px-5 py-3 backdrop-blur lg:px-8">
          <div className="mx-auto max-w-5xl md:pl-[180px]">
            <AgendaStepNav
              prevStep={prevStep}
              nextStep={nextStep}
              isLastStep={isLastStep}
              onBack={(stepId) => setActiveStep(stepId)}
              onContinue={(stepId) => setActiveStep(stepId)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function AgendaStepPrimary({
  nextStep,
  isLastStep,
  onContinue,
}: {
  nextStep: { id: string; title: string } | null;
  isLastStep: boolean;
  onContinue: (stepId: string) => void;
}) {
  if (isLastStep || !nextStep) {
    return (
      <Link
        href="/rank"
        className={buttonVariants({ className: "bg-[var(--brand-accent)] text-white hover:bg-[var(--brand-accent-dark)]" })}
      >
        Rank solutions <ArrowRight />
      </Link>
    );
  }
  return (
    <Button
      type="button"
      className="bg-[var(--brand-accent)] text-white hover:bg-[var(--brand-accent-dark)]"
      onClick={() => onContinue(nextStep.id)}
    >
      Continue to {nextStep.title} <ArrowRight />
    </Button>
  );
}

function AgendaStepNav({
  prevStep,
  nextStep,
  isLastStep,
  onBack,
  onContinue,
  className,
}: {
  prevStep: { id: string; title: string } | null;
  nextStep: { id: string; title: string } | null;
  isLastStep: boolean;
  onBack: (stepId: string) => void;
  onContinue: (stepId: string) => void;
  className?: string;
}) {
  return (
    <nav
      aria-label="Agenda step"
      className={cn("flex flex-wrap items-center justify-between gap-3", className)}
    >
      {prevStep ? (
        <Button type="button" variant="outline" onClick={() => onBack(prevStep.id)}>
          <ArrowLeft /> Back to {prevStep.title}
        </Button>
      ) : (
        <span />
      )}
      {isLastStep || !nextStep ? (
        <Link
          href="/rank"
          className={buttonVariants({ className: "bg-[var(--brand-accent)] text-white hover:bg-[var(--brand-accent-dark)]" })}
        >
          Rank solutions <ArrowRight />
        </Link>
      ) : (
        <Button
          type="button"
          className="bg-[var(--brand-accent)] text-white hover:bg-[var(--brand-accent-dark)]"
          onClick={() => onContinue(nextStep.id)}
        >
          Continue to {nextStep.title} <ArrowRight />
        </Button>
      )}
    </nav>
  );
}

function HandoffControls({ handoff, onRecord }: { handoff: Handoff | null; onRecord: (kind: HandoffKind) => void }) {
  const recorded = Boolean(handoff);
  return (
    <section className="mt-7" aria-labelledby="handoff-title">
      <div className="mb-3">
        <h3 id="handoff-title" className="font-semibold">Hand off</h3>
        <p className="text-sm text-black/50">Record what you do with this session. The first choice sticks.</p>
      </div>
      <div className="flex flex-wrap items-center gap-2 rounded-sm border border-black/10 bg-white p-4">
        <Link
          href="/funding"
          onClick={() => onRecord("daf")}
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          Prepare the DAF claim <ArrowRight />
        </Link>
        <Button type="button" variant="outline" size="sm" disabled={recorded} onClick={() => onRecord("pilot")}>
          File the pilot
        </Button>
        <Button type="button" variant="outline" size="sm" disabled={recorded} onClick={() => onRecord("pdm-notified")}>
          Notify the PDM
        </Button>
        <p role="status" aria-live="polite" className="ml-auto text-xs font-medium text-black/58">
          {handoffLabel(handoff)}
        </p>
      </div>
    </section>
  );
}

function SessionOutcomeForm({
  useCase,
  constraint,
  nextStep,
  onSave,
}: {
  useCase: string;
  constraint: string;
  nextStep: string;
  onSave: (update: { useCase: string; constraint: string; nextStep: string }) => void;
}) {
  const [draft, setDraft] = useState({ useCase, constraint, nextStep });
  const unsaved = draft.useCase.trim() !== useCase
    || draft.constraint.trim() !== constraint
    || draft.nextStep.trim() !== nextStep;

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!unsaved) return;
    onSave(draft);
  }

  const fields = [
    ["Use case", "useCase", "What this pilot would do"],
    ["Constraint", "constraint", "What has to be true to proceed"],
    ["Next step", "nextStep", "What happens after this session"],
  ] as const;

  return (
    <form onSubmit={submit} className="mt-7">
      <div className="mb-3">
        <h3 className="font-semibold">What the session agreed</h3>
        <p className="text-sm text-black/50">Carried into the business case and the pilot setup brief.</p>
      </div>
      <div className="grid gap-3 rounded-sm border border-black/10 bg-white p-4 sm:grid-cols-3">
        {fields.map(([label, field, placeholder]) => (
          <label key={field} className="text-sm font-medium">
            {label}
            <Input
              value={draft[field]}
              onChange={(event) => setDraft((current) => ({ ...current, [field]: event.target.value }))}
              placeholder={placeholder}
              className="mt-2 rounded-sm"
            />
          </label>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Button type="submit" size="sm" disabled={!unsaved}>Save outcome</Button>
        <p
          role="status"
          aria-live="polite"
          className={cn("text-xs font-medium", unsaved ? "text-amber-800" : "text-black/48")}
        >
          {unsaved ? "Unsaved changes" : "Saved · carried into the business case and pilot brief"}
        </p>
      </div>
    </form>
  );
}

function CaptureRow({
  capture,
  people,
  canEdit,
  showAttribution,
  onSave,
}: {
  capture: Capture;
  people: string[];
  canEdit: boolean;
  showAttribution: boolean;
  onSave: (captureId: string, update: { attributedTo: string; text: string }) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(capture.text);
  const [attributedTo, setAttributedTo] = useState(capture.attributedTo);

  function save(event: FormEvent) {
    event.preventDefault();
    if (!text.trim()) return;
    onSave(capture.id, { attributedTo, text });
    setEditing(false);
  }

  function cancel() {
    setText(capture.text);
    setAttributedTo(capture.attributedTo);
    setEditing(false);
  }

  if (editing) {
    return (
      <form onSubmit={save} className="flex flex-wrap items-center gap-2 p-3">
        {showAttribution && (
          <label>
            <span className="sr-only">Change attributed speaker</span>
            <select value={attributedTo} onChange={(event) => setAttributedTo(event.target.value)} className="h-9 rounded-sm border border-black/15 bg-white px-2 text-sm outline-none focus:border-[var(--brand-accent)]">
              {(people.includes(attributedTo) ? people : [attributedTo, ...people]).map((name) => <option key={name}>{name}</option>)}
            </select>
          </label>
        )}
        <label className="min-w-[220px] flex-1">
          <span className="sr-only">Edit capture text</span>
          <Input value={text} onChange={(event) => setText(event.target.value)} className="rounded-sm" />
        </label>
        <Button type="submit" size="sm" disabled={!text.trim()}>Save</Button>
        <Button type="button" variant="ghost" size="sm" onClick={cancel}>Cancel</Button>
      </form>
    );
  }

  return (
    <div className="grid gap-1 p-4 sm:grid-cols-[150px_1fr_auto]">
      <p className="text-sm font-semibold">{capture.attributedTo}</p>
      <p className="text-sm leading-6 text-black/70">{capture.text}</p>
      {canEdit && (
        <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(true)}>
          <Pencil /> Edit
        </Button>
      )}
    </div>
  );
}
