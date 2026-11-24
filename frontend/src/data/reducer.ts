import { isType, type GameEvent } from "../types/events";

// Ontology layers from CLAUDE.md, used to label every value the UI shows.
export type Layer = "KNOWS" | "BELIEVES" | "SAYS" | "WANTS" | "DOES" | "THINKS" | "REASONS" | "NOTES";

export interface Stamped {
  text: string;
  index: number; // position in the full event array
}

export interface Prediction {
  index: number;
  recipient: string;
  goal: { target: string; desired: string } | null;
  shifts: { target: string; delta: number }[];
}

export type Stance = "trust" | "neutral" | "suspect";

export interface NotebookView {
  index: number;
  day: number;
  trust: { player: string; stance: Stance; reason: string; was?: Stance }[]; // `was` = last night's stance
  summary: string;
  plan: string;
}

export interface CheckedClaim {
  index: number;
  text: string; // human-readable claim, e.g. "investigated Chen: Mafia"
  true: boolean;
  knewFalse: boolean; // the speaker's own knowledge contradicts it
}

export interface PlayerView {
  id: string;
  role?: string; // only filled in spectator view
  alive: boolean;
  thinks?: Stamped; // strategy note the agent wrote itself (self-report)
  reasons?: Stamped; // provider's summary of the model's hidden reasoning, when available
  says?: Stamped;
  does?: Stamped;
  wants?: Prediction;
  notes?: NotebookView; // private notebook written last night, read during the next day
  knows: string[];
  topSuspect?: { target: string; p: number };
  claims: CheckedClaim[]; // structured claims checked against the true game state (spectator only)
  silentTurns: number;
  defaulted: number;
}

export type Beliefs = Record<string, Record<string, number>>; // observer -> target -> p(Mafia)

export interface ProbeStep {
  label: string; // e.g. "D1 R2"
  index: number; // event index of the last probe in this batch
  beliefs: Beliefs; // full snapshot after this batch
}

export interface TranscriptItem {
  index: number;
  kind: "phase" | "message" | "silence" | "vote" | "elimination" | "night" | "private" | "result" | "notebook";
  title: string;
  text: string;
  actor?: string;
  privileged: boolean;
}

export interface GameState {
  gameId?: string;
  players: string[];
  provider?: string;
  showcase?: boolean;
  roles: Record<string, string>;
  alive: Set<string>;
  day: number;
  phase: string;
  round: number | null;
  phaseLabel: string;
  beliefs: Beliefs;
  lastVotes: { actor: string; target: string | null }[];
  probeSteps: ProbeStep[];
  views: Record<string, PlayerView>;
  transcript: TranscriptItem[];
  winner: string | null | undefined; // undefined = still running
  endReason?: string;
  defaultedCount: number;
  claimsDropped: number; // claims removed because the model wrote them in a broken format (message kept)
  cursorEvent?: GameEvent;
  /** Beliefs were re-probed after the last thing anyone said or did (arrows show their change). */
  beliefsJustUpdated: boolean;
}

const PHASE_LABEL: Record<string, string> = {
  setup: "Setup",
  day_discussion: "Discussion",
  day_vote: "Voting",
  night_action: "Night",
  night_notebook: "Night · notebooks",
  game_over: "Game over",
  memory_update: "Memory update",
};

// Players are named (e.g. "Chen"); older logs used IDs like "agent_C".
export const short = (id: string) => id.replace(/^agent_/, "");
export const displayName = (id: string) => (id.startsWith("agent_") ? "Agent " + short(id) : id);

function view(state: GameState, id: string): PlayerView {
  if (!state.views[id]) {
    state.views[id] = { id, alive: true, knows: [], claims: [], silentTurns: 0, defaulted: 0 };
  }
  return state.views[id];
}

function cloneBeliefs(b: Beliefs): Beliefs {
  return Object.fromEntries(Object.entries(b).map(([k, v]) => [k, { ...v }]));
}

/**
 * Rebuild the game state from the first `cursor` events.
 * In player view (spectator = false) privileged events are skipped entirely,
 * so nothing private can leak into the public view.
 */
export function deriveState(events: GameEvent[], cursor: number, spectator: boolean): GameState {
  const state: GameState = {
    players: [],
    roles: {},
    alive: new Set(),
    day: 0,
    phase: "setup",
    round: null,
    phaseLabel: "Waiting to start",
    beliefs: {},
    lastVotes: [],
    probeSteps: [],
    views: {},
    transcript: [],
    winner: undefined,
    defaultedCount: 0,
    claimsDropped: 0,
    beliefsJustUpdated: false,
  };
  const end = Math.min(cursor, events.length);
  let lastProbeTrigger: string | undefined;
  let lastBeliefsUpdated = -1; // index of the latest explicit "beliefs_updated" marker
  let sawMarker = false;

  for (let i = 0; i < end; i++) {
    const e = events[i];
    const privileged = e.visibility !== "public";
    if (privileged && !spectator) continue;
    state.gameId = e.game_id;
    state.cursorEvent = e;

    if (isType(e, "game_started")) {
      state.players = e.players;
      state.provider = e.provider;
      state.showcase = e.showcase;
      state.alive = new Set(e.players);
      e.players.forEach((p) => view(state, p));
    } else if (isType(e, "roles_assigned")) {
      state.roles = e.roles;
      for (const [p, role] of Object.entries(e.roles)) {
        view(state, p).role = role;
        if (role === "mafia") {
          const mates = Object.entries(e.roles)
            .filter(([o, r]) => r === "mafia" && o !== p)
            .map(([o]) => displayName(o));
          if (mates.length) view(state, p).knows.push(`Mafia teammate: ${mates.join(", ")}`);
        }
      }
    } else if (isType(e, "phase_changed")) {
      state.day = e.day;
      state.phase = e.phase;
      state.round = e.discussion_round;
      state.alive = new Set(e.living_players);
      state.transcript.push({
        index: i,
        kind: "phase",
        title: `Day ${e.day}`,
        text: PHASE_LABEL[e.phase] ?? e.phase,
        privileged,
      });
    } else if (isType(e, "public_message")) {
      state.round = e.discussion_round;
      view(state, e.actor_id).says = { text: e.message, index: i };
      state.transcript.push({
        index: i,
        kind: "message",
        title: displayName(e.actor_id),
        text: e.message,
        actor: e.actor_id,
        privileged,
      });
    } else if (isType(e, "pass")) {
      const v = view(state, e.actor_id);
      v.silentTurns += 1;
      v.does = { text: e.forced ? "Silent (forced: no valid answer)" : "Stayed silent", index: i };
      state.transcript.push({
        index: i,
        kind: "silence",
        title: displayName(e.actor_id),
        text: e.forced ? "(silent, forced)" : "(stayed silent)",
        actor: e.actor_id,
        privileged,
      });
    } else if (isType(e, "strategy_summary")) {
      view(state, e.actor_id).thinks = { text: e.summary, index: i };
    } else if (isType(e, "claim_dropped")) {
      state.claimsDropped += 1;
    } else if (isType(e, "beliefs_updated")) {
      lastBeliefsUpdated = i;
      sawMarker = true;
    } else if (isType(e, "claim_checked")) {
      const c = e.claim;
      const text =
        c.kind === "role"
          ? `claims to be ${c.role === "detective" ? "the Detective" : `a ${c.role}`}`
          : `claims investigating ${displayName(c.target_id ?? "?")}: ${c.result === "mafia" ? "Mafia" : "not Mafia"}`;
      view(state, e.actor_id).claims.push({ index: i, text, true: e.literal_truth, knewFalse: e.speaker_knows_contradiction });
      if (!e.literal_truth) {
        state.transcript.push({
          index: i,
          kind: "private",
          title: `⚠ ${displayName(e.actor_id)}`,
          text: `False claim: ${text} (they know it is false)`,
          actor: e.actor_id,
          privileged,
        });
      }
    } else if (isType(e, "notebook_updated")) {
      const v = view(state, e.actor_id);
      const before = new Map(v.notes?.trust.map((t) => [t.player, t.stance]));
      v.notes = {
        index: i,
        day: e.day,
        trust: e.notebook.trust.map((t) => ({ player: t.player_id, stance: t.stance, reason: t.reason, was: before.get(t.player_id) })),
        summary: e.notebook.today_summary,
        plan: e.notebook.plan,
      };
      const suspects = e.notebook.trust.filter((t) => t.stance === "suspect").map((t) => displayName(t.player_id));
      state.transcript.push({
        index: i,
        kind: "notebook",
        title: `${displayName(e.actor_id)}'s notebook`,
        text: (suspects.length ? `Suspects ${suspects.join(", ")}. ` : "Suspects no one yet. ") + `Plan: ${e.notebook.plan}`,
        actor: e.actor_id,
        privileged,
      });
    } else if (isType(e, "reasoning_summary")) {
      view(state, e.actor_id).reasons = { text: e.text, index: i };
    } else if (isType(e, "pre_message_prediction")) {
      view(state, e.actor_id).wants = {
        index: i,
        recipient: e.recipient_id,
        goal: e.declared_goal
          ? { target: e.declared_goal.target_id, desired: e.declared_goal.desired_belief }
          : null,
        shifts: e.predicted_shifts.map((s) => ({ target: s.target_id, delta: s.predicted_delta_p_mafia })),
      };
    } else if (isType(e, "belief_probe")) {
      const row: Record<string, number> = {};
      for (const pr of e.probabilities) row[pr.target_id] = pr.p_mafia;
      state.beliefs[e.actor_id] = row;
      const top = e.probabilities.reduce<{ target: string; p: number } | undefined>(
        (best, pr) => (!best || pr.p_mafia > best.p ? { target: pr.target_id, p: pr.p_mafia } : best),
        undefined,
      );
      view(state, e.actor_id).topSuspect = top;
      // Probes triggered by the same event form one batch = one point on the timeline charts.
      const trigger = e.source_event_ids[0] ?? e.event_id;
      const label = `D${e.day} R${e.discussion_round ?? "-"}`;
      if (trigger !== lastProbeTrigger) {
        state.probeSteps.push({ label, index: i, beliefs: cloneBeliefs(state.beliefs) });
        lastProbeTrigger = trigger;
      } else {
        const step = state.probeSteps[state.probeSteps.length - 1];
        step.index = i;
        step.beliefs = cloneBeliefs(state.beliefs);
      }
    } else if (isType(e, "vote_results")) {
      state.lastVotes = e.votes.map((v) => ({ actor: v.actor_id, target: v.target_id }));
      for (const v of e.votes) {
        view(state, v.actor_id).does = {
          text: v.target_id ? `Voted for ${displayName(v.target_id)}` : "Abstained",
          index: i,
        };
      }
      state.transcript.push({
        index: i,
        kind: "vote",
        title: "Vote",
        text:
          e.votes.map((v) => `${short(v.actor_id)}→${v.target_id ? short(v.target_id) : "∅"}`).join("  ") +
          (e.eliminated_player_id ? "" : "  (tie: no elimination)"),
        privileged,
      });
    } else if (isType(e, "player_eliminated")) {
      state.alive.delete(e.player_id);
      view(state, e.player_id).alive = false;
      state.transcript.push({
        index: i,
        kind: "elimination",
        title: "Eliminated",
        text: `${displayName(e.player_id)} (${e.cause === "day_vote" ? "voted out" : "killed at night"})`,
        privileged,
      });
    } else if (isType(e, "night_kill")) {
      view(state, e.actor_id).does = { text: `Night: chose to kill ${displayName(e.target_id)}`, index: i };
      state.transcript.push({
        index: i,
        kind: "private",
        title: displayName(e.actor_id),
        text: `nominated ${displayName(e.target_id)} for the night kill`,
        actor: e.actor_id,
        privileged,
      });
    } else if (isType(e, "investigation_result")) {
      const v = view(state, e.actor_id);
      v.does = { text: `Night: investigated ${displayName(e.target_id)}`, index: i };
      v.knows.push(`${displayName(e.target_id)} is ${e.result === "mafia" ? "Mafia" : "not Mafia"} (day ${e.day})`);
      state.transcript.push({
        index: i,
        kind: "private",
        title: displayName(e.actor_id),
        text: `investigated ${displayName(e.target_id)}: ${e.result === "mafia" ? "MAFIA" : "not Mafia"}`,
        actor: e.actor_id,
        privileged,
      });
    } else if (isType(e, "night_resolved")) {
      if (!e.eliminated_player_id) {
        state.transcript.push({ index: i, kind: "night", title: "Night", text: "No one died.", privileged });
      }
    } else if (isType(e, "action_defaulted")) {
      state.defaultedCount += 1;
      view(state, e.actor_id).defaulted += 1;
    } else if (isType(e, "game_ended")) {
      state.winner = e.winner;
      state.endReason = e.reason;
      state.phase = "game_over";
      state.alive = new Set(e.living_players);
      state.transcript.push({
        index: i,
        kind: "result",
        title: "Game over",
        text: e.winner === "mafia" ? "Mafia wins" : e.winner === "villagers" ? "Villagers win" : "Draw (day limit)",
        privileged,
      });
    } else if (e.type === "game_failed" || e.type === "game_cancelled") {
      state.winner = null;
      state.endReason = e.type;
    }
  }

  for (const p of state.players) view(state, p).alive = state.alive.has(p);
  // Prefer the backend's explicit marker; older logs without it fall back to event order.
  const lastSaid = state.transcript.filter((t) => t.kind !== "private").at(-1)?.index ?? -1;
  state.beliefsJustUpdated = sawMarker
    ? lastBeliefsUpdated > lastSaid
    : (state.probeSteps.at(-1)?.index ?? -1) > (state.transcript.at(-1)?.index ?? -1);
  if (!spectator) for (const v of Object.values(state.views)) v.role = undefined;

  state.phaseLabel =
    state.winner !== undefined
      ? state.endReason === "game_failed"
        ? "Simulation failed"
        : state.endReason === "game_cancelled"
          ? "Cancelled"
          : "Game over"
      : state.day === 0
        ? "Waiting to start"
        : `Day ${state.day} · ${PHASE_LABEL[state.phase] ?? state.phase}` +
          (state.phase === "day_discussion" && state.round ? ` ${state.round}/3` : "");
  return state;
}

/** Mean reported p(target is Mafia) across living observers other than the target. */
export function meanSuspicion(beliefs: Beliefs, target: string): number | null {
  const values = Object.entries(beliefs)
    .filter(([observer, row]) => observer !== target && row[target] !== undefined)
    .map(([, row]) => row[target]);
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
}
