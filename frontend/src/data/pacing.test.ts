import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseEvent, type GameEvent } from "../types/events";
import { HOLD_MS, nextStep, scaled } from "./pacing";
import { deriveState } from "./reducer";

const events = readFileSync(new URL("../fixtures/sample-6p.jsonl", import.meta.url), "utf8")
  .trim()
  .split("\n")
  .map((l) => parseEvent(JSON.parse(l)))
  .flatMap((r) => (r.ok ? [r.event] : [])) as GameEvent[];

function steps(spectator: boolean) {
  const out: { from: number; to: number; hold: number }[] = [];
  let c = 0;
  while (c < events.length) {
    const s = nextStep(events, c, spectator);
    out.push({ from: c, to: s.cursor, hold: s.hold });
    c = s.cursor;
  }
  return out;
}

describe("presentation pacing", () => {
  it("always moves forward and reaches the end", () => {
    const all = steps(true);
    expect(all.every((s) => s.to > s.from)).toBe(true);
    expect(all.at(-1)!.to).toBe(events.length);
  });

  it("shows messages one at a time", () => {
    for (const s of steps(true)) {
      const shown = events.slice(s.from, s.to).filter((e) => e.type === "public_message");
      expect(shown.length).toBeLessThanOrEqual(1);
    }
  });

  it("plays each batch of belief probes as a single step, after the round's messages", () => {
    const probeSteps = steps(true).filter((s) => events[s.from].type === "belief_probe");
    expect(probeSteps.length).toBeGreaterThan(0);
    for (const s of probeSteps) {
      const batch = events.slice(s.from, s.to);
      // All observers' probes plus the backend's "beliefs_updated" marker, as one step.
      expect(batch.every((e) => e.type === "belief_probe" || e.type === "beliefs_updated")).toBe(true);
      expect(batch.filter((e) => e.type === "belief_probe").length).toBeGreaterThan(1);
      expect(batch.at(-1)!.type).toBe("beliefs_updated");
      expect(s.hold).toBe(HOLD_MS.belief_probe);
    }
    // One probe step per discussion round that had messages.
    expect(probeSteps.length).toBe(deriveState(events, events.length, true).probeSteps.length);
  });

  it("skips private events in player view", () => {
    for (const s of steps(false)) {
      expect(events[s.to - 1].visibility).toBe("public");
    }
  });

  it("scales hold time by speed", () => {
    expect(scaled(2000, 2)).toBe(1000);
    expect(scaled(2000, 0.5)).toBe(4000);
    expect(scaled(2000, "instant")).toBe(0);
  });
});

describe("reasoning summaries", () => {
  it("appear on the player card in spectator view only", () => {
    const base = events.find((e) => e.type === "strategy_summary")!;
    const reasoning = parseEvent({ ...base, event_id: "evt_x", type: "reasoning_summary", text: "Weighing who to blame.", source: "provider_summary", summary: undefined });
    expect(reasoning.ok).toBe(true);
    if (!reasoning.ok) return;
    const withReasoning = [...events, reasoning.event];
    const actor = (base as unknown as { actor_id: string }).actor_id;
    expect(deriveState(withReasoning, withReasoning.length, true).views[actor].reasons?.text).toBe("Weighing who to blame.");
    expect(deriveState(withReasoning, withReasoning.length, false).views[actor].reasons).toBeUndefined();
  });
});
