"use client";

import Link from "next/link";
import { ArrowDown, ArrowRight, ArrowUp, File, Layers, Lock, ScrollText, Search, Unlock } from "lucide-react";

import { BookHackathonAction } from "@/components/book-hackathon-action";
import { Button, buttonVariants } from "@/components/ui/button";
import { HackathonThreeDays } from "@/components/hackathon-three-days";
import { WhatTheThreeDaysWillBe } from "@/components/what-the-three-days-will-be";
import { useSession } from "@/components/session-provider";
import { patterns } from "@/lib/seed";
import { isCustomerViewer,
  bookedSolutionTitles,
  canBookHackathon,
  googleProductRoles,
  latestStepCapture,
  rankedSolutions,
  sampleRunHasStarted,
  selectedSolutions,
  showsTryItCard,
} from "@/lib/session";
import { patternBookedSignal } from "@/lib/telemetry";
import { cn } from "@/lib/utils";

const productIcons: Record<string, typeof File> = {
  "Document AI": File,
  "Vertex AI": Layers,
  "Vertex AI Search": Search,
  "Cloud Logging": ScrollText,
};

function voteLine(graph: ReturnType<typeof useSession>["graph"], solutionId: string) {
  const voters = graph.attendees.filter((person) => graph.votes[person.id] === solutionId);
  if (!voters.length) return null;
  return `${voters.length} votes · ${voters.map((person) => person.name).join(", ")}`;
}

function evidenceLine(graph: ReturnType<typeof useSession>["graph"], stepId: string | undefined) {
  const quotes = graph.captures.filter((capture) => capture.stepId === stepId);
  if (!quotes.length) return null;
  const names: string[] = [];
  for (const quote of quotes) {
    if (!names.includes(quote.attributedTo)) names.push(quote.attributedTo);
  }
  const label = quotes.length === 1 ? "quote" : "quotes";
  return `${quotes.length} ${label} · ${names.join(", ")}`;
}

const geminiColors = ["#4285F4", "#EA4335", "#FBBC05", "#34A853"] as const;

function GeminiMark() {
  const [blue, red, yellow, green] = geminiColors;
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className="size-3.5" data-gemini-mark="">
      <path stroke={blue} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z" />
      <path stroke={red} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M20 2v4" />
      <path stroke={yellow} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M22 4h-4" />
      <circle stroke={green} strokeWidth="2" cx="4" cy="20" r="2" />
    </svg>
  );
}

function rankActionClass(primary: boolean) {
  return primary
    ? buttonVariants({ className: "bg-[var(--brand-accent)] hover:bg-[var(--brand-accent-dark)]" })
    : cn(buttonVariants({ variant: "outline" }), "border-black/30 bg-[#f4f4f1] hover:bg-black/[.06]");
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
  const canSelectMore = selectedCount < 3;
  const canSelect = canEditSession || isCustomerViewer(viewer.actor);
  const canReorder = canEditSession;
  const mayBook = canBookHackathon(viewer.actor);
  const showTryCard = showsTryItCard(graph);
  const tried = sampleRunHasStarted(graph);
  const customerViewer = isCustomerViewer(viewer.actor);
  const patternName = patterns.find((pattern) => pattern.id === graph.session.patternId)?.name;
  const programSignal = !customerViewer && patternName ? patternBookedSignal(patternName) : null;
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
          ) : (
            <BookHackathonAction primary />
          )}
        </div>

        {showTryCard && (
          <section data-try-card className="mt-8 rounded-sm border border-black/10 bg-white p-6" aria-label="Try it on sample claims">
            <div className="flex flex-wrap gap-3">
              {tried ? (
                <>
                  <BookHackathonAction primary />
                  <Link href="/try" className={rankActionClass(false)}>Try it on sample claims</Link>
                </>
              ) : (
                <>
                  <Link href="/try" className={rankActionClass(true)}>Try it on sample claims</Link>
                  <BookHackathonAction />
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

          {isCustomerViewer(viewer.actor) && (
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
              const votes = voteLine(graph, solution.id);
              const evidence = evidenceLine(graph, solution.stepId);
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
                    <p className="font-semibold">{solution.title}</p>
                    {votes && <p className="mt-1 text-sm text-black/70">{votes}</p>}
                    {evidence && <p className="mt-1 text-sm text-black/70">{evidence}</p>}
                    {programSignal && <p className="mt-1 text-xs text-black/48">{programSignal}</p>}
                    <p className="mt-1 text-sm leading-6 text-black/62">{solution.outcome}</p>
                    <p className="mt-1 text-xs text-black/48">{solution.valueAnchor}</p>
                    {solution.products.length > 0 && (
                      <>
                        <ul className="mt-2 flex flex-wrap gap-1.5" aria-label={`Products for ${solution.title}`}>
                          {solution.products.map((product) => {
                            const Icon = productIcons[product];
                            return (
                              <li
                                key={product}
                                className="inline-flex items-center gap-1 rounded-sm border border-black/15 bg-[#fafaf8] px-2 py-0.5 text-xs text-black/65"
                              >
                                {product === "Gemini" ? <GeminiMark /> : Icon && <Icon className="size-3.5" aria-hidden />}
                                {product}
                              </li>
                            );
                          })}
                        </ul>
                        <ul className="mt-2 space-y-1">
                          {solution.products.map((product) => (
                            <li key={product} className="text-xs leading-5 text-black/55">
                              {googleProductRoles[product] ?? "Google Cloud capability used in the three-day build"}
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                    {isCustomerViewer(viewer.actor) && (
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
