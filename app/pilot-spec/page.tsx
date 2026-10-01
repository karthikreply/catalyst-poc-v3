"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, ChevronDown, Clipboard } from "lucide-react";

import { CustomerAccountPending } from "@/components/customer-account-pending";
import { Button, buttonVariants } from "@/components/ui/button";
import { useSession } from "@/components/session-provider";
import { UnavailableControl } from "@/components/unavailable-control";
import { ThreeDayShapeList } from "@/components/what-the-three-days-will-be";
import { pilotReadinessItems } from "@/lib/pilot-readiness";
import { patterns, type Actor, type SessionGraph } from "@/lib/seed";
import { canFlagReferenceStory, isCustomerViewer, pilotNextStepCopy, pilotScopeLine, pilotSpecUseCase, sampleRunEntryReady, sampleRunStatusLabel, sessionHasNamedCompany, showsSampleRunLink } from "@/lib/session";
import { cn } from "@/lib/utils";

const enableList = `# Enable list — customer cloud account
# This is a briefing, not a provisioner.
services:
  - document-store    # hold 500 anonymised claim packets
  - identity          # named owners and review roles
  - logging           # audit trail for assisted decisions
  - review-queue      # human review for low-confidence fields
  - extraction-worker # run extraction against the sample set
`;

const services = [
  ["Document store", "Holds the 500 anonymised claim packets."],
  ["Identity", "Names who can confirm and review extractions."],
  ["Logging", "Audit trail for every assisted decision."],
  ["Review queue", "Low-confidence fields go to a human."],
  ["Extraction worker", "Runs extraction against the agreed sample."],
];

function SampleRunEntry({ graph, actor }: { graph: SessionGraph; actor: Actor }) {
  if (!sampleRunEntryReady(graph)) return null;
  if (showsSampleRunLink(actor, graph)) {
    const label = graph.hackathon?.booked ? "Preview day two" : "Try it on eight sample claims";
    return (
      <p className="mt-1">
        <Link href="/try" className="text-sm underline underline-offset-2">{label}</Link>
      </p>
    );
  }
  if (actor === "pdm") {
    return <p className="mt-1 text-sm text-black/70">{sampleRunStatusLabel(graph)}</p>;
  }
  return null;
}

export default function PilotSpecPage() {
  const { graph, brand, viewer } = useSession();
  const [copied, setCopied] = useState(false);
  const [briefCopied, setBriefCopied] = useState(false);
  if (isCustomerViewer(viewer.actor) && !sessionHasNamedCompany(graph)) {
    return <CustomerAccountPending message="This is written once your account is in the session." />;
  }
  const pattern = patterns.find((item) => item.id === graph.session.patternId)!;
  const compliancePerson = graph.attendees.find((attendee) => /compliance|risk|audit/i.test(attendee.role));
  const compliance = graph.captures.find((capture) => capture.attributedTo === compliancePerson?.name);
  const owner = graph.outcome.owner ?? "Owner not yet confirmed";
  const constraintAttribution = compliance && compliancePerson
    ? `${compliancePerson.name}, ${compliancePerson.role}`
    : "agreed in session · no named confirmer";
  const useCase = pilotSpecUseCase(graph);
  const scopeLine = pilotScopeLine(graph);
  const constraint = (compliance?.text ?? graph.outcome.constraint) || "Not captured";
  const nextStep = pilotNextStepCopy(graph) || "Not captured";

  async function copySnippet() {
    await navigator.clipboard.writeText(enableList);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  async function copyBrief() {
    const brief = [
      `Pilot setup brief — ${graph.session.customerName}`,
      `Use case: ${useCase}`,
      `Owner: ${owner}`,
      `Constraint: ${constraint}`,
      `Next step: ${nextStep}`,
      ...(scopeLine ? [`Scope: ${scopeLine}`] : []),
      "",
      "Requirements:",
      ...services.map(([name, reason]) => `- ${name}: ${reason}`),
      "",
      enableList,
    ].join("\n");
    await navigator.clipboard.writeText(brief);
    setBriefCopied(true);
    window.setTimeout(() => setBriefCopied(false), 1600);
  }

  return (
    <div className="mx-auto max-w-5xl px-5 py-10 lg:px-8">
      <p className="text-sm text-black/48">{graph.session.customerName}</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight">What the funded pilot consists of</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-black/58">The six-week funded slice, not a workshop agenda. {graph.session.customerName}&apos;s team would stand this up in their own account.</p>

      <div className="sticky top-16 z-20 -mx-5 mt-6 border-y border-black/10 bg-white/95 px-5 py-3 backdrop-blur lg:-mx-8 lg:px-8">
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={copyBrief} className="bg-[var(--brand-accent)] hover:bg-[var(--brand-accent-dark)]">
            {briefCopied ? <Check /> : <Clipboard />}{briefCopied ? "Setup brief copied" : "Copy setup brief"}
          </Button>
          {!isCustomerViewer(viewer.actor) && (
            <Link href="/telemetry" className={cn(buttonVariants({ variant: "outline" }), "border-black/30 bg-[#f4f4f1] hover:bg-black/[.06]")}>
              View telemetry <ArrowRight />
            </Link>
          )}
          <p className="text-sm text-black/55">
            The brief goes to {graph.session.customerName}&apos;s build team; they stand the environment up after security review.
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-5">
        <section className="rounded-sm border border-black/10 bg-white p-6">
          <h2 className="text-lg font-semibold">Inherited from the session</h2>
          <dl className="mt-4 grid gap-px overflow-hidden rounded-sm border border-black/10 bg-black/10 sm:grid-cols-2">
            {[
              ["Use case", useCase],
              ["Owner", owner],
              ["Constraint", constraint === "Not captured" ? constraint : `${constraint} (${constraintAttribution})`],
              ["Next step", nextStep],
              ...(scopeLine ? [["Scope", scopeLine]] : []),
              ...(graph.session.reusePriorPilotSpec == null
                ? []
                : [[
                    "Spec source",
                    graph.session.reusePriorPilotSpec
                      ? "Reused from prior funded document-pattern pilots"
                      : "New spec from this session",
                  ]]),
            ].map(([term, detail]) => (
              <div key={term} className="bg-white p-4"><dt className="text-xs font-medium text-black/45">{term}</dt><dd className="mt-1 text-sm leading-6">{detail}</dd></div>
            ))}
          </dl>
          <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-amber-800">
            {pilotReadinessItems.map((item) => <li key={item}>{item}</li>)}
          </ul>
          <h3 id="pilot-spec-three-days" className="mt-6 text-base font-semibold">What the three days will be.</h3>
          <ThreeDayShapeList
            labelledBy="pilot-spec-three-days"
            afterDay={{ "Day 2": <SampleRunEntry graph={graph} actor={viewer.actor} /> }}
          />
        </section>

        {canFlagReferenceStory(viewer.actor) && (
          <section className="rounded-sm border border-black/10 bg-white p-6">
            <h2 className="text-lg font-semibold">Reference story</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-black/58">
              Pushes attributed session evidence to {brand.partnerName}&apos;s PRM so its marketing team can turn the business case into a case study.
            </p>
            <div className="mt-4">
              <UnavailableControl
                label="Flag as reference story"
                owner={brand.partnerName}
                explanation="Would send the attributed business-case evidence to the partner PRM for marketing review."
              />
            </div>
          </section>
        )}

        <section className="rounded-sm border border-black/10 bg-white p-6">
          <h2 className="text-lg font-semibold">Reusable pilot setup</h2>
          <p className="mt-2 text-sm text-black/55">
            Generated from the {pattern.name.toLowerCase()} pattern and the constraints agreed in the session. The same five requirements apply to every pilot on this pattern.
          </p>
          <div className="mt-4 grid gap-px overflow-hidden rounded-sm border border-black/10 bg-black/10 sm:grid-cols-2">
            {services.map(([name, reason]) => (
              <div key={name} className="bg-white p-4">
                <p className="text-sm font-semibold">{name}</p>
                <p className="mt-1 text-sm leading-6 text-black/58">{reason}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm text-black/58">Data: 500 anonymised claims with handwritten notes redacted from production identifiers.</p>
          <p className="mt-2 text-sm text-black/58">Provisioning happens in the customer&apos;s own cloud account, not here.</p>
          <details className="group mt-4 border-t border-black/10 pt-4">
            <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold">
              <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
              View technical enable list
            </summary>
            <div className="mt-3">
              <div className="mb-2 flex justify-end">
                <Button variant="outline" size="sm" onClick={copySnippet}>{copied ? <Check /> : <Clipboard />}{copied ? "Copied" : "Copy enable list"}</Button>
              </div>
              <pre className="overflow-x-auto rounded-sm border border-black/10 bg-[#fafaf8] p-4 text-xs leading-6">{enableList}</pre>
            </div>
          </details>
        </section>

        <section className="rounded-sm border border-black/10 bg-white p-6">
          <h2 className="text-lg font-semibold">Starter kit · {pattern.name}</h2>
          <p className="mt-2 text-sm text-black/55">What the pattern already covers, and where it will still fail.</p>
          <p className="mt-4 text-xs font-medium text-black/45">Known gaps</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-black/70">
            {pattern.knownGaps.map((gap) => <li key={gap}>{gap}</li>)}
          </ul>
        </section>

      </div>
    </div>
  );
}
