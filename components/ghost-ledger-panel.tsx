"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { useSession } from "@/components/session-provider";
import { componentMonthlyTotal, ledgerAnnualTotal, ledgerMonthlyTotal, perSecondRate } from "@/lib/cost-model";
import { isCustomerViewer, hasCompleteCostComponents } from "@/lib/session";
import { formatCurrency, formatPreciseCurrency } from "@/lib/value";

export function GhostLedgerPanel() {
  const { graph, updateCostInput, freezeLedgerNow, canEditSession, viewer } = useSession();
  const annual = useMemo(() => ledgerAnnualTotal(graph.costComponents), [graph.costComponents]);
  const monthly = useMemo(() => ledgerMonthlyTotal(graph.costComponents), [graph.costComponents]);
  const rate = perSecondRate(annual);
  const complete = hasCompleteCostComponents(graph);
  const frozen = graph.session.ledgerFrozen || !canEditSession;
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (frozen || !complete) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const started = Date.now();
    const timer = window.setInterval(() => setElapsed((Date.now() - started) / 1000), 100);
    return () => window.clearInterval(timer);
  }, [complete, frozen, monthly]);

  const liveTotal = frozen ? annual : Math.round(rate * elapsed);

  return (
    <div className="mt-7 rounded-sm border border-black/10 bg-white p-6 lg:p-8">
      <p className="text-sm font-medium text-black/50">{frozen ? "Frozen cost of inaction" : "Cost of inaction, ticking"}</p>
      {complete ? (
        <>
          <div key={`${monthly}-${frozen}`} className="value-flash mt-2 text-5xl font-semibold tracking-[-0.05em] md:text-6xl">
            {formatCurrency(frozen ? annual : liveTotal)}
            <span className="ml-1 text-xl tracking-normal text-black/45">{frozen ? "/year" : " accumulated"}</span>
          </div>
          <p className="mt-2 text-sm text-black/55">
            {formatCurrency(monthly)} / month · {formatPreciseCurrency(rate)} / second
            {frozen ? " · committed figure, not exploratory." : ""}
          </p>
        </>
      ) : (
        <div className="mt-4">
          <p className="text-xl font-semibold">Ledger inputs not captured yet</p>
          <p className="mt-2 text-sm text-black/55">Complete the ledger rows before calculating a cost of inaction.</p>
        </div>
      )}
      {graph.session.delivery === "self-service" && (
        <p className="mt-1 text-sm font-medium text-amber-800">Unverified estimate</p>
      )}
      {isCustomerViewer(viewer.actor) && !canEditSession && (
        <p className="mt-3 text-sm text-black/58">Historical session record — the platform vendor sees completed evidence shared by the partner, not live session activity.</p>
      )}
      <div className="mt-6 divide-y divide-black/10 border-y border-black/10">
        {graph.costComponents.map((component) => (
          <div key={component.id} className="grid gap-3 py-4 md:grid-cols-[180px_1fr_140px]">
            <div>
              <p className="font-semibold">{component.label}</p>
              <p className="text-xs text-black/45">{component.confirmedBy ?? "unconfirmed"}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              {component.inputs.map((input) => (
                <label key={input.label} className="text-xs">
                  <span className="block text-black/45">{input.label}</span>
                  <input
                    aria-label={`${component.label} ${input.label}`}
                    type="number"
                    readOnly={frozen}
                    step={input.label === "Reopen rate" ? "0.01" : "1"}
                    value={input.quantity ?? ""}
                    onChange={(event) => updateCostInput(component.id, input.label, event.target.value === "" ? null : Number(event.target.value))}
                    className="mt-1 w-28 rounded-sm border border-black/15 px-2 py-1.5 text-sm font-semibold tabular-nums outline-none focus:border-[var(--brand-accent)]"
                  />
                </label>
              ))}
            </div>
            <p className="self-center text-right text-sm font-semibold tabular-nums">
              {component.inputs.every((input) => input.quantity !== null)
                ? `${formatCurrency(componentMonthlyTotal(component))}/mo`
                : "Incomplete"}
            </p>
          </div>
        ))}
      </div>
      {!frozen && complete && (
        <Button className="mt-5 bg-[var(--brand-accent)] hover:bg-[var(--brand-accent-dark)]" onClick={freezeLedgerNow}>
          Freeze the ledger
        </Button>
      )}
    </div>
  );
}
