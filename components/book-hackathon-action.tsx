"use client";

import { useId } from "react";
import Link from "next/link";

import { Button, buttonVariants } from "@/components/ui/button";
import { useSession } from "@/components/session-provider";
import { bookBlockReason } from "@/lib/session";
import { cn } from "@/lib/utils";

function actionClass(primary: boolean) {
  return primary
    ? buttonVariants({ className: "bg-[var(--brand-accent)] hover:bg-[var(--brand-accent-dark)]" })
    : cn(buttonVariants({ variant: "outline" }), "border-black/30 bg-[#f4f4f1] hover:bg-black/[.06]");
}

export function BookHackathonAction({ primary = false }: { primary?: boolean }) {
  const { graph, viewer } = useSession();
  const reasonId = useId();
  if (graph.hackathon?.booked) return null;
  const reason = bookBlockReason(viewer.actor, graph);
  if (!reason) {
    return <Link href="/artifact" className={actionClass(primary)}>Book the hackathon</Link>;
  }
  return (
    <span className="inline-flex flex-col items-start gap-1">
      <Button type="button" disabled className="opacity-50" aria-describedby={reasonId}>
        Book the hackathon
      </Button>
      <span id={reasonId} className="text-sm text-black/60">{reason}</span>
    </span>
  );
}
