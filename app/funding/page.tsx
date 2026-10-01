"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, FileCheck2, LockKeyhole } from "lucide-react";

import { CustomerAccountPending } from "@/components/customer-account-pending";
import { buttonVariants } from "@/components/ui/button";
import { useSession } from "@/components/session-provider";
import { withBrandPeople } from "@/lib/brands";
import { ledgerAnnualTotal } from "@/lib/cost-model";
import { isCustomerViewer,
  claimsArtifactCopy,
  claimsVolumeProvenanceCopy,
  customerHasAccount,
  hasCompleteCostComponents,
  hasCompleteValueInputs,
} from "@/lib/session";
import { formatCurrency } from "@/lib/value";

function useFundingData() {
  const { graph, brand, viewer } = useSession();
  const people = withBrandPeople(brand);
  const claims = claimsArtifactCopy(graph);
  const ghost = graph.session.mechanic === "ghost-ledger";
  const hasValue = ghost ? hasCompleteCostComponents(graph) : hasCompleteValueInputs(graph);
  const annualValue = ghost
    ? graph.session.ledgerFrozen
      ? graph.outcome.annualValue
      : ledgerAnnualTotal(graph.costComponents)
    : graph.outcome.annualValue;
  const value = !hasValue
    ? "Pending session inputs"
    : graph.session.claimsVolumeChoice === "unconfirmed" && !ghost
    ? "Pending volume confirmation"
    : graph.session.claimsVolumeChoice === "range-250-500" && !ghost
      ? "$4.8M–$9.7M / year"
      : `${formatCurrency(annualValue)} / year`;

  return { graph, brand, viewer, people, claims, ghost, value };
}

export default function FundingPage() {
  const data = useFundingData();
  if (isCustomerViewer(data.viewer.actor) && !customerHasAccount(data.viewer.actor, data.graph)) {
    return <CustomerAccountPending message="This is written once your account is in the session." />;
  }
  return data.viewer.actor === "partner"
    ? <PartnerFundingRequest data={data} />
    : <VendorFundingReview data={data} />;
}

function PartnerFundingRequest({ data }: { data: ReturnType<typeof useFundingData> }) {
  const { graph, brand, people, claims, ghost, value } = data;

  return (
    <div className="mx-auto max-w-5xl px-5 py-8 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-black/48">{brand.partnerName} funding request</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Prepare the DAF claim</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-black/58">Review the evidence carried from the business case before submitting it through the partner portal.</p>
        </div>
        <span className="rounded-sm border border-black/15 bg-white px-3 py-2 text-xs font-medium">Draft · not submitted</span>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_320px]">
        <section className="overflow-hidden rounded-sm border border-black/10 bg-white">
          <div className="flex items-center gap-3 border-b border-black/10 bg-[#fafaf8] p-5">
            <FileCheck2 className="size-5" style={{ color: brand.accent }} />
            <div>
              <h2 className="font-semibold">Evidence from the value session</h2>
              <p className="mt-1 text-xs text-black/45">{graph.session.id}</p>
            </div>
          </div>
          <dl className="grid gap-px bg-black/10 sm:grid-cols-2">
            {[
              ["Customer", graph.session.customerName],
              ["Use case", graph.outcome.useCase || "Not captured"],
              ["Value", value],
              ["Format", ghost ? "Ghost ledger" : "Value sprint"],
            ].map(([term, detail]) => (
              <div key={term} className="bg-white p-5">
                <dt className="text-xs text-black/45">{term}</dt>
                <dd className="mt-1 text-sm font-medium">{detail}</dd>
              </div>
            ))}
          </dl>
          <div className="p-5">
            <h2 className="font-semibold">Attributed evidence</h2>
            {graph.captures.length ? (
              <ul className="mt-3 space-y-3">
                {graph.captures.slice(0, 5).map((capture) => (
                  <li key={capture.id} className="rounded-sm bg-[#fafaf8] p-4 text-sm leading-6">
                    <strong>{capture.attributedTo}</strong> — {capture.text}
                  </li>
                ))}
              </ul>
            ) : <p className="mt-3 text-sm text-black/55">No attributed evidence has been captured yet.</p>}
            {claims.status && <p className="mt-4 text-sm text-amber-800">{claims.status}</p>}
            {graph.session.claimsVolumeChoice === "exact" && (
              <p className="mt-4 text-sm text-black/55">{claimsVolumeProvenanceCopy(graph)}</p>
            )}
          </div>
        </section>

        <aside className="h-fit rounded-sm border border-black/10 bg-white p-5 shadow-sm">
          <LockKeyhole className="size-5" style={{ color: brand.accent }} />
          <h2 className="mt-4 text-lg font-semibold">Partner submission</h2>
          <p className="mt-2 text-sm leading-6 text-black/58">Practice sponsor: {people.sponsorLine}</p>
          <button type="button" disabled className="mt-5 h-10 w-full cursor-not-allowed rounded-sm bg-black/35 text-sm font-semibold text-white">
            Submit funding claim
          </button>
          <p className="mt-2 text-xs leading-5 text-black/48">Illustrative only. Production submission happens in {brand.partnerName}&apos;s partner portal.</p>
        </aside>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/artifact" className={buttonVariants({ variant: "outline" })}><ArrowLeft /> Back to business case</Link>
        <Link href="/pilot-spec" className={buttonVariants({ className: "bg-[var(--brand-accent)] hover:bg-[var(--brand-accent-dark)]" })}>Open pilot spec <ArrowRight /></Link>
      </div>
    </div>
  );
}

function VendorFundingReview({ data }: { data: ReturnType<typeof useFundingData> }) {
  const { graph, brand, viewer, people, claims, ghost, value } = data;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
      <p className="md-label-large text-[var(--md-sys-color-primary)]">Funding</p>
      <h1 className="md-headline-medium mt-1">DAF substantiation pack</h1>
      <p className="md-body-large mt-3 max-w-3xl text-[var(--md-sys-color-on-surface-variant)]">The partner submits the claim. The platform vendor reviews evidence shared by the partner; it does not rewrite the business case.</p>

      <div className="mt-7 grid gap-5 lg:grid-cols-[1fr_320px]">
        <section className="md-card-outlined overflow-hidden">
          <div className="flex items-center gap-3 border-b border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface-container)] p-5">
            <span className="grid size-11 place-items-center rounded-[var(--md-sys-shape-large)] bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)]"><FileCheck2 /></span>
            <div>
              <p className="md-title-medium">Session evidence</p>
              <p className="md-label-medium text-[var(--md-sys-color-on-surface-variant)]">{graph.session.id}</p>
            </div>
            <span className="md-chip ml-auto">Draft · not submitted</span>
          </div>

          <dl className="grid gap-px bg-[var(--md-sys-color-outline-variant)] sm:grid-cols-2">
            {[
              ["Customer", graph.session.customerName],
              ["Partner", brand.partnerName],
              ["Use case", graph.outcome.useCase || "Not captured"],
              ["Value", value],
              ["Format", ghost ? "Ghost ledger" : "Value sprint"],
              ["Who ran it", graph.session.delivery === "self-service" ? "Customer-run · uncommon · unverified estimate" : graph.session.delivery === "google-facilitated" ? "Google-facilitated" : "Partner-facilitated"],
            ].map(([term, detail]) => (
              <div key={term} className="bg-[var(--md-sys-color-surface)] p-5">
                <dt className="md-label-medium text-[var(--md-sys-color-on-surface-variant)]">{term}</dt>
                <dd className="md-body-large mt-1">{detail}</dd>
              </div>
            ))}
          </dl>

          <div className="p-5">
            <h2 className="md-title-medium">Attributed evidence</h2>
            {graph.captures.length ? (
              <ul className="mt-4 space-y-3">
                {graph.captures.slice(0, 5).map((capture) => (
                  <li key={capture.id} className="md-body-medium rounded-[var(--md-sys-shape-small)] bg-[var(--md-sys-color-surface-container)] p-4">
                    <strong>{capture.attributedTo}</strong> — {capture.text}
                  </li>
                ))}
              </ul>
            ) : <p className="md-body-medium mt-4 text-[var(--md-sys-color-on-surface-variant)]">No attributed evidence has been captured yet.</p>}
            {claims.status && <p className="md-body-medium mt-4 text-[var(--md-sys-color-on-surface-variant)]">{claims.status}</p>}
            {graph.session.claimsVolumeChoice === "exact" && (
              <p className="md-body-medium mt-4 text-[var(--md-sys-color-on-surface-variant)]">
                {claimsVolumeProvenanceCopy(graph)}
              </p>
            )}
          </div>
        </section>

        <aside className="md-card-elevated h-fit p-5">
          <LockKeyhole className="size-6 text-[var(--md-sys-color-primary)]" />
          <h2 className="md-title-large mt-4">{viewer.actor === "partner" ? "Partner submission" : "Vendor review"}</h2>
          <p className="md-body-medium mt-3 text-[var(--md-sys-color-on-surface-variant)]">Practice sponsor: {people.sponsorLine}</p>
          <button type="button" disabled className="md-button-filled mt-5 w-full cursor-not-allowed opacity-55">
            {viewer.actor === "partner" ? "Submit funding claim" : "Approve funding claim"}
          </button>
          <p className="md-label-medium mt-3 text-[var(--md-sys-color-on-surface-variant)]">Disabled · illustrative. Submission and approval happen in the partner portal.</p>
        </aside>
      </div>

      <Link href="/artifact" className="md-button-outlined mt-6"><ArrowLeft className="size-4" /> Back to business case</Link>
    </div>
  );
}
