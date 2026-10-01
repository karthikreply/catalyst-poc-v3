"use client";

import { useState, type FormEvent } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Actor, ColdAttendee, ColdCompany } from "@/lib/seed";
import type { PublicProfile } from "@/lib/session";
import {
  coldRoleMatch,
  coldScopeDefaults,
  enrichAttendeeName,
  lookupAccount,
} from "@/lib/session";
import { cn } from "@/lib/utils";

const roleExamples = [
  "Operations owner",
  "Frontline supervisor",
  "Developer",
  "Compliance",
  "Infrastructure",
  "Economic buyer",
];

function withIds(attendees: ColdAttendee[]): ColdAttendee[] {
  return attendees.map((person, index) => ({
    ...person,
    id: person.id ?? `cold-attendee-${index + 1}`,
  }));
}

export function AccountLookupPanel({
  actor,
  onHit,
  onMiss,
}: {
  actor: Actor;
  onHit: () => void;
  onMiss: (query: string, customerDoor: boolean) => void;
}) {
  const [query, setQuery] = useState("");
  const [miss, setMiss] = useState<{ query: string; customerDoor: boolean; publicProfile: PublicProfile | null } | null>(null);

  function runLookup(event: FormEvent) {
    event.preventDefault();
    const result = lookupAccount(query, actor);
    if (result.hit) {
      setMiss(null);
      onHit();
      return;
    }
    setMiss({
      query: result.query || query.trim(),
      customerDoor: result.customerDoor,
      publicProfile: result.publicProfile,
    });
  }

  function addAccount() {
    if (!miss) return;
    onMiss(miss.query, miss.customerDoor);
    setMiss(null);
  }

  return (
    <section className="mt-6 rounded-sm border border-black/10 bg-white p-5">
      <h2 className="font-semibold">Look up your account</h2>
      <p className="mt-1 text-sm text-black/55">Trimmed, case-insensitive match. Heartland is on the partner record.</p>
      <form onSubmit={runLookup} className="mt-3 flex flex-wrap gap-2">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Company name"
          aria-label="Account lookup"
          className="min-w-[220px] flex-1 rounded-sm"
        />
        <Button type="submit">Look up</Button>
      </form>
      {miss && (
        <div className="mt-4 rounded-sm border border-amber-300 bg-amber-50 p-4">
          {miss.customerDoor ? (
            <p className="text-sm leading-6 text-amber-950">
              No record for {miss.query || "that name"} on the direct-customer list. Heartland is on the partner record.
            </p>
          ) : (
            <p className="text-sm leading-6 text-amber-950">
              No partner match for {miss.query || "that name"}.
            </p>
          )}
          {miss.publicProfile ? (
            <>
              <p className="mt-2 text-sm leading-6 text-amber-950">A public profile is the next place to look.</p>
              <div className="mt-3 rounded-sm border border-black/10 bg-white p-4">
                <p className="text-sm font-semibold">{miss.publicProfile.companyName}</p>
                <p className="mt-1 text-sm text-black/70">{miss.publicProfile.industry}</p>
                <p className="mt-2 text-sm leading-6">{miss.publicProfile.sentence}</p>
                <p className="mt-3 text-xs text-black/48">Public profile · illustrative · not a live LinkedIn lookup.</p>
              </div>
            </>
          ) : (
            <p className="mt-2 text-sm leading-6 text-amber-950">No public profile. Add the account.</p>
          )}
          <Button type="button" className="mt-3" onClick={addAccount}>
            {miss.publicProfile ? "Add this account" : "Add the account"}
          </Button>
        </div>
      )}
    </section>
  );
}

export function ColdAccountEditor({
  coldCompany,
  coldAttendees,
  accountHit,
  canEdit,
  setColdScope,
  coldGaps,
  graphAttendeeCount,
}: {
  coldCompany: ColdCompany;
  coldAttendees: ColdAttendee[];
  accountHit: boolean;
  canEdit: boolean;
  setColdScope: (company: ColdCompany, attendees: ColdAttendee[]) => void;
  coldGaps: { role: string; reason: string }[];
  graphAttendeeCount: number;
}) {
  const attendees = withIds(coldAttendees.length ? coldAttendees : coldScopeDefaults.attendees);
  const hasUnknownNames = attendees.some((person) =>
    person.name.trim() && enrichAttendeeName(person.name, accountHit).kind === "unknown",
  );

  function updateAttendees(next: ColdAttendee[]) {
    setColdScope(coldCompany, withIds(next));
  }

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-[.8fr_1.2fr]">
      <p className="rounded-sm border border-black/15 bg-[#f4f4f1] px-4 py-3 text-sm leading-6 text-black/75 lg:col-span-2">
        Demonstration data. Company and room are already filled — continue without typing.
      </p>
      <section className="rounded-sm border border-black/10 bg-white p-6">
        <h2 className="text-lg font-semibold">Company</h2>
        {([
          ["name", "Company name", "Northwind Insurance"],
          ["industry", "Industry", "Insurance"],
          ["sizeBand", "Size band", "$500M–$1B"],
        ] as const).map(([field, label, placeholder]) => (
          <label key={field} className="mt-4 block text-sm font-medium">
            {label}
            <Input
              value={coldCompany[field]}
              readOnly={!canEdit}
              onChange={(event) => setColdScope({ ...coldCompany, [field]: event.target.value }, attendees)}
              placeholder={placeholder}
              className="mt-2 rounded-sm"
            />
          </label>
        ))}
        <p className="mt-4 text-xs leading-5 text-black/48">
          Filled for the demonstration. Industry drives pattern matching. Size stays coarse; exact revenue is not required.
        </p>
      </section>

      <section className="rounded-sm border border-black/10 bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Who is likely to be in the room?</h2>
            <p className="mt-1 text-sm text-black/48">
              Three demonstration attendees, already named. The pattern supplies why each role matters.
            </p>
            <p className="mt-3 max-w-xl text-xs leading-5 text-black/55">
              Recognised role examples: {roleExamples.join(", ")}. Job titles are fine; we match them to these responsibilities.
            </p>
          </div>
          {attendees.length < 6 && canEdit && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => updateAttendees([...attendees, { id: `cold-attendee-${attendees.length + 1}`, name: "", role: "" }])}
            >
              <Plus /> Add person
            </Button>
          )}
        </div>

        <div className="mt-5 space-y-3">
          {attendees.map((person, index) => {
            const matchedRole = coldRoleMatch(person.role);
            const enrichment = person.name.trim()
              ? enrichAttendeeName(person.name, accountHit)
              : null;
            return (
              <div key={person.id ?? index} className="grid items-start gap-3 sm:grid-cols-2">
                <div>
                  <Input
                    aria-label={`Attendee ${index + 1} name`}
                    value={person.name}
                    readOnly={!canEdit}
                    placeholder="Name"
                    onChange={(event) => updateAttendees(
                      attendees.map((row, rowIndex) => rowIndex === index
                        ? { ...row, id: row.id ?? `cold-attendee-${index + 1}`, name: event.target.value }
                        : row),
                    )}
                  />
                  {enrichment?.kind === "known" && (
                    <div className="mt-2 rounded-sm border border-black/10 bg-[#fafaf8] p-3 text-xs text-black/70" role="status">
                      <p className="font-medium text-black/85">{enrichment.role}</p>
                      <p className="mt-1">{enrichment.prompt}</p>
                      {canEdit && (
                        <div className="mt-2 flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => updateAttendees(
                              attendees.map((row, rowIndex) => rowIndex === index
                                ? { ...row, role: enrichment.role }
                                : row),
                            )}
                          >
                            Yes
                          </Button>
                          <Button type="button" size="sm" variant="outline">
                            No
                          </Button>
                        </div>
                      )}
                      <p className="mt-2 text-[11px] text-black/45">Source stays CRM.</p>
                    </div>
                  )}
                </div>
                <div>
                  <Input
                    aria-label={`Attendee ${index + 1} role`}
                    aria-describedby={person.role.trim() ? `attendee-${index + 1}-role-status` : undefined}
                    value={person.role}
                    readOnly={!canEdit}
                    placeholder={roleExamples[index] ?? "Role"}
                    onChange={(event) => updateAttendees(
                      attendees.map((row, rowIndex) => rowIndex === index ? { ...row, role: event.target.value } : row),
                    )}
                  />
                  {person.role.trim() && (
                    <p
                      id={`attendee-${index + 1}-role-status`}
                      role="status"
                      aria-live="polite"
                      className={cn("mt-1 text-xs", matchedRole ? "text-emerald-700" : "text-amber-800")}
                    >
                      {matchedRole ? `Matched as ${matchedRole}` : "Not matched to a required pattern role"}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {hasUnknownNames && (
          <p className="mt-4 text-sm leading-6 text-black/60" role="status">
            Demonstration names. Not on the account record.
          </p>
        )}

        {graphAttendeeCount >= 3 && coldGaps.length > 0 && (
          <div className="mt-5 rounded-sm border border-amber-300 bg-amber-50 p-4">
            <p className="text-sm font-semibold">Roles missing for this pattern</p>
            <ul className="mt-2 space-y-2 text-sm">
              {coldGaps.map((gap) => (
                <li key={gap.role}>
                  <strong>{gap.role}</strong> — {gap.reason}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}
