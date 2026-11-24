import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseEvent, type GameEvent } from "../types/events";
import { deriveState } from "./reducer";
import { nextStep } from "./pacing";

// A 6-player mock game lasting several days, with nightly notebooks.
const parsed = readFileSync(new URL("../fixtures/sample-6p-notebook.jsonl", import.meta.url), "utf8")
  .trim()
  .split("\n")
  .map((l) => parseEvent(JSON.parse(l)));
const events = parsed.flatMap((r) => (r.ok ? [r.event] : [])) as GameEvent[];
const notebooks = events.filter((e) => e.type === "notebook_updated") as (GameEvent & { actor_id: string; day: number })[];

describe("nightly notebook", () => {
  it("parses every event, including notebooks", () => {
    expect(parsed.filter((r) => !r.ok)).toEqual([]);
    expect(notebooks.length).toBeGreaterThan(0);
  });

  it("shows the latest notebook on the player's card in spectator view only", () => {
    const last = notebooks.at(-1)!;
    const s = deriveState(events, events.length, true);
    expect(s.views[last.actor_id].notes?.day).toBe(last.day);
    expect(s.transcript.some((t) => t.kind === "notebook")).toBe(true);
    const pub = deriveState(events, events.length, false);
    expect(Object.values(pub.views).every((v) => v.notes === undefined)).toBe(true);
    expect(pub.transcript.some((t) => t.kind === "notebook")).toBe(false);
  });

  it("marks trust that changed since the previous night", () => {
    const s = deriveState(events, events.length, true);
    const nights = new Set(notebooks.map((n) => n.day));
    if (nights.size < 2) return; // needs at least two nights
    const anyWas = Object.values(s.views).some((v) => v.notes?.trust.some((t) => t.was !== undefined));
    expect(anyWas).toBe(true);
  });

  it("gives each notebook its own paced step", () => {
    let c = 0;
    let notebookSteps = 0;
    while (c < events.length) {
      const step = nextStep(events, c, true);
      if (events[step.cursor - 1].type === "notebook_updated") notebookSteps++;
      c = step.cursor;
    }
    expect(notebookSteps).toBe(notebooks.length);
  });
});

describe("structured claims", () => {
  const checks = events.filter((e) => e.type === "claim_checked") as (GameEvent & {
    actor_id: string;
    literal_truth: boolean;
  })[];

  it("shows false claims, checked against the true game state, in spectator view only", () => {
    const falseClaims = checks.filter((c) => !c.literal_truth);
    expect(falseClaims.length).toBeGreaterThan(0);
    const s = deriveState(events, events.length, true);
    const liar = falseClaims[0].actor_id;
    expect(s.views[liar].claims.some((c) => !c.true)).toBe(true);
    expect(s.transcript.some((t) => t.title.startsWith("⚠"))).toBe(true);
    const pub = deriveState(events, events.length, false);
    expect(Object.values(pub.views).every((v) => v.claims.length === 0)).toBe(true);
  });

  it("does not flag the real Detective's true claims", () => {
    const s = deriveState(events, events.length, true);
    for (const c of checks.filter((c) => c.literal_truth)) {
      expect(s.views[c.actor_id].claims.every((x) => x.true || x.index !== events.indexOf(c))).toBe(true);
    }
  });
});

describe("beliefs_updated marker", () => {
  it("turns the banner on after a round's probes and off once someone speaks again", () => {
    const marker = events.findIndex((e) => e.type === "beliefs_updated");
    expect(marker).toBeGreaterThan(0);
    expect(deriveState(events, marker + 1, true).beliefsJustUpdated).toBe(true);
    const nextMessage = events.findIndex((e, i) => i > marker && e.type === "public_message");
    expect(deriveState(events, nextMessage + 1, true).beliefsJustUpdated).toBe(false);
  });
});
