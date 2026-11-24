import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseEvent, type GameEvent } from "../types/events";
import { deriveState, meanSuspicion } from "./reducer";

// A real 6-player showcase game from the mock provider (protocol_exchange events removed,
// as the server never sends them to the UI).
const raw = readFileSync(new URL("../fixtures/sample-6p.jsonl", import.meta.url), "utf8")
  .trim()
  .split("\n")
  .map((line) => JSON.parse(line));
const parsed = raw.map(parseEvent);
const events = parsed.flatMap((r) => (r.ok ? [r.event] : [])) as GameEvent[];
const ended = raw.find((e) => e.type === "game_ended");
const roles = raw.find((e) => e.type === "roles_assigned").roles as Record<string, string>;

describe("event validation", () => {
  it("accepts every event the backend produced", () => {
    const failures = parsed.filter((r) => !r.ok);
    expect(failures).toEqual([]);
  });

  it("reports a known event with a missing field", () => {
    const broken = { ...raw.find((e) => e.type === "public_message"), message: undefined };
    const result = parseEvent(broken);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("message");
  });

  it("accepts unknown event types instead of crashing", () => {
    const future = { ...raw[0], type: "some_future_event", extra: 1 };
    expect(parseEvent(future).ok).toBe(true);
  });
});

describe("deriveState", () => {
  it("is empty at cursor 0", () => {
    const s = deriveState(events, 0, true);
    expect(s.players).toEqual([]);
    expect(s.transcript).toEqual([]);
    expect(s.winner).toBeUndefined();
  });

  it("matches the final game result at the end", () => {
    const s = deriveState(events, events.length, true);
    expect(s.winner).toBe(ended.winner);
    expect([...s.alive].sort()).toEqual([...ended.living_players].sort());
    expect(s.players).toHaveLength(6);
  });

  it("keeps the latest belief probe per observer", () => {
    const probes = raw.filter((e) => e.type === "belief_probe");
    const last = probes[probes.length - 1];
    const s = deriveState(events, events.length, true);
    for (const pr of last.probabilities) {
      expect(s.beliefs[last.actor_id][pr.target_id]).toBe(pr.p_mafia);
    }
    expect(s.probeSteps.length).toBeGreaterThan(0);
  });

  it("hides every private layer in player view", () => {
    const s = deriveState(events, events.length, false);
    expect(s.roles).toEqual({});
    expect(s.beliefs).toEqual({});
    expect(s.probeSteps).toEqual([]);
    for (const v of Object.values(s.views)) {
      expect(v.role).toBeUndefined();
      expect(v.thinks).toBeUndefined();
      expect(v.wants).toBeUndefined();
      expect(v.knows).toEqual([]);
    }
    expect(s.transcript.every((t) => !t.privileged)).toBe(true);
  });

  it("shows roles and teammates in spectator view", () => {
    const s = deriveState(events, events.length, true);
    expect(s.roles).toEqual(roles);
    const mafia = Object.keys(roles).filter((p) => roles[p] === "mafia");
    expect(s.views[mafia[0]].knows.join(" ")).toContain(mafia[1].replace("agent_", ""));
  });

  it("only uses events before the cursor", () => {
    const firstVote = events.findIndex((e) => e.type === "vote_results");
    const before = deriveState(events, firstVote, true);
    const after = deriveState(events, firstVote + 1, true);
    expect(before.lastVotes).toEqual([]);
    expect(after.lastVotes.length).toBeGreaterThan(0);
  });
});

describe("meanSuspicion", () => {
  it("averages other observers and ignores self", () => {
    expect(meanSuspicion({ A: { B: 0.2 }, C: { B: 0.6 }, B: { B: 1 } }, "B")).toBeCloseTo(0.4);
    expect(meanSuspicion({}, "B")).toBeNull();
  });
});
