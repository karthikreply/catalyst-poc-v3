import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

export function CustomerAccountPending({ message }: { message: string }) {
  return (
    <div className="mx-auto max-w-2xl px-5 py-16 lg:px-8">
      <p className="text-lg font-semibold leading-7">{message}</p>
      <Link href="/scope" className={buttonVariants({ className: "mt-5 bg-[var(--brand-accent)] hover:bg-[var(--brand-accent-dark)]" })}>Scope</Link>
    </div>
  );
}
