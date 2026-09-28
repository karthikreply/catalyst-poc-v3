import type { Actor } from "./seed";

export const vendorNavItems = [
  { label: "Dashboard", href: "/", illustrative: false },
  { label: "Programs", href: null, illustrative: true },
  { label: "Value sessions", href: "/scope", illustrative: false },
  { label: "Funding", href: "/funding", illustrative: false },
  { label: "Telemetry", href: "/telemetry", illustrative: false },
  { label: "Support", href: null, illustrative: true },
] as const;

const flowLabels: Record<string, string> = {
  "/scope": "Scope",
  "/plan": "Plan",
  "/run": "Run",
  "/rank": "Rank",
  "/artifact": "Artifact",
  "/pilot-spec": "Pilot spec",
};

export function isBrandFlowPath(pathname: string, actor: Actor) {
  if (pathname.startsWith("/funding")) return actor === "partner";
  return Object.keys(flowLabels).some((path) => pathname.startsWith(path));
}

export function mergesSessionHeader(pathname: string) {
  return pathname.startsWith("/run");
}

export function breadcrumbForPath(pathname: string) {
  if (pathname === "/") return ["Partner network", "Dashboard"];
  if (pathname.startsWith("/funding")) return ["Partner network", "Funding"];
  if (pathname.startsWith("/telemetry")) return ["Partner network", "Telemetry"];
  const flowPath = Object.keys(flowLabels).find((path) => pathname.startsWith(path));
  return flowPath
    ? ["Partner network", "Value sessions", flowLabels[flowPath]]
    : ["Partner network"];
}
