"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Clipboard, Clock, TriangleAlert } from "lucide-react";

import { CustomerAccountPending } from "@/components/customer-account-pending";
import { Button, buttonVariants } from "@/components/ui/button";
import { UnavailableControl } from "@/components/unavailable-control";
import { useSession } from "@/components/session-provider";
import { withBrandPeople, type Brand } from "@/lib/brands";
import { patterns, type CloseStyle, type Delivery, type Mechanic, type SessionGraph } from "@/lib/seed";
import { isCustomerViewer, agendaForSession, customerFormatLabels, customerHasAccount, missingColdRoles, pdmPartnerInvitationCopy, preworkForMechanic } from "@/lib/session";
import { cn } from "@/lib/utils";

const optionCardClass = "h-full rounded-sm border p-3 text-left text-sm disabled:cursor-not-allowed disabled:opacity-60";
const selectedOptionClass = "border-[var(--brand-accent)] bg-[color-mix(in_srgb,var(--brand-accent)_6%,white)]";

export default function PlanPage() {
  const { graph, brand, viewer, setDelivery, setMechanic, setCloseStyle, canEditSession } = useSession();
  const [copied, setCopied] = useState<"facilitated" | "self-service" | "pdm" | null>(null);
  if (isCustomerViewer(viewer.actor)) {
    return customerHasAccount(viewer.actor, graph)
      ? <CustomerBriefing graph={graph} brand={brand} />
      : <CustomerAccountPending message="Add the company before the session" />;
  }

  const people = withBrandPeople(brand);
  const pattern = patterns.find((item) => item.id === graph.session.patternId)!;
  const agenda = agendaForSession(graph);
  const sessionPrework = preworkForMechanic(graph.session.mechanic);
  const coldGaps = missingColdRoles(graph);
  const isEmptyColdPlan = graph.session.scopeMode === "cold" && !graph.coldCompany?.name.trim();
  const customerLead = graph.session.scopeMode === "cold" ? "team" : "Dana";

  const facilitatedEmail = `Hi ${customerLead},

Thanks for bringing the ${graph.session.customerName} team together. ${brand.emailIntro.replace("Heartland", graph.session.customerName)}

In three hours, we’ll map the claims-intake bottleneck, agree the cost inputs, set the compliance boundary, and shape a six-week pilot on 500 anonymised claims. Please bring the claims supervisor, a developer, compliance, and infrastructure.

We’ll leave with a business case that shows its arithmetic and credits every decision to the room.

Regards,
${people.signoff}`;

  const selfServiceEmail = `Hi ${customerLead},

${brand.emailIntro.replace("Heartland", graph.session.customerName)}

I’m sending a guided walkthrough of the ${graph.session.customerName} case. Please confirm daily volume, handling cost, and a named owner so we can leave with a qualification-grade business case.

If the numbers hold, we can request a facilitated session next.

Regards,
${people.signoff}`;

  const pdmEmail = pdmPartnerInvitationCopy(brand, graph.session.customerName);

  async function copyEmail(kind: "facilitated" | "self-service" | "pdm") {
    const copy = kind === "facilitated" ? facilitatedEmail : kind === "self-service" ? selfServiceEmail : pdmEmail;
    await navigator.clipboard.writeText(copy);
    setCopied(kind);
    window.setTimeout(() => setCopied(null), 1600);
  }

  if (isEmptyColdPlan) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-16 lg:px-8">
        <section className="rounded-sm border border-black/10 bg-white p-8 text-center">
          <h1 className="text-2xl font-semibold">Add the company before building the plan</h1>
          <p className="mt-3 text-sm leading-6 text-black/55">Cold mode has no account record to fall back to. Enter the company and at least three attendees on Scope.</p>
          <Link href="/scope" className={buttonVariants({ className: "mt-5 bg-[var(--brand-accent)] hover:bg-[var(--brand-accent-dark)]" })}>Back to Scope</Link>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-5 py-10 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-black/48">{graph.session.customerName}</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Session plan</h1>
          <p className="mt-2 text-sm text-black/55">
            Three hours · Tuesday, 9:00 AM · {
              graph.session.delivery === "self-service"
                ? "Customer-run · uncommon scale path"
                : graph.session.delivery === "google-facilitated"
                  ? `Google-facilitated by ${graph.session.facilitator?.name ?? "Priya Raghavan"} · Google`
                  : `Partner-facilitated by ${graph.session.facilitator?.name ?? "Ravi Menon"} · ${people.facilitatorOrg}`
            }
          </p>
        </div>
        <Link href="/run" className={buttonVariants({ className: "bg-[var(--brand-accent)] hover:bg-[var(--brand-accent-dark)]" })}>Open live session <ArrowRight /></Link>
      </div>

      {graph.partnerNotes.length > 0 && (
        <section aria-labelledby="partner-context-heading" className="mt-6 rounded-sm border border-[var(--brand-accent)]/25 bg-[color-mix(in_srgb,var(--brand-accent)_4%,white)] p-5">
          <h2 id="partner-context-heading" className="font-semibold">Partner context</h2>
          <p className="mt-3 text-sm leading-6 text-black/70">{graph.partnerNotes[0].text}</p>
          <p className="mt-1 text-xs text-black/48">Added by {graph.partnerNotes[0].author} · partner input</p>
        </section>
      )}

      {!canEditSession && (
        <p className="mt-4 rounded-sm border border-black/10 bg-[#fafaf8] px-4 py-3 text-sm text-black/58">Historical session record. Who ran it and the session format were set by the partner before the session ran.</p>
      )}

      <div className="mt-8 space-y-5">
        <section className="rounded-sm border border-black/10 bg-white p-6">
          <h2 className="text-lg font-semibold">How this session runs</h2>
          <div className="mt-4 grid items-start gap-3 md:grid-cols-3">
            <div className="grid gap-2">
              <p className="text-xs font-medium text-black/45">Who runs it</p>
              {([
                ["facilitated", "Partner-facilitated", "Default pre-sales path. A partner specialist is in the room."],
                ["google-facilitated", "Google-facilitated", "A Google PDM runs the room; the partner stays in the capacity slots."],
                ["self-service", "Customer-run", `Uncommon scale path. ${graph.session.customerName} confirms the numbers without a partner facilitator.`],
              ] as [Delivery, string, string][]).map(([value, label, hint]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={graph.session.delivery === value}
                  disabled={!canEditSession}
                  onClick={() => setDelivery(value)}
                  className={cn(optionCardClass, graph.session.delivery === value ? selectedOptionClass : "border-black/10")}
                >
                  <span className="font-semibold">{label}</span>
                  <span className="mt-1 block text-xs text-black/50">{hint}</span>
                </button>
              ))}
            </div>
            <div className="grid gap-2">
              <p className="text-xs font-medium text-black/45">Session format</p>
              {([
                ["value-sprint", "Value sprint", "Agree the cost of the problem and commit to a next step."],
                ["ghost-ledger", "Ghost ledger", "The room watches the cost accumulate in real time. Needs their real numbers."],
              ] as [Mechanic, string, string][]).map(([value, label, hint]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={graph.session.mechanic === value}
                  disabled={!canEditSession}
                  onClick={() => setMechanic(value)}
                  className={cn(optionCardClass, graph.session.mechanic === value ? selectedOptionClass : "border-black/10")}
                >
                  <span className="font-semibold">{label}</span>
                  <span className="mt-1 block text-xs text-black/50">{hint}</span>
                </button>
              ))}
            </div>
            <div className="grid gap-2">
              <p className="text-xs font-medium text-black/45">How it closes</p>
              {([
                ["owner-and-ask", "Owner and ask", "Name the owner and make the funding ask explicit."],
                ["board-slide", "Board-slide close", "Time Traveler: imagine the pilot succeeded, then capture the sponsor's words verbatim."],
              ] as [CloseStyle, string, string][]).map(([value, label, hint]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={graph.session.closeStyle === value}
                  disabled={!canEditSession}
                  onClick={() => setCloseStyle(value)}
                  className={cn(optionCardClass, graph.session.closeStyle === value ? selectedOptionClass : "border-black/10")}
                >
                  <span className="font-semibold">{label}</span>
                  <span className="mt-1 block text-xs text-black/50">{hint}</span>
                </button>
              ))}
            </div>
          </div>
          <p className="mt-4 text-sm text-black/55">Practice sponsor: {people.sponsorLine}</p>
        </section>

        <section className="rounded-sm border border-black/10 bg-white p-6">
          <h2 className="text-lg font-semibold">Three-hour agenda</h2>
          <div className="mt-5 divide-y divide-black/10 border-y border-black/10">
            {agenda.map((step) => (
              <div key={step.id} className="grid gap-2 py-4 md:grid-cols-[36px_180px_90px_1fr] md:items-start">
                <span className="grid size-6 place-items-center rounded-full text-xs font-semibold text-white" style={{ background: brand.accent }}>{step.order}</span>
                <span className="font-semibold">{step.title}</span>
                <span className="flex items-center gap-1 text-sm text-black/48"><Clock className="size-3.5" />{step.durationMinutes} min</span>
                <span className="text-sm leading-6 text-black/62">
                  “{step.prompt}”
                  {step.subPrompt && <span className="mt-1 block text-xs text-black/48">{step.subPrompt}</span>}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-black/45">{pattern.name} typically surfaces a {pattern.typicalValueRange.toLowerCase()}. Source: curated pattern library.</p>
        </section>

        <section className="rounded-sm border border-black/10 bg-white p-6">
          <h2 className="text-lg font-semibold">Who needs to be in the room</h2>
          <div className="mt-5 grid gap-px overflow-hidden rounded-sm border border-black/10 bg-black/10 md:grid-cols-2">
            {graph.attendees.map((person) => (
              <div key={person.id} className={cn("bg-white p-4", person.attendance === "invited-not-attending" && "bg-[#fafaf8]")}>
                <p className="font-semibold">{person.name}</p>
                <p className="text-xs text-black/45">{person.role}</p>
                <p className="mt-2 flex items-start gap-2 text-sm leading-6 text-black/62">
                  {person.name === "Robert Osei" && <TriangleAlert className="mt-1 size-4 shrink-0 text-amber-600" />}
                  {person.reason}
                </p>
              </div>
            ))}
          </div>
          {graph.session.scopeMode === "cold" && coldGaps.length > 0 && (
            <div className="mt-4 rounded-sm border border-amber-300 bg-amber-50 p-4">
              <p className="text-sm font-semibold">Roles missing for this pattern</p>
              <ul className="mt-2 space-y-2 text-sm">
                {coldGaps.map((gap) => <li key={gap.role}><strong>{gap.role}</strong> — {gap.reason}</li>)}
              </ul>
            </div>
          )}
        </section>

        <section className="rounded-sm border border-black/10 bg-white p-6">
          <h2 className="text-lg font-semibold">Pre-work for {graph.session.scopeMode === "cold" ? "the customer team" : "Dana"}</h2>
          <p className="mt-2 text-sm text-black/55">{graph.session.scopeMode === "cold" ? "The named attendees coordinate these inputs before the session." : "Dana coordinates these customer-side inputs before the session."}</p>
          <ul className="mt-4 space-y-3">{sessionPrework.map((item) => <li key={item} className="flex gap-3 text-sm leading-6"><Check className="mt-1 size-4 shrink-0" style={{ color: brand.accent }} />{item}</li>)}</ul>
        </section>

        <section className="rounded-sm border border-black/10 bg-white p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Invitation drafts</h2>
              <p className="mt-1 text-sm text-black/48">The customer drafts are in {brand.partnerName}’s voice. The third is the platform PDM inviting the partner to run the session.</p>
            </div>
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            {([
              ["facilitated", "Facilitated session", facilitatedEmail],
              ["self-service", "Customer self-service walkthrough", selfServiceEmail],
              ["pdm", `PDM to ${brand.partnerName}`, pdmEmail],
            ] as const).map(([kind, title, body]) => (
              <div key={kind} className="rounded-sm border border-black/10 p-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold">{title}</h3>
                  <Button variant="outline" size="sm" onClick={() => copyEmail(kind)}>{copied === kind ? <Check /> : <Clipboard />}{copied === kind ? "Copied" : "Copy"}</Button>
                </div>
                <div className="mt-3 whitespace-pre-wrap text-sm leading-7 text-black/70">{body}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-sm border border-black/10 bg-white p-6">
          <h2 className="text-lg font-semibold">CRM</h2>
          <p className="mt-2 text-sm text-black/55">{graph.session.scopeMode === "cold" ? "Attendee names were typed in Scope; role reasons and gaps came from the curated pattern." : "Attendees and economic-buyer status came from CRM. Pushing updates back is a partner-owned seam."}</p>
          <div className="mt-4">
            <UnavailableControl label="Push to CRM" owner={brand.partnerName} explanation="Would write attendance and next-step status back to the partner CRM." />
          </div>
        </section>
      </div>
    </div>
  );
}

function CustomerBriefing({ graph, brand }: { graph: SessionGraph; brand: Brand }) {
  const agenda = agendaForSession(graph);
  const sessionPrework = preworkForMechanic(graph.session.mechanic);

  return (
    <div className="mx-auto max-w-5xl px-5 py-10 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Before the session</h1>
          <p className="mt-2 text-sm text-black/55">What you will cover, who to bring, and what to have ready.</p>
        </div>
        <Link href="/run" className={buttonVariants({ className: "bg-[var(--brand-accent)] hover:bg-[var(--brand-accent-dark)]" })}>Start the session <ArrowRight /></Link>
      </div>

      <div className="mt-8 space-y-5">
        <section className="rounded-sm border border-black/10 bg-white p-6">
          <h2 className="text-lg font-semibold">What you chose</h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium text-black/45">Format</dt>
              <dd className="mt-1 font-semibold">{customerFormatLabels[graph.session.mechanic]}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-black/45">Partner of record</dt>
              <dd className="mt-1 font-semibold">{brand.partnerName}</dd>
            </div>
          </dl>
        </section>

        <section className="rounded-sm border border-black/10 bg-white p-6">
          <h2 className="text-lg font-semibold">What you will cover</h2>
          <div className="mt-5 divide-y divide-black/10 border-y border-black/10">
            {agenda.map((step) => (
              <div key={step.id} className="grid gap-2 py-4 md:grid-cols-[36px_180px_90px_1fr] md:items-start">
                <span className="grid size-6 place-items-center rounded-full text-xs font-semibold text-white" style={{ background: brand.accent }}>{step.order}</span>
                <span className="font-semibold">{step.title}</span>
                <span className="flex items-center gap-1 text-sm text-black/48"><Clock className="size-3.5" />{step.durationMinutes} min</span>
                <span className="text-sm leading-6 text-black/62">“{step.prompt}”</span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-sm border border-black/10 bg-white p-6">
          <h2 className="text-lg font-semibold">Who to bring</h2>
          <div className="mt-5 grid gap-px overflow-hidden rounded-sm border border-black/10 bg-black/10 md:grid-cols-2">
            {graph.attendees.map((person) => (
              <div key={person.id} className="bg-white p-4">
                <p className="font-semibold">{person.name}</p>
                <p className="text-xs text-black/45">{person.role}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-sm border border-black/10 bg-white p-6">
          <h2 className="text-lg font-semibold">What to prepare</h2>
          <p className="mt-2 text-sm text-black/55">Your team should have this ready before the session.</p>
          <ul className="mt-4 space-y-3">{sessionPrework.map((item) => <li key={item} className="flex gap-3 text-sm leading-6"><Check className="mt-1 size-4 shrink-0" style={{ color: brand.accent }} />{item}</li>)}</ul>
        </section>
      </div>
    </div>
  );
}
