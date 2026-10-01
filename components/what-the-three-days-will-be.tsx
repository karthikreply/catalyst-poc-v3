import type { ReactNode } from "react";

import type { SessionGraph } from "@/lib/seed";
import { catalogSolutionById } from "@/lib/session";
import { cn } from "@/lib/utils";

export const threeDayShape = [
  { day: "Day 1", text: "Start from the pain." },
  { day: "Day 2", text: "Try it on your own documents." },
  { day: "Day 3", text: "Write down what held." },
] as const;

export function SolutionProductList({ title, products }: { title: string; products: string[] }) {
  if (!products.length) return null;
  return (
    <ul className="mt-2 flex flex-wrap gap-1.5" aria-label={`Products for ${title}`}>
      {products.map((product) => (
        <li
          key={product}
          className="rounded-sm border border-black/15 bg-[#fafaf8] px-2 py-0.5 text-xs text-black/65"
        >
          {product}
        </li>
      ))}
    </ul>
  );
}

export function ThreeDayShapeList({
  labelledBy,
  className,
  afterDay,
}: {
  labelledBy: string;
  className?: string;
  afterDay?: Partial<Record<(typeof threeDayShape)[number]["day"], ReactNode>>;
}) {
  return (
    <ol className={cn("mt-3 space-y-2", className)} aria-labelledby={labelledBy}>
      {threeDayShape.map((item) => (
        <li key={item.day} className="text-sm leading-6 text-black">
          <span className="font-semibold">{item.day}.</span> {item.text}
          {afterDay?.[item.day]}
        </li>
      ))}
    </ol>
  );
}

/** Titles, the products already on each solution, and the three day lines. No date, showcase, or pilot choice. */
export function WhatTheThreeDaysWillBe({
  solutions,
  className,
  tone = "rank",
}: {
  solutions: { id: string; title: string; products: string[] }[];
  className?: string;
  tone?: "rank" | "customer";
}) {
  const heading = tone === "customer" ? "md-title-large" : "text-lg font-semibold text-black";
  const title = tone === "customer" ? "md-title-medium" : "font-semibold text-black";
  return (
    <section className={className} aria-labelledby="what-the-three-days-will-be">
      <h2 id="what-the-three-days-will-be" className={heading}>
        What the three days will be.
      </h2>
      <ul className="mt-4 divide-y divide-black/10 border-y border-black/10">
        {solutions.map((solution) => (
          <li key={solution.id} className="py-3">
            <p className={title}>{solution.title}</p>
            <SolutionProductList title={solution.title} products={solution.products} />
          </li>
        ))}
      </ul>
      <ThreeDayShapeList labelledBy="what-the-three-days-will-be" />
    </section>
  );
}

export function CustomerBookedThreeDays({ graph }: { graph: SessionGraph }) {
  if (!graph.hackathon?.booked) return null;
  const solutions = graph.hackathon.solutionIds.flatMap((id) => {
    const solution = catalogSolutionById(id, graph);
    return solution ? [{ id: solution.id, title: solution.title, products: solution.products }] : [];
  });
  if (!solutions.length) return null;
  return (
    <WhatTheThreeDaysWillBe
      solutions={solutions}
      tone="customer"
      className="md-card-outlined mt-6 p-6"
    />
  );
}
