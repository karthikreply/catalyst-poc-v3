// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AccountLookupPanel } from "./account-lookup-panel";

const sentence = "A services company. This sentence is public. It is not the business case.";

function lookup(actor: "partner" | "customer" | "pdm", name: string) {
  const onHit = vi.fn();
  const onMiss = vi.fn();
  render(<AccountLookupPanel actor={actor} onHit={onHit} onMiss={onMiss} />);
  fireEvent.change(screen.getByLabelText("Account lookup"), { target: { value: name } });
  fireEvent.click(screen.getByRole("button", { name: "Look up" }));
  return { onHit, onMiss };
}

describe("account lookup panel", () => {
  afterEach(() => cleanup());

  it("hits Heartland for the partner and shows no public profile", () => {
    const { onHit, onMiss } = lookup("partner", "Heartland");
    expect(onHit).toHaveBeenCalledOnce();
    expect(onMiss).not.toHaveBeenCalled();
    expect(screen.queryByText(/public profile/i)).toBeNull();
    expect(screen.queryByText(sentence)).toBeNull();
  });

  it("misses Heartland for the customer with no public profile", () => {
    const { onHit } = lookup("customer", "Heartland");
    expect(onHit).not.toHaveBeenCalled();
    expect(screen.getByText(/direct-customer list/)).toBeTruthy();
    expect(screen.getByText("No public profile. Add the account.")).toBeTruthy();
    expect(screen.queryByText(sentence)).toBeNull();
  });

  it("shows the Reply public card for the customer and the partner, then adds through the miss path", () => {
    for (const actor of ["customer", "partner"] as const) {
      cleanup();
      const { onMiss } = lookup(actor, " reply ");
      expect(screen.getByText(sentence)).toBeTruthy();
      expect(screen.getByText("Public profile · illustrative · not a live LinkedIn lookup.")).toBeTruthy();
      expect(screen.getByText("A public profile is the next place to look.")).toBeTruthy();
      expect(screen.getByText("Technology")).toBeTruthy();
      expect(screen.queryByText("Dana Reyes")).toBeNull();
      expect(screen.queryByText(/\$/)).toBeNull();
      fireEvent.click(screen.getByRole("button", { name: "Add this account" }));
      expect(onMiss).toHaveBeenCalledWith("reply", actor === "customer");
    }
  });

  it("offers add the account when the miss has no public profile", () => {
    const { onMiss } = lookup("partner", "Northwind");
    expect(screen.getByText(/No partner match for Northwind/)).toBeTruthy();
    expect(screen.getByText("No public profile. Add the account.")).toBeTruthy();
    expect(screen.queryByText(sentence)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Add the account" }));
    expect(onMiss).toHaveBeenCalledWith("Northwind", false);
  });
});
