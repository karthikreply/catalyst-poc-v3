"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";

import { Switch } from "@/components/ui/switch";
import { useSession } from "@/components/session-provider";
import { patterns } from "@/lib/seed";
import { hasCompleteCostComponents, hasCompleteValueInputs } from "@/lib/session";
import {
  canViewOpportunityDetail,
  mechanicConversion,
  recentTelemetryRows,
  scopeTelemetry,
  summarizeTelemetry,
  telemetrySeed,
  type TelemetryOutcome,
  type TelemetrySession,
} from "@/lib/telemetry";
import { formatCompactCurrency } from "@/lib/value";

const outcomeTone: Record<TelemetryOutcome, string> = {
  Scoped: "bg-black/6 text-black/62",
  Run: "bg-sky-100 text-sky-900",
  "Hackathon proposed": "bg-amber-100 text-amber-900",
  "Hackathon booked": "bg-emerald-100 text-emerald-900",
};

function OutcomeStatus({ outcome }: { outcome: TelemetryOutcome }) {
  return (
    <span className={`md-label-medium inline-flex items-center gap-1.5 rounded-[var(--md-sys-shape-full)] px-2 py-1 ${outcomeTone[outcome]}`}>
      <span aria-hidden className="size-1.5 rounded-full bg-current opacity-70" />
      {outcome}
    </span>
  );
}

function Breakdown({ title, rows, details }: { title: string; rows: [string, number][]; details?: Record<string, string> }) {
  const max = Math.max(...rows.map(([, value]) => value), 1);
  return (
    <section className="md-card-outlined p-5">
      <h2 className="md-title-medium">{title}</h2>
      <div className="mt-5 space-y-4">
        {rows.map(([label, value]) => (
          <div key={label}>
            <div className="md-body-medium mb-2 flex justify-between gap-3"><span>{label}{details?.[label] && <span className="md-label-medium ml-2 text-[var(--md-sys-color-on-surface-variant)]">{details[label]}</span>}</span><span className="font-semibold tabular-nums">{value}</span></div>
            <div className="h-2 rounded-[var(--md-sys-shape-full)] bg-[var(--md-sys-color-surface-container-high)]"><div className="h-full rounded-[var(--md-sys-shape-full)] bg-[var(--md-sys-color-primary)]" style={{ width: `${(value / max) * 100}%` }} /></div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function TelemetryPage() {
  const { graph, brand, viewer } = useSession();
  const [detail, setDetail] = useState(false);
  const showOpportunity = canViewOpportunityDetail(viewer.actor, detail);

  const rows = useMemo(() => {
    const scoped = scopeTelemetry([...telemetrySeed], {
      actor: viewer.actor,
      partnerName: brand.partnerName,
    });
    const hasSessionValue = graph.session.mechanic === "ghost-ledger"
      ? hasCompleteCostComponents(graph)
      : hasCompleteValueInputs(graph);
    const pattern = patterns.find((item) => item.id === graph.session.patternId)?.name ?? "Pattern not selected";
    const overlay: TelemetrySession = {
      id: graph.session.id,
      quarter: "Q3 2026",
      partner: brand.partnerName as TelemetrySession["partner"],
      industry: graph.session.industry,
      pattern,
      outcome: graph.hackathon?.booked
        ? "Hackathon booked"
        : graph.session.scopeMode === "cold" && !hasSessionValue
          ? "Scoped"
          : "Hackathon proposed",
      fundedValue: 0,
      opportunityValue: hasSessionValue ? graph.outcome.annualValue : undefined,
      customer: graph.session.customerName,
      delivery: graph.session.delivery === "google-facilitated" ? "google-facilitated" : graph.session.delivery,
      mechanic: graph.session.mechanic,
      closeStyle: graph.session.closeStyle,
      qualified: graph.session.qualified,
      converted: Boolean(graph.hackathon?.booked),
      fundingClaimSubmitted: false,
      daysToFunded: null,
    };
    return [...scoped.filter((row) => row.id !== overlay.id), overlay];
  }, [graph, brand.partnerName, viewer.actor]);

  const summary = summarizeTelemetry(rows);
  const countBy = (key: "partner" | "pattern" | "mechanic") =>
    Object.entries(rows.reduce<Record<string, number>>((counts, row) => ({ ...counts, [row[key]]: (counts[row[key]] ?? 0) + 1 }), {}));
  const funnel = [
    ["Scoped", rows.length],
    ["Run", summary.sessionsRun],
    ["Hackathon proposed", summary.hackathonsProposed],
    ["Hackathon booked", summary.hackathonsBooked],
  ] as [string, number][];
  const patternConversion = Object.fromEntries(
    countBy("pattern").map(([pattern, count]) => {
      const booked = rows.filter((row) => row.pattern === pattern && row.outcome === "Hackathon booked").length;
      return [pattern, `${booked} booked of ${count}`];
    }),
  );
  const mechanicRows: [string, number][] = [
    ["Value sprint", rows.filter((row) => row.mechanic === "value-sprint").length],
    ["Ghost ledger", rows.filter((row) => row.mechanic === "ghost-ledger").length],
  ];
  const valueSprintConversion = mechanicConversion(rows, "value-sprint");
  const ghostLedgerConversion = mechanicConversion(rows, "ghost-ledger");
  const mechanicDetails = {
    "Value sprint": `${valueSprintConversion.funded} booked of ${valueSprintConversion.total} · ${valueSprintConversion.rate}% conversion`,
    "Ghost ledger": `${ghostLedgerConversion.funded} booked of ${ghostLedgerConversion.total} · ${ghostLedgerConversion.rate}% conversion`,
  };
  const overlayRow = rows.find((row) => row.id === graph.session.id);
  const recent = [
    ...(overlayRow ? [overlayRow] : []),
    ...recentTelemetryRows(rows.filter((row) => row.id !== graph.session.id), 8),
  ];
  const teamThisQuarter = rows.filter((row) => row.quarter === "Q3 2026").length;

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-8 md:px-8">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="md-label-large text-[var(--md-sys-color-primary)]">
            {viewer.actor === "partner"
              ? `${brand.partnerName} team view · ${viewer.name}`
              : viewer.actor === "pdm"
                ? `My partners · ${viewer.name}`
                : `Program performance · ${viewer.name}`}
          </p>
          <h1 className="md-headline-medium mt-1">Partner value-session telemetry</h1>
          <p className="md-body-medium mt-2 text-[var(--md-sys-color-on-surface-variant)]">
            {viewer.actor === "partner"
              ? `${brand.partnerName} cohort · ${rows.length} scoped sessions over eight quarters · live Heartland overlay included`
              : viewer.actor === "pdm"
                ? `My partners' cohort · ${rows.length} scoped sessions over eight quarters · live Heartland overlay shown separately`
                : `Program cohort · ${rows.length} scoped sessions over eight quarters · live Heartland overlay shown separately`}
          </p>
        </div>
        <div className="md-card-outlined w-full max-w-lg p-4">
          <div className="flex items-center gap-3">
            <Switch id="customer-detail" checked={detail} onCheckedChange={setDetail} className="data-checked:bg-[var(--md-sys-color-primary)]" />
            <label htmlFor="customer-detail" className="md-label-large">Customer-level detail</label>
            <span className="md-label-medium ml-auto text-[var(--md-sys-color-primary)]">{detail ? "On" : "Off"}</span>
          </div>
          <p className="md-body-medium mt-2 flex items-start gap-2 text-[var(--md-sys-color-on-surface-variant)]"><ShieldCheck className="mt-1 size-4 shrink-0" />Detail is shared only when {brand.partnerName} submits a funding claim.</p>
        </div>
      </div>

      <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {(viewer.actor === "partner"
          ? [
              ["My team's sessions in Q3 2026", teamThisQuarter.toLocaleString()],
              ["Funding claims submitted", summary.fundingClaimsSubmitted.toLocaleString()],
              ["Hackathons booked", summary.hackathonsBooked.toLocaleString()],
              ["Substantiated value", formatCompactCurrency(summary.fundedPipelineValue)],
            ]
          : [
              ["Sessions run", summary.sessionsRun.toLocaleString()],
              ["Hackathons proposed", summary.hackathonsProposed.toLocaleString()],
              ["Hackathons booked", summary.hackathonsBooked.toLocaleString()],
              ["Substantiated value", formatCompactCurrency(summary.fundedPipelineValue)],
            ]
        ).map(([label, value]) => (
          <div key={label} className="md-card-elevated p-5"><p className="md-label-medium text-[var(--md-sys-color-on-surface-variant)]">{label}</p><p className="md-headline-medium mt-2">{value}</p></div>
        ))}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        {viewer.actor !== "partner" && <Breakdown title="Sessions by partner" rows={countBy("partner")} />}
        <Breakdown title={`Sessions by pattern · ${viewer.actor === "partner" ? `${brand.partnerName} cohort n=${rows.length}` : `visible cohort n=${rows.length}`}`} rows={countBy("pattern")} details={patternConversion} />
        <Breakdown title={`Sessions by format · ${viewer.actor === "partner" ? `${brand.partnerName} cohort n=${rows.length}` : `visible cohort n=${rows.length}`}`} rows={mechanicRows} details={mechanicDetails} />
      </div>

      <section className="md-card-outlined mt-5 p-5">
        <h2 className="md-title-medium">Conversion funnel · scoped cohort n={rows.length}</h2>
        <div className="mt-5 grid gap-2 md:grid-cols-4">
          {funnel.map(([label, value], index) => (
            <div key={label} className="relative rounded-[var(--md-sys-shape-small)] border-l-4 border-[var(--md-sys-color-primary)] bg-[var(--md-sys-color-surface-container)] p-4" style={{ opacity: 1 - index * 0.08 }}>
              <p className="md-label-medium text-[var(--md-sys-color-on-surface-variant)]">{label}</p><p className="md-title-large mt-1">{value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="md-card-outlined mt-5 overflow-hidden">
        <div className="flex items-end justify-between border-b border-[var(--md-sys-color-outline-variant)] p-5">
          <div><h2 className="md-title-medium">Recent sessions</h2><p className="md-label-medium mt-1 text-[var(--md-sys-color-on-surface-variant)]">{detail ? "Funding-claim detail visible" : "Aggregated partner view"}</p></div>
          <span className="md-label-medium text-[var(--md-sys-color-on-surface-variant)]">{viewer.actor === "partner" ? "Your team's recent rows" : "Live Heartland overlay shown first"}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="md-body-medium w-full min-w-[980px] text-left">
            <thead className="md-label-medium bg-[var(--md-sys-color-surface-container)] text-[var(--md-sys-color-on-surface-variant)]"><tr>{detail && <th className="px-5 py-3 font-medium">Customer</th>}<th className="px-5 py-3 font-medium">Partner</th><th className="px-5 py-3 font-medium">Industry segment</th><th className="px-5 py-3 font-medium">Pattern</th><th className="px-5 py-3 font-medium">Who ran it</th><th className="px-5 py-3 font-medium">Format</th><th className="px-5 py-3 font-medium">Close style</th><th className="px-5 py-3 font-medium">Qualification</th><th className="px-5 py-3 font-medium">Outcome</th>{showOpportunity && <th className="px-5 py-3 font-medium">Opportunity</th>}<th className="px-5 py-3 font-medium">Quarter</th></tr></thead>
            <tbody className="divide-y divide-[var(--md-sys-color-outline-variant)]">
              {recent.map((row) => (
                <tr key={row.id} className={row.id === graph.session.id ? "bg-[var(--md-sys-color-primary-container)]" : "hover:bg-[color-mix(in_srgb,var(--md-sys-color-primary)_5%,transparent)]"}>
                  {detail && <td className="px-5 py-4 font-medium">{row.customer ?? "Shared with claim"}</td>}
                  <td className="px-5 py-4">{row.partner}</td>
                  <td className="px-5 py-4">{row.industry}</td>
                  <td className="px-5 py-4">{row.pattern}</td>
                  <td className="px-5 py-4">{row.delivery === "self-service" ? "Customer-run" : row.delivery === "google-facilitated" ? "Google-facilitated" : "Partner-facilitated"}</td>
                  <td className="px-5 py-4">{row.mechanic === "ghost-ledger" ? "Ghost ledger" : "Value sprint"}</td>
                  <td className="px-5 py-4">{row.closeStyle === "board-slide" ? "Board slide" : "Owner and ask"}</td>
                  <td className="px-5 py-4">{row.delivery === "facilitated" ? "—" : row.qualified ? "Qualified" : "Not qualified"}</td>
                  <td className="px-5 py-4"><OutcomeStatus outcome={row.outcome} /></td>
                  {showOpportunity && <td className="px-5 py-4 font-medium">{row.opportunityValue ? formatCompactCurrency(row.opportunityValue) : "—"}</td>}
                  <td className="px-5 py-4 text-[var(--md-sys-color-on-surface-variant)]">{row.quarter}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="mt-5"><Link href="/pilot-spec" className="md-button-outlined"><ArrowLeft className="size-4" /> Back to pilot spec</Link></div>
    </div>
  );
}
