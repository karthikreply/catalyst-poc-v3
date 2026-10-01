"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

import { Button, buttonVariants } from "@/components/ui/button";
import { useSession } from "@/components/session-provider";
import { pilotReadinessItems } from "@/lib/pilot-readiness";
import {
  nextUnmarkedIndex,
  sampleClaimFields,
  sampleClaims,
  sampleRunTallies,
  type SampleClaim,
  type SampleClaimFieldId,
} from "@/lib/sample-claims";
import type { SampleRun } from "@/lib/seed";
import {
  canBookHackathon,
  canMutateSampleRun,
  documentExtractionSolution,
  isCustomerViewer,
  sampleRunSolutionReady,
} from "@/lib/session";
import { cn } from "@/lib/utils";

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-accent)]";

function prefersReducedMotion() {
  return typeof window !== "undefined"
    && typeof window.matchMedia === "function"
    && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function actionClass(primary: boolean) {
  return primary
    ? buttonVariants({ className: "bg-[var(--brand-accent)] hover:bg-[var(--brand-accent-dark)]" })
    : cn(buttonVariants({ variant: "outline" }), "border-black/30 bg-[#f4f4f1] hover:bg-black/[.06]");
}

function BookHackathon({ primary = false }: { primary?: boolean }) {
  const { graph, viewer } = useSession();
  if (graph.hackathon?.booked) return null;
  const mayBook = canBookHackathon(viewer.actor) && graph.ranking.selected.length === 3;
  if (!mayBook) {
    return <Button type="button" disabled className="opacity-50">Book the hackathon</Button>;
  }
  return (
    <Link href="/artifact" className={actionClass(primary)}>Book the hackathon</Link>
  );
}

function statusLine(run: SampleRun | null) {
  if (!run || run.status === "not-run") return "Not run yet";
  const { reviewed, fix } = sampleRunTallies(run.marks);
  if (run.status === "reviewed") return `Reviewed 8 of 8 · ${fix} need a fix`;
  return `Reviewed ${reviewed} of 8`;
}

function fieldLabel(fieldId: string) {
  return sampleClaimFields.find((field) => field.id === fieldId)?.label ?? fieldId;
}

function ClaimLines({ lines }: { lines: SampleClaim["lines"] }) {
  return (
    <dl className="mt-3 space-y-2">
      {lines.map((line) => (
        <div key={`${line.label}-${line.value}`}>
          <dt className="text-xs font-medium text-black/45">{line.label}</dt>
          <dd className="text-sm leading-6">{line.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function ClaimDocument({ claim }: { claim: SampleClaim }) {
  return (
    <div className="rounded-sm border border-black/15 bg-[#fafaf8] p-4">
      <h2 className="text-sm font-semibold">The claim</h2>
      {claim.pages ? claim.pages.map((page) => (
        <div key={page.heading} className="mt-4 border-t border-black/10 pt-3 first:mt-0 first:border-t-0 first:pt-0">
          <p className="text-xs font-medium text-black/45">{page.heading}</p>
          <ClaimLines lines={page.lines} />
        </div>
      )) : <ClaimLines lines={claim.lines} />}
      {claim.marginNote && (
        <div className="mt-4 rounded-sm border border-black/30 bg-white p-3">
          <p className="text-xs font-medium text-black/45">Handwritten margin note</p>
          <p
            className="mt-2 text-lg leading-7 text-black/80"
            style={{ fontFamily: '"Segoe Script", "Brush Script MT", cursive' }}
          >
            {claim.marginNote}
          </p>
        </div>
      )}
    </div>
  );
}

function UnavailableRun() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-10 lg:px-8">
      <h1 className="max-w-2xl text-3xl font-semibold tracking-tight">A sample run for this solution isn&apos;t available yet.</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-black/58">The hackathon will start from your own documents.</p>
      <div className="mt-6"><BookHackathon /></div>
    </div>
  );
}

function PdmSampleRun({ run }: { run: SampleRun | null }) {
  return (
    <div className="mx-auto max-w-3xl px-5 py-10 lg:px-8">
      <h1 className="text-3xl font-semibold tracking-tight">Sample run</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-black/70">Sample runs are partner-held. The platform vendor sees counts in Telemetry.</p>
      <p className="mt-4 text-sm font-medium">{statusLine(run)}</p>
      <div className="mt-6"><BookHackathon /></div>
    </div>
  );
}

function PartnerSampleRun({ run }: { run: SampleRun | null }) {
  const fixes = sampleClaims.flatMap((claim) => {
    const mark = run?.marks[claim.id];
    if (mark?.verdict !== "fix") return [];
    const fields = mark.fields.map(fieldLabel).join(", ");
    return [{ id: claim.id, label: claim.label, fields }];
  });

  return (
    <div className="mx-auto max-w-3xl px-5 py-10 lg:px-8">
      <p className="text-sm text-black/48">The customer&apos;s marks on made-up claims. Not evidence.</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight">Sample run</h1>
      <p className="mt-4 text-sm font-medium">{statusLine(run)}</p>
      {fixes.length > 0 && (
        <section className="mt-6 rounded-sm border border-black/10 bg-white p-6">
          <h2 className="text-lg font-semibold">Where it broke</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm leading-6">
            {fixes.map((claim) => (
              <li key={claim.id}>{claim.fields ? `${claim.label} · ${claim.fields}` : claim.label}</li>
            ))}
          </ul>
        </section>
      )}
      <section className="mt-6 rounded-sm border border-black/10 bg-white p-6">
        <h2 className="text-lg font-semibold">Before the real hackathon</h2>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm leading-6 text-black/70">
          {pilotReadinessItems.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </section>
      <div className="mt-6"><BookHackathon /></div>
    </div>
  );
}

export default function TryPage() {
  const {
    graph,
    viewer,
    startSampleRun,
    markSampleClaim,
    setSamplePosition,
    startOverSampleRun,
  } = useSession();
  const [running, setRunning] = useState(false);
  const [editingFix, setEditingFix] = useState(false);
  const [browsing, setBrowsing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const startRef = useRef(startSampleRun);

  useEffect(() => {
    startRef.current = startSampleRun;
  }, [startSampleRun]);

  useEffect(() => {
    if (!running) return;
    const timer = window.setTimeout(() => {
      startRef.current();
      setRunning(false);
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [running]);

  const ready = sampleRunSolutionReady(graph);
  const booked = Boolean(graph.hackathon?.booked);
  const canMark = canMutateSampleRun(viewer.actor, graph);
  const customer = isCustomerViewer(viewer.actor);
  const run = graph.sampleRun;
  const solutionTitle = documentExtractionSolution(graph)?.title ?? "";

  if (!ready) return <UnavailableRun />;
  if (viewer.actor === "pdm") return <PdmSampleRun run={run} />;
  if (!customer && !canMark) return <PartnerSampleRun run={run} />;

  const tallies = sampleRunTallies(run?.marks ?? {});
  const index = Math.min(sampleClaims.length - 1, Math.max(0, run?.position ?? 0));
  const claim = sampleClaims[index];
  const mark = run?.marks[claim.id];
  const showSummary = run?.status === "reviewed" && !browsing && !editingFix;
  const showReview = Boolean(run && (run.status === "ran" || run.status === "reviewed") && !running && !showSummary);

  function runSample() {
    if (!canMark) return;
    setConfirming(false);
    if (prefersReducedMotion()) {
      startSampleRun();
      return;
    }
    setRunning(true);
  }

  function onRight() {
    if (!canMark) return;
    setEditingFix(false);
    setConfirming(false);
    if (run?.status === "reviewed") setBrowsing(true);
    markSampleClaim(claim.id, "right", [], true);
  }

  function onFix() {
    if (!canMark) return;
    setEditingFix(true);
    setConfirming(false);
    markSampleClaim(claim.id, "fix", mark?.fields ?? [], false);
  }

  function toggleField(fieldId: SampleClaimFieldId) {
    if (!canMark) return;
    const current = new Set(mark?.verdict === "fix" ? mark.fields : []);
    if (current.has(fieldId)) current.delete(fieldId);
    else current.add(fieldId);
    markSampleClaim(claim.id, "fix", [...current], false);
  }

  function leaveFix() {
    setEditingFix(false);
    const marks = run?.marks ?? {};
    const complete = sampleRunTallies(marks).reviewed >= sampleClaims.length;
    if (!complete) setSamplePosition(nextUnmarkedIndex(marks, index));
  }

  function go(next: number) {
    setEditingFix(false);
    if (run?.status === "reviewed") setBrowsing(true);
    setSamplePosition(next);
  }

  function reviewAnswers() {
    setBrowsing(true);
    setEditingFix(false);
    setConfirming(false);
    setSamplePosition(0);
  }

  function confirmStartOver() {
    startOverSampleRun();
    setRunning(false);
    setEditingFix(false);
    setBrowsing(false);
    setConfirming(false);
  }

  return (
    <div className="mx-auto max-w-5xl px-5 py-10 lg:px-8">
      <p className="text-sm text-black/48">{graph.session.customerName}</p>

      {running && (
        <>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Reading eight claims…</h1>
          <div className="mt-6"><BookHackathon /></div>
        </>
      )}

      {!running && !showReview && !showSummary && (
        <>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">{booked ? "Preview day two on eight sample claims" : "Try it on eight sample claims"}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-black/58">{booked ? "A preview of day two. Nothing here is measured, and none of it goes into your business case." : "About three minutes. Nothing here is measured, and none of it goes into your business case."}</p>
          <p className="mt-4 text-sm leading-6 text-black/70">{solutionTitle}. Each claim is read, and you say whether it came back right.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            {canMark && (
              <Button type="button" onClick={runSample} className="bg-[var(--brand-accent)] hover:bg-[var(--brand-accent-dark)]">
                Run on the sample claims
              </Button>
            )}
            <BookHackathon />
          </div>
          <p className="mt-8 text-xs text-black/45">Illustrative run on made-up claims. The real hackathon uses your own documents.</p>
        </>
      )}

      {showReview && (
        <>
          <p className="mt-2 text-sm text-black/55" aria-live="polite">{tallies.reviewed} of 8 reviewed</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Claim {index + 1} of 8</h1>
          <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
            <ClaimDocument claim={claim} />
            <div className="rounded-sm border border-black/15 bg-white p-4">
              <h2 className="text-sm font-semibold">What came back</h2>
              <dl className="mt-3 space-y-2">
                {sampleClaimFields.map((field) => (
                  <div key={field.id}>
                    <dt className="text-xs font-medium text-black/45">{field.label}</dt>
                    <dd className="text-sm leading-6">{claim.extracted[field.id]}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
          {canMark && (
            <div className="mt-6 flex flex-wrap gap-3">
              <Button type="button" variant={mark?.verdict === "right" ? "default" : "outline"} aria-pressed={mark?.verdict === "right"} onClick={onRight} className={mark?.verdict === "right" ? "bg-[var(--brand-accent)] hover:bg-[var(--brand-accent-dark)]" : undefined}>
                Looks right
              </Button>
              <Button type="button" variant={mark?.verdict === "fix" ? "default" : "outline"} aria-pressed={mark?.verdict === "fix"} onClick={onFix}>
                Needs a fix
              </Button>
            </div>
          )}
          {canMark && mark?.verdict === "fix" && (
            <div className="mt-4">
              <p className="text-sm text-black/70">
                Which field?{" "}
                <button type="button" className={cn("underline underline-offset-2", focusRing)} onClick={leaveFix}>
                  Skip if you&apos;re not sure
                </button>
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                  {sampleClaimFields.map((field) => {
                    const selected = mark.fields.includes(field.id);
                    return (
                      <Button key={field.id} type="button" size="sm" variant="outline" aria-pressed={selected} onClick={() => toggleField(field.id)} className={selected ? "border-[var(--brand-accent)]" : undefined}>
                        {field.label}
                      </Button>
                    );
                  })}
              </div>
            </div>
          )}
          <div className="mt-6 flex flex-wrap gap-3">
            <Button type="button" variant="outline" onClick={() => go(Math.max(0, index - 1))}>Previous</Button>
            <Button type="button" variant="outline" onClick={() => go(Math.min(sampleClaims.length - 1, index + 1))}>Next</Button>
            <BookHackathon />
          </div>
        </>
      )}

      {showSummary && run && (
        <>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">{tallies.right} of 8 look right</h1>
          <p className="mt-2 text-lg">{tallies.fix} need a fix.</p>
          <p className="mt-6 max-w-2xl text-sm leading-6 text-black/70">We chose two claims to be hard on purpose: a handwritten margin note on claim 3, and a three-page claim whose policy number changed on claim 6. These are where the three days would start.</p>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-black/70">Eight made-up claims can&apos;t measure accuracy. The hackathon works on your own documents.</p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            {booked ? (
              <Link href="/pilot-spec" className={actionClass(true)}>Back to the pilot spec</Link>
            ) : (
              <BookHackathon primary />
            )}
            <Button type="button" variant="outline" onClick={reviewAnswers}>Review answers</Button>
            {canMark && (confirming ? (
              <button type="button" className={cn("text-sm text-black/55 underline underline-offset-2", focusRing)} onClick={confirmStartOver}>
                Confirm start over
              </button>
            ) : (
              <button type="button" className={cn("text-sm text-black/45 underline underline-offset-2", focusRing)} onClick={() => setConfirming(true)}>
                Start over
              </button>
            ))}
          </div>
          {booked && graph.hackathon && (
            <section className="mt-6 rounded-sm border border-black/10 bg-white p-6">
              <h2 className="text-lg font-semibold">Before the hackathon on {graph.hackathon.date}</h2>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm leading-6 text-black/70">
                {pilotReadinessItems.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
