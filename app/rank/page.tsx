"use client";

import Link from "next/link";
import { ArrowDown, ArrowRight, ArrowUp, Lock, Unlock } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { HackathonThreeDays } from "@/components/hackathon-three-days";
import { WhatTheThreeDaysWillBe } from "@/components/what-the-three-days-will-be";
import { useSession } from "@/components/session-provider";
import {
  bookedSolutionTitles,
  canBookHackathon,
  latestStepCapture,
  rankedSolutions,
  sampleRunHasStarted,
  selectedSolutions,
  showsTryItCard,
  voteTallies,
} from "@/lib/session";
import { cn } from "@/lib/utils";

function rankActionClass(primary: boolean) {
  return primary
    ? buttonVariants({ className: "bg-[var(--brand-accent)] hover:bg-[var(--brand-accent-dark)]" })
    : cn(buttonVariants({ variant: "outline" }), "border-black/30 bg-[#f4f4f1] hover:bg-black/[.06]");
}

function RankBookAction({ mayBook, primary, selectedCount }: { mayBook: boolean; primary: boolean; selectedCount: number }) {
  if (selectedCount === 3 && mayBook) {
    return <Link href="/artifact" className={rankActionClass(primary)}>Book the hackathon</Link>;
  }
  return <Button type="button" disabled className="opacity-50">Book the hackathon</Button>;
}

export default function RankPage() {
  const {
    graph,
    viewer,
    canEditSession,
    moveSolution,
    toggleSelected,
    lockRanking,
    unlockRanking,
    castVote,
  } = useSession();
  const ordered = rankedSolutions(graph);
  const selected = selectedSolutions(graph);
  const selectedCount = graph.ranking.selected.length;
  const locked = graph.ranking.locked;
  const booked = Boolean(graph.hackathon?.booked);
  const coldSample = graph.session.scopeMode === "cold";
  const tallies = voteTallies(graph);
  const canSelectMore = selectedCount < 3;
  const canSelect = canEditSession || viewer.actor === "cpm";
  const canReorder = canEditSession;
  const mayBook = canBookHackathon(viewer.actor);
  const showTryCard = showsTryItCard(graph);
  const tried = sampleRunHasStarted(graph);
  const customerViewer = viewer.actor === "cpm";
  const latestCapture = customerViewer ? latestStepCapture(graph) : null;
  const topThreeTitles = Array.isArray(graph.ranking.selected) && graph.ranking.selected.length
    ? selected.map((solution) => solution.title)
    : bookedSolutionTitles(graph);

  return (
    <div className="px-5 py-8 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-black/48">{graph.session.customerName}</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">
              {coldSample ? "Sample shortlist, not this account's case" : "Rank solutions"}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-black/58">
              Prepared shortlist for the claims case. Rank after pain and value are captured. Choose three.
              {mayBook ? " Booking the hackathon is the next action." : " The partner books the hackathon."}
              {coldSample && (
                <span className="mt-1 block text-xs text-amber-900">
                  Sample figures from the Heartland case, not from {graph.session.customerName}.
                </span>
              )}
            </p>
            {booked && (
              <p role="status" className="mt-2 text-sm font-medium text-black">Booked · {graph.hackathon?.date}</p>
            )}
          </div>
          {showTryCard && !booked ? null : booked ? (
            <Link href="/artifact" className={buttonVariants({ className: "bg-[var(--brand-accent)] hover:bg-[var(--brand-accent-dark)]" })}>
              Open business case <ArrowRight />
            </Link>
          ) : selectedCount === 3 && mayBook ? (
            <Link href="/artifact" className={buttonVariants({ className: "bg-[var(--brand-accent)] hover:bg-[var(--brand-accent-dark)]" })}>
              Book the hackathon <ArrowRight />
            </Link>
          ) : (
            <Button type="button" disabled className="opacity-50">Book the hackathon</Button>
          )}
        </div>

        {showTryCard && (
          <section data-try-card className="mt-8 rounded-sm border border-black/10 bg-white p-6" aria-label="Try it on sample claims">
            <div className="flex flex-wrap gap-3">
              {tried ? (
                <>
                  <RankBookAction mayBook={mayBook} primary selectedCount={selectedCount} />
                  <Link href="/try" className={rankActionClass(false)}>Try it on sample claims</Link>
                </>
              ) : (
                <>
                  <Link href="/try" className={rankActionClass(true)}>Try it on sample claims</Link>
                  <RankBookAction mayBook={mayBook} primary={false} selectedCount={selectedCount} />
                </>
              )}
            </div>
          </section>
        )}

        {booked && <HackathonThreeDays graph={graph} className="mt-8" />}
        {!booked && selectedCount === 3 && (
          <WhatTheThreeDaysWillBe
            solutions={selected}
            className="mt-8 rounded-sm border border-black/10 bg-white p-6"
          />
        )}

        <section className="mt-8 rounded-sm border border-black/10 bg-white p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Shortlist</h2>
              <p className="mt-1 text-sm text-black/55">{selectedCount} of 3 selected</p>
            </div>
            {canSelect && (
              locked ? (
                <Button type="button" variant="outline" size="sm" onClick={unlockRanking} disabled={booked} title={booked ? "Unlock is unavailable after booking" : undefined}>
                  <Unlock className="size-3.5" /> Unlock ranking
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  onClick={lockRanking}
                  disabled={selectedCount !== 3}
                  title={selectedCount !== 3 ? "Choose three before locking" : undefined}
                  className="bg-[var(--brand-accent)] hover:bg-[var(--brand-accent-dark)]"
                >
                  <Lock className="size-3.5" /> Lock ranking
                </Button>
              )
            )}
          </div>
          {selectedCount !== 3 && !booked && (
            <p className="mt-3 text-xs text-black/48">
              Choose three.
              {canSelect && !locked ? (
                <span className="mt-1 block">Choose three before locking</span>
              ) : null}
            </p>
          )}

          {viewer.actor === "cpm" && (
            <p className="mt-4 text-sm text-black/58">Votes are visible. The three you select are what get booked.</p>
          )}

          {customerViewer && (
            <div className="mt-4 space-y-3" aria-label="Your session so far">
              {latestCapture && (
                <blockquote className="border-l-2 border-[var(--brand-accent)] pl-4 text-sm leading-6 text-black/80">
                  “{latestCapture.text}” <cite className="not-italic text-black/48">— {latestCapture.attributedTo}</cite>
                </blockquote>
              )}
              <div className="rounded-sm border border-black/15 bg-[#fafaf8] px-4 py-3 text-sm" role="status">
                <p className="font-semibold text-black">Your top 3 · {topThreeTitles.length}/3</p>
                {topThreeTitles.length > 0 && (
                  <ol className="mt-1 list-decimal space-y-0.5 pl-5 text-black/80">
                    {topThreeTitles.map((title) => <li key={title}>{title}</li>)}
                  </ol>
                )}
              </div>
            </div>
          )}

          <ol className="mt-5 divide-y divide-black/10 border-y border-black/10">
            {ordered.map((solution, index) => {
              const isSelected = graph.ranking.selected.includes(solution.id);
              const blockedAdd = !isSelected && !canSelectMore && !locked && !booked;
              return (
                <li
                  key={solution.id}
                  className={cn(
                    "grid gap-3 py-4 md:grid-cols-[2.5rem_1fr_auto] md:items-start",
                    isSelected && "bg-[color-mix(in_srgb,var(--brand-accent)_5%,white)]",
                  )}
                >
                  <span className="text-sm font-semibold text-black/45">{index + 1}</span>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{solution.title}</p>
                      {viewer.actor === "cpm" && (
                        <span className="text-xs text-black/48">{tallies[solution.id] ?? 0} votes</span>
                      )}
                    </div>
                    <p className="mt-1 text-sm leading-6 text-black/62">{solution.outcome}</p>
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
                    {viewer.actor === "cpm" && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {graph.attendees.filter((person) => person.attendance === "attending").map((person) => (
                          <Button
                            key={person.id}
                            type="button"
                            size="sm"
                            variant={graph.votes[person.id] === solution.id ? "default" : "outline"}
                            onClick={() => castVote(person.id, solution.id)}
                            aria-label={`Vote ${person.name} for ${solution.title}`}
                          >
                            {person.name.split(" ")[0]}
                          </Button>
                        ))}
                      </div>
                    )}
                    {blockedAdd && (
                      <p className="mt-2 text-xs text-black/48">Three already selected</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {canSelect && !locked && !booked && (
                      <Button
                        type="button"
                        size="sm"
                        variant={isSelected ? "default" : "outline"}
                        disabled={blockedAdd}
                        onClick={() => toggleSelected(solution.id)}
                        className={isSelected ? "bg-[var(--brand-accent)] hover:bg-[var(--brand-accent-dark)]" : undefined}
                      >
                        {isSelected ? "Selected" : "Select"}
                      </Button>
                    )}
                    {!locked && canReorder && !booked && (
                      <div className="flex gap-1">
                        <Button type="button" variant="outline" size="sm" aria-label={`Move ${solution.title} up`} disabled={index === 0} onClick={() => moveSolution(solution.id, "up")}>
                          <ArrowUp className="size-3.5" />
                        </Button>
                        <Button type="button" variant="outline" size="sm" aria-label={`Move ${solution.title} down`} disabled={index === ordered.length - 1} onClick={() => moveSolution(solution.id, "down")}>
                          <ArrowDown className="size-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>

          {viewer.actor === "pdm" && (
            <p className="mt-5 text-sm text-black/62">Here is what the session produced. What would you like to do with it?</p>
          )}
        </section>
      </div>
    </div>
  );
}
