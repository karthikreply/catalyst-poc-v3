"use client";

import { useSession } from "@/components/session-provider";
import { isCustomerViewer, hasCompleteValueInputs } from "@/lib/session";
import { calculateDailyValue, formatCurrency } from "@/lib/value";

export function ValueSprintPanel() {
  const { graph, updateValue, updateValueConfirmer, canEditSession, viewer } = useSession();
  const claims = graph.valueInputs.find((input) => input.id === "claims")!;
  const delay = graph.valueInputs.find((input) => input.id === "delay")!;
  const handling = graph.valueInputs.find((input) => input.id === "handling")!;
  const complete = hasCompleteValueInputs(graph);
  const dailyValue = complete
    ? calculateDailyValue(claims.quantity!, delay.quantity!, handling.quantity!)
    : null;
  const selfService = graph.session.delivery === "self-service";
  const customer = isCustomerViewer(viewer.actor);
  const attendeeNames = new Set(graph.attendees.map((attendee) => attendee.name));
  const InputRow = selfService ? "div" : "label";

  if (customer) {
    return (
      <div className="mt-7 rounded-sm border border-black/10 bg-white p-6 lg:p-8">
        <p className="text-sm font-medium text-black/50">Agreed cost of avoidable delay</p>
        {dailyValue === null ? (
          <div className="mt-4">
            <p className="text-xl font-semibold">Value inputs not captured yet</p>
            <p className="mt-2 max-w-md text-sm leading-6 text-black/55">Add all three inputs to calculate daily and annual value.</p>
          </div>
        ) : (
          <>
            <div key={dailyValue} className="value-flash mt-2 inline-block rounded-sm px-1 text-5xl font-semibold tracking-[-0.05em] md:text-6xl">
              {formatCurrency(dailyValue)}
              <span className="ml-1 text-xl tracking-normal text-black/45">/day</span>
            </div>
            <p className="mt-3 text-sm text-black/55">{formatCurrency(graph.outcome.annualValue)} per year at 250 working days</p>
          </>
        )}
        {selfService && <p className="mt-1 text-sm font-medium text-amber-800">Unverified estimate</p>}
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {graph.valueInputs.map((input) => (
            <label key={input.id} className="text-sm font-medium">
              {input.label}
              <span className="mt-2 flex items-center rounded-sm border border-black/15 bg-white px-2 font-normal focus-within:border-[var(--brand-accent)] focus-within:ring-2 focus-within:ring-[color-mix(in_srgb,var(--brand-accent)_15%,transparent)]">
                {input.id === "handling" && <span className="text-black/45">$</span>}
                <input
                  aria-label={input.label}
                  type="number"
                  readOnly={!canEditSession}
                  value={input.quantity ?? ""}
                  step={input.id === "handling" ? "0.25" : "1"}
                  onChange={(event) => updateValue(input.id, event.target.value === "" ? null : Number(event.target.value))}
                  className="min-w-0 flex-1 bg-transparent px-1 py-2 text-right font-semibold tabular-nums outline-none"
                />
              </span>
            </label>
          ))}
        </div>
        {!canEditSession && (
          <p className="mt-3 text-xs text-black/48">Completed-session evidence shared by the partner; editing remains partner-owned.</p>
        )}
      </div>
    );
  }

  return (
    <div className="mt-7 grid gap-px overflow-hidden rounded-sm border border-black/10 bg-black/10 lg:grid-cols-[1.2fr_.8fr]">
      <div className="bg-white p-6 lg:p-8">
        <p className="text-sm font-medium text-black/50">Agreed cost of avoidable delay</p>
        {dailyValue === null ? (
          <div className="mt-4">
            <p className="text-xl font-semibold">Value inputs not captured yet</p>
            <p className="mt-2 max-w-md text-sm leading-6 text-black/55">Add all three inputs to calculate daily and annual value.</p>
          </div>
        ) : (
          <>
            <div key={dailyValue} className="value-flash mt-2 inline-block rounded-sm px-1 text-5xl font-semibold tracking-[-0.05em] md:text-6xl">
              {formatCurrency(dailyValue)}
              <span className="ml-1 text-xl tracking-normal text-black/45">/day</span>
            </div>
            <p className="mt-3 text-sm text-black/55">{formatCurrency(graph.outcome.annualValue)} per year at 250 working days</p>
          </>
        )}
        {selfService && <p className="mt-1 text-sm font-medium text-amber-800">Unverified estimate</p>}
      </div>
      <div className="bg-white p-5">
        <p className="mb-3 text-sm font-medium">Confirmed inputs</p>
        <div className="space-y-3">
          {graph.valueInputs.map((input) => (
            <InputRow key={input.id} className="grid grid-cols-[1fr_100px] items-center gap-4 text-sm">
              <span>
                {input.label}
                <span id={`${input.id}-confirmer-status`} className="block text-xs text-black/45">
                  {selfService
                    ? input.confirmedBy
                      ? `Confirmed by ${input.confirmedBy} · not facilitator-verified`
                      : "Choose who confirmed · not facilitator-verified"
                    : input.confirmedBy
                      ? `Confirmed by ${input.confirmedBy}`
                      : "Unconfirmed"}
                </span>
                {selfService && (
                  <select
                    aria-label={`Confirmer for ${input.label}`}
                    aria-describedby={`${input.id}-confirmer-status`}
                    value={input.confirmedBy ?? ""}
                    disabled={!canEditSession}
                    onChange={(event) => updateValueConfirmer(input.id, event.target.value || null)}
                    className="mt-2 w-full rounded-sm border border-black/15 bg-white px-2 py-2 text-sm outline-none focus:border-[var(--brand-accent)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--brand-accent)_15%,transparent)] disabled:bg-black/[.03] disabled:text-black/45"
                  >
                    <option value="">Choose attendee</option>
                    {input.confirmedBy && !attendeeNames.has(input.confirmedBy) && (
                      <option value={input.confirmedBy}>{input.confirmedBy}</option>
                    )}
                    {graph.attendees.map((attendee) => (
                      <option key={attendee.id} value={attendee.name}>{attendee.name}</option>
                    ))}
                  </select>
                )}
              </span>
              {" "}
              <span className="flex items-center rounded-sm border border-black/15 bg-white px-2 focus-within:border-[var(--brand-accent)] focus-within:ring-2 focus-within:ring-[color-mix(in_srgb,var(--brand-accent)_15%,transparent)]">
                {input.id === "handling" && <span className="text-black/45">$</span>}
                <input
                  aria-label={input.label}
                  type="number"
                  readOnly={!canEditSession}
                  value={input.quantity ?? ""}
                  step={input.id === "handling" ? "0.25" : "1"}
                  onChange={(event) => updateValue(input.id, event.target.value === "" ? null : Number(event.target.value))}
                  className="min-w-0 flex-1 bg-transparent px-1 py-2 text-right font-semibold tabular-nums outline-none"
                />
              </span>
            </InputRow>
          ))}
        </div>
      </div>
    </div>
  );
}
