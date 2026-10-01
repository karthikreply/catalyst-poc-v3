"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { SessionGraph } from "@/lib/seed";
import { defaultHackathonDraft, defaultShowcaseAt, type HackathonDraft } from "@/lib/session";

export function HackathonBookingForm({
  graph,
  selectedTitles,
  canEdit,
  bookHackathon,
}: {
  graph: SessionGraph;
  selectedTitles: string[];
  canEdit: boolean;
  bookHackathon: (draft: HackathonDraft) => void;
}) {
  const [draft, setDraft] = useState(() => {
    const base = graph.hackathon ?? defaultHackathonDraft(graph);
    return {
      date: base.date,
      googleFacilitator: base.googleFacilitator,
      partnerSpecialist: base.partnerSpecialist,
      customerOwner: base.customerOwner,
      question: base.question,
      // Empty until edited: the showcase follows the date to the afternoon of the third day.
      showcaseAt: base.showcaseAt ?? "",
    };
  });
  const showcaseAt = draft.showcaseAt || defaultShowcaseAt(draft.date);
  const fieldsReady =
    draft.date.trim()
    && draft.googleFacilitator.trim()
    && draft.partnerSpecialist.trim()
    && draft.customerOwner.trim()
    && draft.question.trim();

  return (
    <section className="mx-auto mt-5 max-w-4xl rounded-sm border border-black/10 bg-white p-6" aria-label="Book the hackathon">
      <h2 className="text-lg font-semibold text-black">Book the three-day hackathon</h2>
      <p className="mt-2 text-sm leading-6 text-black/75">
        The three days scope a six-week pilot on these solutions.
      </p>
      <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-black/85">
        {selectedTitles.map((title) => (
          <li key={title}>{title}</li>
        ))}
      </ul>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1.5 text-sm">
          <span className="text-xs font-medium text-black/70">Hackathon date</span>
          <Input
            type="date"
            value={draft.date}
            disabled={!canEdit}
            onChange={(event) => setDraft((current) => ({ ...current, date: event.target.value }))}
            aria-label="Hackathon date"
          />
        </label>
        <label className="grid gap-1.5 text-sm">
          <span className="text-xs font-medium text-black/70">Solution showcase</span>
          <Input
            type="datetime-local"
            value={showcaseAt}
            disabled={!canEdit}
            onChange={(event) => setDraft((current) => ({ ...current, showcaseAt: event.target.value }))}
            aria-label="Solution showcase"
          />
          <span className="text-xs text-black/48">Afternoon of the third day unless you move it.</span>
        </label>
        <label className="grid gap-1.5 text-sm sm:col-span-2">
          <span className="text-xs font-medium text-black/70">Question the hackathon must answer</span>
          <Input
            value={draft.question}
            disabled={!canEdit}
            onChange={(event) => setDraft((current) => ({ ...current, question: event.target.value }))}
            aria-label="Question the hackathon must answer"
          />
        </label>
        <label className="grid gap-1.5 text-sm">
          <span className="text-xs font-medium text-black/70">Google facilitator</span>
          <Input
            value={draft.googleFacilitator}
            disabled={!canEdit}
            onChange={(event) => setDraft((current) => ({ ...current, googleFacilitator: event.target.value }))}
            aria-label="Google facilitator"
          />
        </label>
        <label className="grid gap-1.5 text-sm">
          <span className="text-xs font-medium text-black/70">Partner specialist</span>
          <Input
            value={draft.partnerSpecialist}
            disabled={!canEdit}
            onChange={(event) => setDraft((current) => ({ ...current, partnerSpecialist: event.target.value }))}
            aria-label="Partner specialist"
          />
        </label>
        <label className="grid gap-1.5 text-sm sm:col-span-2">
          <span className="text-xs font-medium text-black/70">Customer owner</span>
          <Input
            value={draft.customerOwner}
            disabled={!canEdit}
            onChange={(event) => setDraft((current) => ({ ...current, customerOwner: event.target.value }))}
            aria-label="Customer owner"
          />
        </label>
      </div>
      <div className="mt-5">
        <Button
          type="button"
          disabled={!canEdit || !fieldsReady}
          className="bg-[var(--brand-accent)] hover:bg-[var(--brand-accent-dark)]"
          onClick={() => bookHackathon({ ...draft, showcaseAt })}
        >
          Book hackathon
        </Button>
      </div>
    </section>
  );
}
