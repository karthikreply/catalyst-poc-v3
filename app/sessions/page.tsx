"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useSession } from "@/components/session-provider";
import { sessionsForProfile } from "@/lib/planned-sessions";

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatSessionDate(iso: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return iso;
  const month = months[Number(match[2]) - 1];
  if (!month) return iso;
  return `${Number(match[3])} ${month} ${match[1]}`;
}

function plannedCount(count: number) {
  return count === 1 ? "1 session planned" : `${count} sessions planned`;
}

export default function SessionsPage() {
  const { graph, viewer, hydrated } = useSession();
  const router = useRouter();
  const customerViewer = viewer.actor === "cpm";

  useEffect(() => {
    if (hydrated && customerViewer) router.replace("/customer");
  }, [hydrated, customerViewer, router]);

  if (!hydrated || customerViewer) return null;

  const sessions = sessionsForProfile(viewer.actor, graph);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-12">
      <p className="md-label-large text-[var(--md-sys-color-primary)]">
        {viewer.actor === "pdm" ? `Partners ${viewer.name} covers` : `Sessions ${viewer.name} runs`}
      </p>
      <h1 className="md-display-small mt-2">My sessions</h1>
      <p className="md-headline-medium mt-3">{plannedCount(sessions.length)}</p>
      <p className="md-body-medium mt-2 max-w-2xl text-[var(--md-sys-color-on-surface-variant)]">
        {viewer.actor === "pdm"
          ? "Sessions across the partners covered here, including the live session."
          : "The live session, plus other accounts for this partner."}
      </p>
      <p className="md-label-medium mt-3 text-[var(--md-sys-color-on-surface-variant)]">Illustrative. Not live Salesforce data.</p>

      <ul className="mt-6 space-y-3">
        {sessions.map((session) => (
          <li key={`${session.account}-${session.partner}-${session.illustrative ? "illustrative" : "live"}`} className="md-card-outlined p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              {session.href ? (
                <Link href={session.href} className="md-title-medium text-[var(--md-sys-color-primary)] underline-offset-4 hover:underline">
                  {session.account}
                </Link>
              ) : (
                <p className="md-title-medium">{session.account}</p>
              )}
              {session.illustrative && (
                <span className="md-label-medium text-[var(--md-sys-color-on-surface-variant)]">Illustrative</span>
              )}
            </div>
            <dl className="mt-4 grid gap-3 sm:grid-cols-3">
              <div>
                <dt className="md-label-medium text-[var(--md-sys-color-on-surface-variant)]">Partner</dt>
                <dd className="md-body-medium mt-1">{session.partner}</dd>
              </div>
              <div>
                <dt className="md-label-medium text-[var(--md-sys-color-on-surface-variant)]">Stage</dt>
                <dd className="md-body-medium mt-1">{session.stage}</dd>
              </div>
              <div>
                <dt className="md-label-medium text-[var(--md-sys-color-on-surface-variant)]">Date</dt>
                <dd className="md-body-medium mt-1">{session.date ? formatSessionDate(session.date) : "Not set"}</dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>
    </div>
  );
}
