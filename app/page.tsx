"use client";

import Link from "next/link";
import { ArrowRight, BadgeDollarSign, ChartNoAxesCombined, CircleHelp, Presentation, Shapes } from "lucide-react";

import { useSession } from "@/components/session-provider";
import type { Actor } from "@/lib/seed";

const entryDoors: { actor: Actor; title: string; tool: string; note?: string }[] = [
  {
    actor: "pdm",
    title: "Google PDM",
    tool: "Opens from the sales-propensity tool that already ranks which accounts to work.",
  },
  {
    actor: "partner",
    title: "Partner",
    tool: "Opens from the partner incentive programme where funded sessions are claimed.",
  },
  {
    actor: "cpm",
    title: "Customer",
    tool: "Opens from a trial or campaign journey.",
    note: "Direct apply is uncommon in this motion.",
  },
];

export default function Home() {
  const { viewer, setActor } = useSession();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-12">
      <p className="md-label-large text-[var(--md-sys-color-primary)]">Program dashboard</p>
      <h1 className="md-display-small mt-2">Hello, {viewer.name.split(" ")[0]}</h1>
      <p className="md-body-large mt-3 max-w-2xl text-[var(--md-sys-color-on-surface-variant)]">
        Launch and govern partner-led value sessions from one neutral program surface. The session chooses and books a hackathon — it is not the deliverable.
      </p>

      <section className="md-card-elevated mt-8 p-6 md:p-8">
        <div className="flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-[var(--md-sys-shape-large)] bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)]"><Presentation /></span>
          <div>
            <p className="md-label-medium text-[var(--md-sys-color-primary)]">VALUE SESSIONS</p>
            <h2 className="md-headline-medium">Three doors into the same session</h2>
          </div>
        </div>
        <p className="md-body-large mt-4 max-w-3xl text-[var(--md-sys-color-on-surface-variant)]">
          Each party enters from a tool they already use. This demo narrates those doors; it does not embed the real systems. All three open one shared session that still defaults to partner-facilitated.
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {entryDoors.map((door) => (
            <button
              key={door.actor}
              type="button"
              onClick={() => setActor(door.actor)}
              className={`md-card-outlined p-5 text-left transition-colors hover:bg-[color-mix(in_srgb,var(--md-sys-color-primary)_5%,var(--md-sys-color-surface))] ${viewer.actor === door.actor ? "ring-2 ring-[var(--md-sys-color-primary)]" : ""}`}
            >
              <p className="md-title-medium">{door.title}</p>
              <p className="md-body-medium mt-2 text-[var(--md-sys-color-on-surface-variant)]">{door.tool}</p>
              {door.note && <p className="md-label-medium mt-3 text-[var(--md-sys-color-primary)]">{door.note}</p>}
            </button>
          ))}
        </div>
        <div className="mt-6">
          <Link href="/scope" className="md-button-filled">Open value sessions <ArrowRight className="size-4" /></Link>
        </div>
      </section>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardCard icon={BadgeDollarSign} title="Funding" body="Review the substantiation pack behind a hackathon booking." href="/funding" />
        <DashboardCard icon={ChartNoAxesCombined} title="Telemetry" body="Study conversion from session to hackathon booked." href="/telemetry" />
        <DashboardCard icon={Shapes} title="Programs" body="Program catalogue and campaign configuration." />
        <DashboardCard icon={CircleHelp} title="Support" body="Enablement guidance and operating support." />
      </div>

      <p className="md-body-medium mt-8 text-[var(--md-sys-color-on-surface-variant)]">Mock partner portal · illustrative. No provisioning, submission or customer-system connection occurs in this demo.</p>
    </div>
  );
}

function DashboardCard({
  icon: Icon,
  title,
  body,
  href,
}: {
  icon: typeof BadgeDollarSign;
  title: string;
  body: string;
  href?: string;
}) {
  const content = (
    <>
      <Icon className="size-6 text-[var(--md-sys-color-primary)]" />
      <h2 className="md-title-large mt-4">{title}</h2>
      <p className="md-body-medium mt-2 text-[var(--md-sys-color-on-surface-variant)]">{body}</p>
      <span className="md-label-medium mt-5 inline-flex text-[var(--md-sys-color-primary)]">{href ? "Open" : "Illustrative · unavailable"}</span>
    </>
  );
  return href
    ? <Link href={href} className="md-card-outlined block min-h-52 p-5 transition-colors hover:bg-[color-mix(in_srgb,var(--md-sys-color-primary)_5%,var(--md-sys-color-surface))]">{content}</Link>
    : <div aria-disabled="true" className="md-card-outlined min-h-52 p-5 opacity-60">{content}</div>;
}
