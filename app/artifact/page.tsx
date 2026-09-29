"use client";

import Link from "next/link";
import { ArrowRight, Download } from "lucide-react";
import html2canvas from "html2canvas-pro";
import jsPDF from "jspdf";

import { Button, buttonVariants } from "@/components/ui/button";
import { GoogleHackathonStack } from "@/components/google-hackathon-stack";
import { UnavailableControl } from "@/components/unavailable-control";
import { useSession } from "@/components/session-provider";
import { withBrandPeople } from "@/lib/brands";
import { componentMonthlyTotal, ledgerAnnualTotal, ledgerMonthlyTotal } from "@/lib/cost-model";
import type { CostComponent } from "@/lib/seed";
import { formatCurrency, formatPreciseCurrency } from "@/lib/value";
import {
  artifactActions,
  artifactHeadline,
  artifactLimitsCopy,
  artifactPilotScopeCopy,
  claimsArtifactCopy,
  claimsVolumeProvenanceCopy,
  customerSponsor,
  fundingAskCopy,
  hasCompleteCostComponents,
  bookedSolutionTitles,
  catalogSolutionById,
} from "@/lib/session";

function componentArithmetic(component: CostComponent) {
  if (component.inputs.some((input) => input.quantity === null)) return "Inputs not captured";
  const quantities = component.inputs.map((input) => input.quantity as number);
  switch (component.id) {
    case "handling": {
      const [claims, delay, cost] = quantities;
      return `${claims} × ${delay} × ${formatPreciseCurrency(cost)} × 250 ÷ 12 = ${formatCurrency(componentMonthlyTotal(component))} / month`;
    }
    case "review": {
      const [hours, rate] = quantities;
      return `${hours} × 50 × ${formatPreciseCurrency(rate)} ÷ 12 = ${formatCurrency(componentMonthlyTotal(component))} / month`;
    }
    case "rework": {
      const [claims, reopen, each] = quantities;
      return `${claims} × 250 × ${reopen} × ${formatCurrency(each)} ÷ 12 = ${formatCurrency(componentMonthlyTotal(component))} / month`;
    }
    case "overtime":
      return `${formatCurrency(quantities[0])} / month`;
    default:
      return formatCurrency(componentMonthlyTotal(component));
  }
}

export default function ArtifactPage() {
  const { graph, brand, viewer } = useSession();
  const people = withBrandPeople(brand);
  const claimsCopy = claimsArtifactCopy(graph);
  const problemQuotes = (graph.session.scopeMode === "cold"
    ? graph.captures.filter((capture) => capture.stepId !== "owner-and-ask")
    : graph.captures.filter((capture) =>
      capture.stepId !== "owner-and-ask"
      && ["Michelle Dorsey", "Dana Reyes", "Alex Chen"].includes(capture.attributedTo),
    )).slice(0, 3);
  const compliancePerson = graph.attendees.find((attendee) => /compliance|risk|audit/i.test(attendee.role));
  const compliance = graph.captures.find((capture) =>
    graph.session.scopeMode === "cold"
      ? capture.attributedTo === compliancePerson?.name
      : capture.attributedTo === "Robert Osei",
  );
  const selfService = graph.session.delivery === "self-service";
  const ghost = graph.session.mechanic === "ghost-ledger";
  const ledgerComplete = hasCompleteCostComponents(graph);
  const ghostAnnual = ledgerAnnualTotal(graph.costComponents);
  const partial = graph.outcome.partiallyEstimated || graph.costComponents.some((row) => row.confirmedBy === null);
  const qualified = graph.session.qualified;
  const boardSlideCaptures = graph.session.closeStyle === "board-slide"
    ? graph.captures.filter((capture) => capture.stepId === "owner-and-ask")
    : [];
  const sponsor = customerSponsor(graph);

  const actions = artifactActions(viewer.actor, qualified, graph.session.delivery);
  const limits = artifactLimitsCopy(graph);
  const bookedTitles = bookedSolutionTitles(graph);
  const bookedSolutions = (graph.hackathon?.solutionIds ?? [])
    .map((id) => catalogSolutionById(id, graph))
    .filter((solution): solution is NonNullable<typeof solution> => Boolean(solution));

  async function downloadPdf() {
    const artifact = document.getElementById("business-case");
    if (!artifact) return;
    const canvas = await html2canvas(artifact, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
      logging: false,
    });
    const pdf = new jsPDF({ unit: "pt", format: "letter" });
    const margin = 28;
    const pageWidth = pdf.internal.pageSize.getWidth() - margin * 2;
    const pageHeight = pdf.internal.pageSize.getHeight() - margin * 2;
    const imageHeight = (canvas.height * pageWidth) / canvas.width;
    const image = canvas.toDataURL("image/jpeg", 0.94);
    for (let offset = 0; offset < imageHeight; offset += pageHeight) {
      if (offset > 0) pdf.addPage();
      pdf.addImage(image, "JPEG", margin, margin - offset, pageWidth, imageHeight);
    }
    const customerSlug = graph.session.customerName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    pdf.save(`${customerSlug}-business-case.pdf`);
  }

  return (
    <div className="px-5 py-8 lg:px-8">
      <div className="mx-auto mb-4 flex max-w-4xl flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Business case</h1>
          <p className="text-sm text-black/50">
            {graph.session.scopeMode === "cold"
              ? `Prepared for ${graph.session.customerName}.`
              : graph.session.fundingRoute === "brief-dana"
              ? "Ready for Dana to carry the ask."
              : graph.session.fundingRoute === "invite-karen"
                ? "Ready for Karen."
                : "Ready for Dana to take to Karen."}
          </p>
        </div>
        <Button onClick={downloadPdf} className="bg-[var(--brand-accent)] hover:bg-[var(--brand-accent-dark)]"><Download /> Download PDF</Button>
      </div>

      <div className="sticky top-16 z-20 -mx-5 border-y border-black/10 bg-white/95 px-5 py-3 backdrop-blur lg:-mx-8 lg:px-8">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-3">
          {viewer.actor === "partner" && selfService ? (
            <>
              <UnavailableControl
                label={actions.primary}
                owner={brand.partnerName}
                explanation="This qualified self-service case needs partner-facilitated verification before the funding request leads."
              />
              <Link href="/funding" className={buttonVariants({ variant: "outline" })}>{actions.secondary}</Link>
            </>
          ) : (
            <>
              <Link href="/funding" className={buttonVariants({ className: "bg-[var(--brand-accent)] hover:bg-[var(--brand-accent-dark)]" })}>{actions.primary}</Link>
              {actions.secondary && (
                <UnavailableControl
                  label={actions.secondary}
                  owner={brand.partnerName}
                  explanation="A qualified self-service case can request a facilitated follow-up; this demo does not book it."
                />
              )}
            </>
          )}
          {actions.tertiary && (
            <UnavailableControl
              label={actions.tertiary}
              owner={brand.partnerName}
              explanation="Sends this business case to the partner's assigned vendor PDM. This demo does not send mail."
            />
          )}
          <Link href="/pilot-spec" className={`${buttonVariants({ variant: "outline" })} ml-auto border-black/30 bg-[#f4f4f1] hover:bg-black/[.06]`}>
            Open pilot spec <ArrowRight />
          </Link>
        </div>
      </div>

      {graph.hackathon?.booked ? (
        <div className="mx-auto mt-5 max-w-4xl space-y-4">
          <div className="rounded-sm border border-black/20 bg-white px-4 py-4 text-sm text-black" role="status">
            <p className="text-base font-semibold text-black">Hackathon confirmed · {graph.hackathon.date}</p>
            <p className="mt-2 leading-6 text-black/85">
              {bookedTitles.length ? bookedTitles.join(" · ") : "Three solutions"} · {graph.hackathon.googleFacilitator} (Google) · {graph.hackathon.partnerSpecialist} (partner) · {graph.hackathon.customerOwner} (customer)
            </p>
            <p className="mt-2 text-sm leading-6 text-black/75">{graph.hackathon.question}</p>
          </div>
          <GoogleHackathonStack graph={graph} />
        </div>
      ) : !selfService && viewer.actor === "partner" ? (
        <div className="mx-auto mt-5 flex max-w-4xl flex-wrap items-center justify-between gap-3 rounded-sm border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <p>No hackathon booked yet. Rank the shortlist and put a date on the calendar before funding.</p>
          <Link href="/rank" className={buttonVariants({ size: "sm", className: "bg-[var(--brand-accent)] hover:bg-[var(--brand-accent-dark)]" })}>
            Rank and book <ArrowRight />
          </Link>
        </div>
      ) : null}

      <article id="business-case" className="mx-auto mt-5 max-w-4xl rounded-sm border border-black/10 bg-white">
        <header className="border-b border-black/10 p-7 md:p-10" style={{ borderTop: `5px solid ${brand.accent}` }}>
          <div className="flex items-center justify-between gap-4">
            <span className="text-base font-black tracking-[-0.08em]" style={{ color: brand.accent }}>{brand.mark}</span>
            <span className="text-xs text-black/45">{brand.productName}</span>
          </div>
          <h2 className="mt-12 text-3xl font-semibold tracking-tight">{artifactHeadline(graph.outcome.useCase)}</h2>
          <p className="mt-3 text-base text-black/58">{brand.artifactIntro.replace("Heartland Mutual Insurance", graph.session.customerName)}</p>
        </header>

        <div className="space-y-10 p-7 md:p-10">
          <section>
            <h3 className="text-lg font-semibold">The problem, in {graph.session.customerName}&apos;s words</h3>
            <div className="mt-4 space-y-3">
              {problemQuotes.map((quote) => (
                <blockquote key={quote.id} className="border-l-2 pl-4 text-[15px] leading-7" style={{ borderColor: brand.accent }}>
                  “{quote.text}” <cite className="not-italic text-black/48">— {quote.attributedTo}</cite>
                </blockquote>
              ))}
              {problemQuotes.length === 0 && <p className="text-sm text-black/55">No attributed evidence has been captured for this session yet.</p>}
            </div>
          </section>

          <section className="rounded-sm border border-black/10 bg-[#fafaf8] p-5">
            <h3 className="text-lg font-semibold">What it costs</h3>
            {ghost ? (
              ledgerComplete ? <>
                <p className="mt-1 text-sm text-black/55">Four-component cost of inaction.</p>
                <p className="mt-3 text-2xl font-semibold tabular-nums">
                  {formatCurrency(ghostAnnual)} / year
                </p>
                {(claimsCopy.status || partial) && (
                  <p className="mt-1 text-sm font-medium text-amber-800">{claimsCopy.status ?? "Partially estimated"}</p>
                )}
                {selfService && <p className="mt-1 text-sm font-medium text-amber-800">Unverified estimate</p>}
                {!graph.session.ledgerFrozen && <p className="mt-1 text-sm font-medium text-amber-800">Ledger not frozen · provisional</p>}
                <ul className="mt-4 space-y-3">
                  {graph.costComponents.map((component) => (
                    <li key={component.id} className="text-sm leading-6">
                      <p className="font-semibold">{component.label}</p>
                      <p className="tabular-nums text-black/70">{componentArithmetic(component)}</p>
                      <p className="text-xs text-black/45">
                        {selfService
                          ? "Respondent-confirmed · not facilitator-verified"
                          : component.confirmedBy
                            ? `Confirmed by ${component.confirmedBy}`
                            : "Unconfirmed · estimate"}
                      </p>
                    </li>
                  ))}
                </ul>
                {graph.session.claimsVolumeChoice === "range-250-500" ? (
                  <p className="mt-3 text-sm text-black/58">The handling and rework rows use the 375-claim midpoint for planning. The frozen total remains a range-qualified estimate.</p>
                ) : graph.session.claimsVolumeChoice === "unconfirmed" ? (
                  <p className="mt-3 text-sm text-black/58">Ledger rows are provisional until claims volume is confirmed.</p>
                ) : (
                  <p className="mt-3 text-sm text-black/58">
                    Monthly total {formatCurrency(ledgerMonthlyTotal(graph.costComponents))}. At twelve months, {formatCurrency(ghostAnnual)} per year.
                  </p>
                )}
              </> : (
                <div className="mt-3">
                  <p className="text-xl font-semibold">Ledger inputs not captured yet</p>
                  <p className="mt-2 text-sm leading-6 text-black/58">Complete the ledger during the session before calculating a cost of inaction.</p>
                </div>
              )
            ) : (
              <>
                <p className="mt-3 text-2xl font-semibold tabular-nums">{claimsCopy.headline}</p>
                <p className="mt-2 text-sm leading-6 text-black/58">{claimsCopy.detail}</p>
                {claimsCopy.status && <p className="mt-1 text-sm font-medium text-amber-800">{claimsCopy.status}</p>}
                {selfService && <p className="mt-1 text-sm font-medium text-amber-800">Unverified estimate</p>}
                <p className="mt-2 text-xs text-black/42">
                  {claimsVolumeProvenanceCopy(graph)}
                </p>
              </>
            )}
          </section>

          <section>
            <h3 className="text-lg font-semibold">The agreed constraint</h3>
            {(compliance?.text ?? graph.outcome.constraint) ? (
              <>
                <p className="mt-3 leading-7">“{compliance?.text ?? graph.outcome.constraint}” <span className="text-black/48">— {compliancePerson ? `${compliancePerson.name}, ${compliancePerson.role}` : "Confirmer needed"}</span></p>
                <p className="mt-2 text-sm text-black/58">The pilot keeps human review on low-confidence extractions.</p>
              </>
            ) : (
              <p className="mt-3 text-sm text-black/55">No constraint has been captured for this session yet.</p>
            )}
          </section>

          <section>
            <h3 className="text-lg font-semibold">{limits.heading}</h3>
            <p className="mt-3 max-w-2xl text-[15px] leading-7 text-black/70">
              {graph.session.scopeMode === "cold"
                ? `Accuracy on ${graph.session.customerName}'s own data, actual review time, and production integration remain unproven. The three-day hackathon exists to answer these and to scope the six-week pilot.`
                : limits.body}
            </p>
          </section>

          {bookedSolutions.length > 0 && (
            <section>
              <h3 className="text-lg font-semibold">The booked solutions</h3>
              <ul className="mt-3 space-y-4">
                {bookedSolutions.map((solution) => (
                  <li key={solution.id}>
                    <p className="text-xl font-semibold">{solution.title}</p>
                    <p className="mt-2 text-sm leading-6 text-black/62">{solution.outcome}</p>
                    <p className="mt-1 text-xs text-black/48">{solution.valueAnchor}</p>
                    {solution.products.length > 0 && (
                      <ul className="mt-2 flex flex-wrap gap-1.5" aria-label={`Products for ${solution.title}`}>
                        {solution.products.map((product) => (
                          <li
                            key={product}
                            className="rounded-sm border border-black/15 bg-[#fafaf8] px-2 py-0.5 text-xs text-black/65"
                          >
                            {product}
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <h3 className="text-lg font-semibold">The booked hackathon</h3>
            {graph.hackathon?.booked ? (
              <dl className="mt-4 grid gap-px overflow-hidden rounded-sm border border-black/10 bg-black/10 sm:grid-cols-2">
                {[
                  ["Date", graph.hackathon.date],
                  ["Solutions", bookedTitles.join("; ") || "Three selected"],
                  ["Google facilitator", graph.hackathon.googleFacilitator],
                  ["Partner specialist", graph.hackathon.partnerSpecialist],
                  ["Customer owner", graph.hackathon.customerOwner],
                  ["Question to answer", graph.hackathon.question],
                ].map(([term, detail]) => (
                  <div key={term} className="bg-white p-4"><dt className="text-xs font-medium text-black/45">{term}</dt><dd className="mt-1 text-sm leading-6">{detail}</dd></div>
                ))}
              </dl>
            ) : (
              <p className="mt-3 text-sm text-black/55">No hackathon booked yet. Rank solutions and book a date before treating this as a leave-behind.</p>
            )}
          </section>

          <section>
            <h3 className="text-lg font-semibold">What the hackathon will scope</h3>
            <dl className="mt-4 grid gap-px overflow-hidden rounded-sm border border-black/10 bg-black/10 sm:grid-cols-2">
              {[
                ["Pilot scope", artifactPilotScopeCopy(graph, brand)],
                ["Pilot duration", "Six weeks"],
                ["Owner", graph.outcome.owner ?? "Not confirmed"],
                ["Success", "Process 500 anonymised claims with an audit trail and human review for low-confidence fields"],
              ].map(([term, detail]) => (
                <div key={term} className="bg-white p-4"><dt className="text-xs font-medium text-black/45">{term}</dt><dd className="mt-1 text-sm leading-6">{detail}</dd></div>
              ))}
            </dl>
          </section>

          {boardSlideCaptures.length > 0 && (
            <section>
              <h3 className="text-lg font-semibold">
                In six months, {sponsor?.name ?? "the customer sponsor"} expects to say:
              </h3>
              <div className="mt-4 space-y-4">
                {boardSlideCaptures.map((capture) => {
                  const speaker = graph.attendees.find((attendee) => attendee.name === capture.attributedTo);
                  return (
                    <blockquote key={capture.id} className="border-l-2 pl-4 text-[15px] leading-7" style={{ borderColor: brand.accent }}>
                      “{capture.text}”
                      <cite className="mt-1 block not-italic text-black/48">
                        — {capture.attributedTo}{speaker?.role ? `, ${speaker.role}` : ""}
                      </cite>
                    </blockquote>
                  );
                })}
              </div>
            </section>
          )}

          <section className="border-t border-black/10 pt-8">
            <h3 className="text-lg font-semibold">The ask</h3>
            <p className="mt-3 max-w-2xl text-[15px] leading-7">{fundingAskCopy(graph)}</p>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-black/58">{brand.artifactClosing.replace("Heartland", graph.session.customerName)}</p>
            <p className="mt-8 text-sm font-semibold">{people.signoff}</p>
          </section>
        </div>
      </article>
    </div>
  );
}
