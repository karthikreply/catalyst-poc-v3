"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, BadgeDollarSign, ChartNoAxesCombined, CircleHelp, Presentation, Shapes } from "lucide-react";

import { useSession } from "@/components/session-provider";
import type { Actor } from "@/lib/seed";
import { customerSponsor, handoffLabel } from "@/lib/session";

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
    tool: "Opens from a campaign or trial. Look up your account, or add it.",
  },
];

export default function Home() {
  const { graph, viewer, setActor, hydrated } = useSession();
  const router = useRouter();
  const customerViewer = viewer.actor === "cpm";
  // Commercially the handoff window is 48 hours after the room. That is a definition, not a filter:
  // the strip shows whatever was recorded, whenever it was recorded.
  const handoff = graph.session.handoff;
  const sponsor = handoff?.sponsor || graph.outcome.owner || customerSponsor(graph)?.name || "Not named";
  const handoffAt = handoff ? new Date(handoff.at).toLocaleString() : "—";

  useEffect(() => {
    if (hydrated && customerViewer) router.replace("/customer");
  }, [hydrated, customerViewer, router]);

  // The program dashboard is for the partner and the PDM. Nothing from it mounts for the customer.
  if (!hydrated || customerViewer) return null;

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

      <section className="md-card-outlined mt-6 p-5" aria-labelledby="handoff-strip-title">
        <h2 id="handoff-strip-title" className="md-label-medium text-[var(--md-sys-color-on-surface-variant)]">Handoff · {graph.session.customerName}</h2>
        <dl className="mt-3 grid gap-4 sm:grid-cols-3">
          <div>
            <dt className="md-label-medium text-[var(--md-sys-color-on-surface-variant)]">Sponsor</dt>
            <dd className="md-title-medium mt-1">{sponsor}</dd>
          </div>
          <div>
            <dt className="md-label-medium text-[var(--md-sys-color-on-surface-variant)]">Handoff</dt>
            <dd className="md-title-medium mt-1">{handoffLabel(handoff)}</dd>
          </div>
          <div>
            <dt className="md-label-medium text-[var(--md-sys-color-on-surface-variant)]">Time</dt>
            <dd className="md-title-medium mt-1">{handoffAt}</dd>
          </div>
        </dl>
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
