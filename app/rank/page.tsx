"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowRight, ArrowUp, Lock, Unlock } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSession } from "@/components/session-provider";
import type { HackathonBooking, SessionGraph } from "@/lib/seed";
import { defaultHackathonDraft, rankedSolutions, winningSolution } from "@/lib/session";
import { cn } from "@/lib/utils";

export default function RankPage() {
  const {
    graph,
    canEditSession,
    moveSolution,
    lockRanking,
    unlockRanking,
    bookHackathon,
  } = useSession();
  const ordered = rankedSolutions(graph);
  const winner = winningSolution(graph);
  const locked = graph.ranking.locked;
  const booked = Boolean(graph.hackathon?.booked);
  const coldIllustrative = graph.session.scopeMode === "cold";

  return (
    <div className="px-5 py-8 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-black/48">{graph.session.customerName}</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">Rank solutions</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-black/58">
              Prepared shortlist for the claims case. Rank after pain and value are captured. Only rank 1 proceeds to the hackathon close.
              {coldIllustrative && (
                <span className="mt-1 block text-xs text-amber-900">Illustrative Heartland shortlist · cold session has no generated solutions.</span>
              )}
            </p>
          </div>
          {booked ? (
            <Link href="/artifact" className={buttonVariants({ className: "bg-[var(--brand-accent)] hover:bg-[var(--brand-accent-dark)]" })}>
              Open business case <ArrowRight />
            </Link>
          ) : (
            <Button type="button" disabled className="opacity-50">Open business case</Button>
          )}
        </div>

        <section className="mt-8 rounded-sm border border-black/10 bg-white p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Shortlist</h2>
            {canEditSession && (
              locked ? (
                <Button type="button" variant="outline" size="sm" onClick={unlockRanking} disabled={booked}>
                  <Unlock className="size-3.5" /> Unlock ranking
                </Button>
              ) : (
                <Button type="button" size="sm" onClick={lockRanking} className="bg-[var(--brand-accent)] hover:bg-[var(--brand-accent-dark)]">
                  <Lock className="size-3.5" /> Lock rank 1
                </Button>
              )
            )}
          </div>
          <ol className="mt-5 divide-y divide-black/10 border-y border-black/10">
            {ordered.map((solution, index) => (
              <li key={solution.id} className={cn("grid gap-3 py-4 md:grid-cols-[2.5rem_1fr_auto] md:items-start", index === 0 && locked && "bg-[color-mix(in_srgb,var(--brand-accent)_5%,white)]")}>
                <span className="text-sm font-semibold text-black/45">{index + 1}</span>
                <div>
                  <p className="font-semibold">{solution.title}</p>
                  <p className="mt-1 text-sm leading-6 text-black/62">{solution.outcome}</p>
                  <p className="mt-1 text-xs text-black/48">{solution.valueAnchor}</p>
                </div>
                {!locked && canEditSession && (
                  <div className="flex gap-1">
                    <Button type="button" variant="outline" size="sm" aria-label={`Move ${solution.title} up`} disabled={index === 0} onClick={() => moveSolution(solution.id, "up")}>
                      <ArrowUp className="size-3.5" />
                    </Button>
                    <Button type="button" variant="outline" size="sm" aria-label={`Move ${solution.title} down`} disabled={index === ordered.length - 1} onClick={() => moveSolution(solution.id, "down")}>
                      <ArrowDown className="size-3.5" />
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ol>
        </section>

        {locked && (
          <HackathonBookingForm
            key={`${graph.ranking.order[0]}-${booked ? "booked" : "draft"}`}
            graph={graph}
            winnerTitle={winner?.title ?? "the winning solution"}
            canEditSession={canEditSession}
            booked={booked}
            bookHackathon={bookHackathon}
          />
        )}
      </div>
    </div>
  );
}

function HackathonBookingForm({
  graph,
  winnerTitle,
  canEditSession,
  booked,
  bookHackathon,
}: {
  graph: SessionGraph;
  winnerTitle: string;
  canEditSession: boolean;
  booked: boolean;
  bookHackathon: (draft: Omit<HackathonBooking, "booked">) => void;
}) {
  const [draft, setDraft] = useState(() => graph.hackathon ?? defaultHackathonDraft(graph));
  const canBook =
    canEditSession
    && !booked
    && draft.date.trim()
    && draft.googleFacilitator.trim()
    && draft.partnerSpecialist.trim()
    && draft.customerOwner.trim()
    && draft.question.trim();

  return (
    <section className="mt-5 rounded-sm border border-black/10 bg-white p-6">
      <h2 className="text-lg font-semibold">Book the three-day hackathon</h2>
      <p className="mt-2 text-sm leading-6 text-black/58">
        The three days exist to scope a six-week pilot on {winnerTitle} and to answer what this case does not yet prove.
      </p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1.5 text-sm">
          <span className="text-xs font-medium text-black/45">Hackathon date</span>
          <Input
            type="date"
            value={draft.date}
            disabled={!canEditSession || booked}
            onChange={(event) => setDraft((current) => ({ ...current, date: event.target.value }))}
            aria-label="Hackathon date"
          />
        </label>
        <label className="grid gap-1.5 text-sm sm:col-span-2">
          <span className="text-xs font-medium text-black/45">Question the hackathon must answer</span>
          <Input
            value={draft.question}
            disabled={!canEditSession || booked}
            onChange={(event) => setDraft((current) => ({ ...current, question: event.target.value }))}
            aria-label="Question the hackathon must answer"
          />
        </label>
        <label className="grid gap-1.5 text-sm">
          <span className="text-xs font-medium text-black/45">Google facilitator</span>
          <Input
            value={draft.googleFacilitator}
            disabled={!canEditSession || booked}
            onChange={(event) => setDraft((current) => ({ ...current, googleFacilitator: event.target.value }))}
            aria-label="Google facilitator"
          />
        </label>
        <label className="grid gap-1.5 text-sm">
          <span className="text-xs font-medium text-black/45">Partner specialist</span>
          <Input
            value={draft.partnerSpecialist}
            disabled={!canEditSession || booked}
            onChange={(event) => setDraft((current) => ({ ...current, partnerSpecialist: event.target.value }))}
            aria-label="Partner specialist"
          />
        </label>
        <label className="grid gap-1.5 text-sm sm:col-span-2">
          <span className="text-xs font-medium text-black/45">Customer owner</span>
          <Input
            value={draft.customerOwner}
            disabled={!canEditSession || booked}
            onChange={(event) => setDraft((current) => ({ ...current, customerOwner: event.target.value }))}
            aria-label="Customer owner"
          />
        </label>
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        {booked ? (
          <>
            <p role="status" className="text-xs font-medium text-black/48">Booked · {graph.hackathon?.date}</p>
            <Link href="/artifact" className={buttonVariants({ className: "bg-[var(--brand-accent)] hover:bg-[var(--brand-accent-dark)]" })}>
              Open business case <ArrowRight />
            </Link>
          </>
        ) : (
          <Button
            type="button"
            disabled={!canBook}
            className="bg-[var(--brand-accent)] hover:bg-[var(--brand-accent-dark)]"
            onClick={() => bookHackathon({
              date: draft.date,
              googleFacilitator: draft.googleFacilitator,
              partnerSpecialist: draft.partnerSpecialist,
              customerOwner: draft.customerOwner,
              question: draft.question,
            })}
          >
            Book hackathon
          </Button>
        )}
      </div>
    </section>
  );
}
