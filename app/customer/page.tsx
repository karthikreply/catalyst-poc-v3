"use client";

import Link from "next/link";
import { ArrowRight, CalendarDays, FileText, BadgeDollarSign, ListOrdered, Hourglass } from "lucide-react";

import { UnavailableControl } from "@/components/unavailable-control";
import { useSession } from "@/components/session-provider";
import type { Mechanic } from "@/lib/seed";
import { customerFormatLabels, customerHomeSummary, googleCalendarComposeUrl } from "@/lib/session";
import { formatCurrency } from "@/lib/value";

const formatCards: { mechanic: Mechanic; body: string; icon: typeof ListOrdered }[] = [
  { mechanic: "value-sprint", body: "Draft and rank the use cases with your team.", icon: ListOrdered },
  { mechanic: "ghost-ledger", body: "Watch the cost of inaction, then freeze it.", icon: Hourglass },
];

export default function CustomerHomePage() {
  const { graph, brand, viewer, chooseCustomerFormat } = useSession();
  const summary = customerHomeSummary(graph, brand.partnerName);
  const booked = Boolean(graph.hackathon?.booked);
  const scheduleUrl = booked ? googleCalendarComposeUrl(graph, brand.partnerName) : "";

  if (viewer.actor !== "cpm") {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 md:px-8">
        <h1 className="md-headline-medium">Customer home</h1>
        <p className="md-body-medium mt-3 text-[var(--md-sys-color-on-surface-variant)]">
          This page is the customer&apos;s view of their engagement. Switch Viewing as to the customer, or return to the dashboard.
        </p>
        <Link href="/" className="md-button-outlined mt-6">Back to dashboard</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-8 md:py-12">
      <p className="md-label-large text-[var(--md-sys-color-primary)]">Customer</p>
      <h1 className="md-display-small mt-2">Hello, {viewer.name.split(" ")[0]}</h1>
      <p className="md-body-large mt-3 max-w-2xl text-[var(--md-sys-color-on-surface-variant)]">
        Session progress and funding for this engagement only.
      </p>

      {!summary.started && (
        <section className="md-card-elevated mt-8 p-6 md:p-8" aria-labelledby="format-choice-title">
          <h2 id="format-choice-title" className="md-headline-medium">How do you want to start?</h2>
          <p className="md-body-medium mt-2 max-w-2xl text-[var(--md-sys-color-on-surface-variant)]">
            Choosing a format starts your session. You can look up or add your account on the next step.
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {formatCards.map((card) => {
              const Icon = card.icon;
              return (
                <button
                  key={card.mechanic}
                  type="button"
                  onClick={() => chooseCustomerFormat(card.mechanic)}
                  className="md-card-outlined p-5 text-left transition-colors hover:bg-[color-mix(in_srgb,var(--md-sys-color-primary)_5%,var(--md-sys-color-surface))]"
                >
                  <Icon className="size-6 text-[var(--md-sys-color-primary)]" />
                  <p className="md-title-medium mt-4">{customerFormatLabels[card.mechanic]}</p>
                  <p className="md-body-medium mt-2 text-[var(--md-sys-color-on-surface-variant)]">{card.body}</p>
                </button>
              );
            })}
          </div>
        </section>
      )}

      <section className="md-card-outlined mt-6 p-6" aria-labelledby="engagement-summary-title">
        <h2 id="engagement-summary-title" className="md-title-large">Your session</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <SummaryItem term="Company" detail={summary.company} />
          <SummaryItem term="Stage" detail={summary.stage} />
          {summary.format && <SummaryItem term="Format" detail={summary.format} />}
          {summary.started && <SummaryItem term="Partner of record" detail={summary.partner} />}
          {summary.annualValue !== null && (
            <SummaryItem term="Annual value" detail={`${formatCurrency(summary.annualValue)} / year`} />
          )}
          <SummaryItem term="Funding" detail={summary.funding} />
        </dl>
        {summary.started && (
          <div className="mt-6 flex flex-wrap gap-3">
            {summary.continueHref && (
              <Link href={summary.continueHref} className="md-button-filled">
                Continue session <ArrowRight className="size-4" />
              </Link>
            )}
            <Link href="/funding" className="md-button-outlined">View funding pack</Link>
          </div>
        )}
      </section>

      <section className="mt-8" aria-labelledby="next-steps-title">
        <h2 id="next-steps-title" className="md-title-large">Next steps</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <NextStepCard icon={CalendarDays} title="Schedule a hackathon" body="Hold the three days once the shortlist is booked.">
            {booked && scheduleUrl ? (
              <a href={scheduleUrl} target="_blank" rel="noreferrer" className="md-button-filled">
                Open calendar <ArrowRight className="size-4" />
              </a>
            ) : (
              <UnavailableControl
                label="Schedule a hackathon"
                owner={brand.partnerName}
                explanation="Book the hackathon first."
              />
            )}
          </NextStepCard>
          <NextStepCard icon={BadgeDollarSign} title="Apply for DAF" body="Funding follows the evidence in the business case.">
            <Link href="/funding" className="md-button-outlined">Open funding <ArrowRight className="size-4" /></Link>
          </NextStepCard>
          <NextStepCard icon={FileText} title="Open the business case" body="The case shows its arithmetic and credits the room.">
            <Link href="/artifact" className="md-button-outlined">Open business case <ArrowRight className="size-4" /></Link>
          </NextStepCard>
        </div>
      </section>
    </div>
  );
}

function SummaryItem({ term, detail }: { term: string; detail: string }) {
  return (
    <div>
      <dt className="md-label-medium text-[var(--md-sys-color-on-surface-variant)]">{term}</dt>
      <dd className="md-title-medium mt-1">{detail}</dd>
    </div>
  );
}

function NextStepCard({
  icon: Icon,
  title,
  body,
  children,
}: {
  icon: typeof CalendarDays;
  title: string;
  body: string;
  children: React.ReactNode;
}) {
  return (
    <div className="md-card-outlined flex flex-col p-5">
      <Icon className="size-6 text-[var(--md-sys-color-primary)]" />
      <h3 className="md-title-medium mt-4">{title}</h3>
      <p className="md-body-medium mt-2 flex-1 text-[var(--md-sys-color-on-surface-variant)]">{body}</p>
      <div className="mt-5">{children}</div>
    </div>
  );
}
