import type { GameEvent } from "../types/events";

// Presentation pacing: how long the screen holds after showing each kind of event
// (milliseconds at 1× speed). Messages appear one at a time; all belief probes after
// a round are shown together as ONE step, so the arrows move once, after everyone spoke.
export const HOLD_MS: Record<string, number> = {
  game_started: 1500,
  phase_changed: 1800,
  public_message: 2500,
  pass: 900,
  strategy_summary: 250,
  reasoning_summary: 250,
  pre_message_prediction: 250,
  belief_probe: 3500, // the whole batch (all probes + the beliefs_updated marker)
  beliefs_updated: 3500,
  claim_checked: 1500,
  vote_results: 3200,
  player_eliminated: 2800,
  night_kill: 900,
  investigation_result: 1200,
  night_resolved: 1500,
  memory_updated: 1200,
  notebook_updated: 2200,
  game_ended: 3500,
};
const DEFAULT_HOLD = 300;

export type Pace = 0.5 | 1 | 2 | 4 | "instant";
export const PACES: Pace[] = [0.5, 1, 2, 4, "instant"];

const visible = (e: GameEvent, spectator: boolean) => spectator || e.visibility === "public";

/**
 * From `cursor` (number of events already shown), return the cursor after the next
 * presentation step and how long to hold the screen after it.
 */
export function nextStep(events: GameEvent[], cursor: number, spectator: boolean): { cursor: number; hold: number } {
  let i = cursor;
  while (i < events.length && !visible(events[i], spectator)) i++;
  if (i >= events.length) return { cursor: events.length, hold: 0 };
  const event = events[i];
  if (event.type === "belief_probe") {
    let j = i;
    const inBatch = (e: GameEvent) => e.type === "belief_probe" || e.type === "beliefs_updated" || !visible(e, spectator);
    while (j < events.length && inBatch(events[j])) j++;
    return { cursor: j, hold: HOLD_MS.belief_probe };
  }
  return { cursor: i + 1, hold: HOLD_MS[event.type] ?? DEFAULT_HOLD };
}

export const scaled = (ms: number, pace: Pace) => (pace === "instant" ? 0 : ms / pace);
