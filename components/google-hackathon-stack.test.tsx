// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { initialSessionGraph } from "@/lib/seed";
import { bookHackathon, rankedSolutions, toggleSelected } from "@/lib/session";

const { useSessionMock, pushMock, openMock } = vi.hoisted(() => ({
  useSessionMock: vi.fn(),
  pushMock: vi.fn(),
  openMock: vi.fn(),
}));

vi.mock("@/components/session-provider", () => ({
  useSession: useSessionMock,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

import { GoogleHackathonStack } from "./google-hackathon-stack";

function bookedGraph() {
  const ids = rankedSolutions(initialSessionGraph).map((solution) => solution.id).slice(0, 3);
  const selected = ids.reduce((current, id) => toggleSelected(current, id), initialSessionGraph);
  return bookHackathon(selected, {
    date: "2026-09-30",
    googleFacilitator: "Priya Raghavan",
    partnerSpecialist: "Ravi Menon",
    customerOwner: "Alex Chen",
    question: "Can we prove the three?",
  });
}

describe("GoogleHackathonStack calendar CTA", () => {
  beforeEach(() => {
    pushMock.mockReset();
    openMock.mockReset();
    vi.stubGlobal("open", openMock);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("opens Calendar and marks it done without leaving for funding", () => {
    const markHackathonCalendarAdded = vi.fn();
    const markHackathonMeetAdded = vi.fn();
    const graph = bookedGraph();
    useSessionMock.mockReturnValue({ markHackathonCalendarAdded, markHackathonMeetAdded });

    render(<GoogleHackathonStack graph={graph} />);
    fireEvent.click(screen.getByRole("button", { name: /Add to Google Calendar/i }));

    expect(openMock).toHaveBeenCalledWith(
      expect.stringContaining("calendar.google.com/calendar/render"),
      "_blank",
      "noopener,noreferrer",
    );
    expect(markHackathonCalendarAdded).toHaveBeenCalledOnce();
    expect(markHackathonMeetAdded).not.toHaveBeenCalled();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("opens Meet, marks it done, and navigates to funding", () => {
    const markHackathonCalendarAdded = vi.fn();
    const markHackathonMeetAdded = vi.fn();
    const booked = bookedGraph();
    const graph = {
      ...booked,
      hackathon: { ...booked.hackathon!, calendarAdded: true },
    };
    useSessionMock.mockReturnValue({ markHackathonCalendarAdded, markHackathonMeetAdded });

    render(<GoogleHackathonStack graph={graph} />);
    fireEvent.click(screen.getByRole("button", { name: /Add Google Meet/i }));

    expect(openMock).toHaveBeenCalledWith(
      "https://meet.google.com/new",
      "_blank",
      "noopener,noreferrer",
    );
    expect(markHackathonMeetAdded).toHaveBeenCalledOnce();
    expect(pushMock).toHaveBeenCalledWith("/funding");
  });

  it("shows continue state when calendar and Meet are already added", () => {
    const markHackathonCalendarAdded = vi.fn();
    const markHackathonMeetAdded = vi.fn();
    const booked = bookedGraph();
    const graph = {
      ...booked,
      hackathon: { ...booked.hackathon!, calendarAdded: true, meetAdded: true },
    };
    useSessionMock.mockReturnValue({ markHackathonCalendarAdded, markHackathonMeetAdded });

    render(<GoogleHackathonStack graph={graph} />);
    fireEvent.click(screen.getByRole("button", { name: /Meet added · Continue to funding/i }));

    expect(markHackathonMeetAdded).not.toHaveBeenCalled();
    expect(openMock).not.toHaveBeenCalled();
    expect(pushMock).toHaveBeenCalledWith("/funding");
  });
});
