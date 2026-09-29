"use client";

import { useRouter } from "next/navigation";
import { CalendarDays, Check, ExternalLink, Video } from "lucide-react";

import { useSession } from "@/components/session-provider";
import { buttonVariants } from "@/components/ui/button";
import type { SessionGraph } from "@/lib/seed";
import { googleCalendarComposeUrl, googleMeetUrl, hackathonGoogleStack } from "@/lib/session";
import { cn } from "@/lib/utils";

export function GoogleHackathonStack({
  graph,
  className,
}: {
  graph: SessionGraph;
  className?: string;
}) {
  const router = useRouter();
  const { markHackathonCalendarAdded, markHackathonMeetAdded } = useSession();
  const stack = hackathonGoogleStack(graph);
  const calendarUrl = googleCalendarComposeUrl(graph);
  const meetUrl = googleMeetUrl(graph);
  const calendarAdded = Boolean(graph.hackathon?.calendarAdded);
  const meetAdded = Boolean(graph.hackathon?.meetAdded);
  if (!stack.length) return null;

  function handleAddToCalendar() {
    if (calendarUrl) {
      window.open(calendarUrl, "_blank", "noopener,noreferrer");
    }
    markHackathonCalendarAdded();
  }

  function handleAddMeet() {
    if (meetUrl) {
      window.open(meetUrl, "_blank", "noopener,noreferrer");
    }
    markHackathonMeetAdded();
    router.push("/funding");
  }

  const ctaClass = "mt-5 inline-flex gap-2 bg-[var(--brand-accent)] hover:bg-[var(--brand-accent-dark)]";

  return (
    <section
      className={cn("rounded-sm border border-black/20 bg-white p-5 md:p-6", className)}
      aria-labelledby="google-hackathon-stack-title"
    >
      <h2 id="google-hackathon-stack-title" className="text-lg font-semibold text-black">
        Google stack for these three days
      </h2>
      <p className="mt-1 text-sm leading-6 text-black/75">
        These three days run on Google Cloud and Workspace.
      </p>
      <ul className="mt-4 divide-y divide-black/10 border-y border-black/10">
        {stack.map((item) => (
          <li key={item.product} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-baseline sm:gap-3">
            <span className="shrink-0 rounded-sm border border-black/25 bg-[#f4f4f1] px-2.5 py-1 text-sm font-semibold text-black">
              {item.product}
            </span>
            <span className="text-sm leading-6 text-black/80">{item.role}</span>
          </li>
        ))}
      </ul>
      {calendarUrl && !calendarAdded && (
        <button
          type="button"
          onClick={handleAddToCalendar}
          className={cn(buttonVariants({ className: ctaClass }))}
        >
          <CalendarDays className="size-4 shrink-0" aria-hidden />
          Add to Google Calendar
          <ExternalLink className="size-4 shrink-0 opacity-90" aria-hidden />
        </button>
      )}
      {meetUrl && calendarAdded && !meetAdded && (
        <button
          type="button"
          onClick={handleAddMeet}
          className={cn(buttonVariants({ className: ctaClass }))}
        >
          <Video className="size-4 shrink-0" aria-hidden />
          Add Google Meet
          <ExternalLink className="size-4 shrink-0 opacity-90" aria-hidden />
        </button>
      )}
      {calendarAdded && meetAdded && (
        <button
          type="button"
          onClick={() => router.push("/funding")}
          className={cn(buttonVariants({ className: ctaClass }))}
        >
          <Check className="size-4 shrink-0" aria-hidden />
          Meet added · Continue to funding
        </button>
      )}
      <p className="mt-2 text-xs leading-5 text-black/60">
        {!calendarAdded
          ? "Opens Google Calendar in a new tab with the three days and room details prefilled, then asks for the Google Meet room. No sign-in inside this demo."
          : !meetAdded
            ? "Opens a Google Meet room in a new tab for these three days, then continues to funding. No sign-in inside this demo."
            : "Calendar and Meet are treated as done in this demo. Continue to the funding request."}
      </p>
    </section>
  );
}
