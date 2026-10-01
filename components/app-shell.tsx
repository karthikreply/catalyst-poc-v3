"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BadgeDollarSign,
  Boxes,
  CalendarDays,
  ChartNoAxesCombined,
  ChevronDown,
  CircleHelp,
  LayoutDashboard,
  Presentation,
} from "lucide-react";

import { type Actor } from "@/lib/seed";
import { breadcrumbForPath, isBrandFlowPath, navItemsForActor, type VendorNavItem } from "@/lib/vendor-shell";
import { BrandFlowFrame } from "./brand-flow-frame";
import { useSession } from "./session-provider";

const navIcons: Record<VendorNavItem["label"], typeof LayoutDashboard> = {
  Dashboard: LayoutDashboard,
  "My sessions": CalendarDays,
  Programs: Boxes,
  "Value sessions": Presentation,
  Funding: BadgeDollarSign,
  Telemetry: ChartNoAxesCombined,
  Support: CircleHelp,
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { viewer, setActor } = useSession();
  const breadcrumbs = breadcrumbForPath(pathname, viewer.actor);
  const brandFlow = isBrandFlowPath(pathname, viewer.actor);
  const navItems = navItemsForActor(viewer.actor);

  function onViewerChange(next: Actor) {
    setActor(next);
    // This dropdown is the only control that navigates when the viewer changes.
    router.push(next === "cpm" ? "/customer" : "/sessions");
  }

  return (
    <div className="md-shell">
      <header className="md-top-app-bar sticky top-0 z-50 flex h-16 items-center gap-4 px-4 md:px-6">
        <Link href="/" className="flex items-center gap-3 rounded-[var(--md-sys-shape-small)]">
          <span className="md-label-large grid size-10 place-items-center rounded-[var(--md-sys-shape-large)] bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)]">PN</span>
          <span>
            <span className="md-title-medium block">Partner network</span>
            <span className="md-label-medium block text-[var(--md-sys-color-on-surface-variant)]">Mock partner portal · illustrative</span>
          </span>
        </Link>

        <div className="relative ml-auto min-w-52">
          <label className="sr-only" htmlFor="viewer-switch">Viewing as</label>
          <select
            id="viewer-switch"
            value={viewer.actor}
            onChange={(event) => onViewerChange(event.target.value as Actor)}
            className="md-label-large h-10 w-full appearance-none rounded-[var(--md-sys-shape-small)] border border-[var(--md-sys-color-outline)] bg-[var(--md-sys-color-surface)] pl-3 pr-9 text-[var(--md-sys-color-on-surface)]"
          >
            <option value="pdm">Priya Raghavan · PDM</option>
            <option value="partner">Ravi Menon · partner</option>
            <option value="cpm">Marcus Hale · customer</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-3 size-4 text-[var(--md-sys-color-on-surface-variant)]" />
        </div>
      </header>

      <div className="grid min-h-[calc(100vh-64px)] md:grid-cols-[184px_1fr]">
        <aside className="md-nav-rail hidden p-3 md:block">
          <nav aria-label="Partner network">
            <ul className="space-y-1">
              {navItems.map((item) => {
                const Icon = navIcons[item.label];
                const active = item.href === "/" ? pathname === "/" : item.href ? pathname.startsWith(item.href) : false;
                return (
                  <li key={item.label}>
                    {item.href ? (
                      <Link
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        className={`md-label-large flex min-h-14 items-center gap-3 rounded-[var(--md-sys-shape-large)] px-3 ${active ? "bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)]" : "text-[var(--md-sys-color-on-surface-variant)] hover:bg-[color-mix(in_srgb,var(--md-sys-color-primary)_8%,transparent)]"}`}
                      >
                        <Icon className="size-5" /> {item.label}
                      </Link>
                    ) : (
                      <div aria-disabled="true" className="md-label-large flex min-h-14 items-center gap-3 rounded-[var(--md-sys-shape-large)] px-3 text-[var(--md-sys-color-on-surface-variant)] opacity-55">
                        <Icon className="size-5" />
                        <span>{item.label}<span className="md-label-medium block">Illustrative</span></span>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </nav>
        </aside>

        <div className="min-w-0">
          <nav aria-label="Breadcrumb" className="flex h-12 items-center gap-2 border-b border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface)] px-4 md:px-6">
            {breadcrumbs.map((crumb, index) => (
              <span key={crumb} className="md-label-medium text-[var(--md-sys-color-on-surface-variant)]">
                {index > 0 && <span className="mr-2">/</span>}{crumb}
              </span>
            ))}
          </nav>
          {brandFlow ? <BrandFlowFrame>{children}</BrandFlowFrame> : <main>{children}</main>}
        </div>
      </div>
    </div>
  );
}
