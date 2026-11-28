import { z } from "zod";

// Event formats written by src/mafia_lab/game.py (Game.emit).
// Unknown event types are accepted with the base fields only, so a new backend
// event never crashes the UI. A known type with wrong fields is reported as invalid.

const base = z
  .object({
    event_id: z.string(),
    game_id: z.string(),
    type: z.string(),
    day: z.number(),
    discussion_round: z.number().nullable(),
    phase: z.string(),
    timestamp_utc: z.string(),
    visibility: z.enum(["public", "privileged"]),
  })
  .passthrough();

const probability = z.object({ target_id: z.string(), p_mafia: z.number() });
const shift = z.object({ target_id: z.string(), predicted_delta_p_mafia: z.number() });
const claim = z.object({
  kind: z.enum(["role", "investigation"]),
  role: z.string().nullable().optional(),
  target_id: z.string().nullable().optional(),
  result: z.string().nullable().optional(),
});
const vote = z.object({ actor_id: z.string(), target_id: z.string().nullable(), forced: z.boolean() });

const schemas = {
  game_started: base.extend({
    players: z.array(z.string()),
    seed: z.number(),
    provider: z.string(),
    learning: z.string(),
    showcase: z.boolean(),
    discussion_rounds: z.number().optional(), // older logs: 3
  }),
  roles_assigned: base.extend({ roles: z.record(z.string()) }),
  setup_details: base.extend({
    learners: z.array(z.string()),
    personas: z.record(z.string()),
    condition: z.string().nullable(),
  }),
  phase_changed: base.extend({ living_players: z.array(z.string()) }),
  public_message: base.extend({
    actor_id: z.string(),
    message: z.string(),
    speaking_position: z.number(),
    claim: claim.nullable().optional(),
  }),
  claim_checked: base.extend({
    actor_id: z.string(),
    message_event_id: z.string(),
    claim,
    literal_truth: z.boolean(),
    speaker_knows_contradiction: z.boolean(),
  }),
  claim_dropped: base.extend({ actor_id: z.string(), reason: z.string() }),
  beliefs_updated: base.extend({ trigger_event_id: z.string(), label: z.string(), observers: z.array(z.string()) }),
  pass: base.extend({ actor_id: z.string(), forced: z.boolean(), speaking_position: z.number() }),
  strategy_summary: base.extend({ actor_id: z.string(), summary: z.string() }),
  notebook_updated: base.extend({
    actor_id: z.string(),
    notebook: z.object({
      trust: z.array(z.object({ player_id: z.string(), stance: z.enum(["trust", "neutral", "suspect"]), reason: z.string() })),
      today_summary: z.string(),
      plan: z.string(),
    }),
  }),
  notebook_rejected: base.extend({ actor_id: z.string() }),
  reasoning_summary: base.extend({ actor_id: z.string(), text: z.string(), source: z.string() }),
  pre_message_prediction: base.extend({
    actor_id: z.string(),
    recipient_id: z.string(),
    candidate_message_id: z.string().nullable(),
    predicted_shifts: z.array(shift),
    declared_goal: z
      .object({ target_id: z.string(), desired_belief: z.string() })
      .nullable()
      .optional(),
  }),
  belief_probe: base.extend({
    actor_id: z.string(),
    source_event_ids: z.array(z.string()),
    probabilities: z.array(probability),
  }),
  vote_results: base.extend({
    votes: z.array(vote),
    eliminated_player_id: z.string().nullable(),
    runoff_candidates: z.array(z.string()).optional(), // a tie: these players go to a runoff
    runoff: z.boolean().optional(), // this is the runoff vote
    tie_break: z.string().nullable().optional(), // "random": the runoff tied too, the seed picked
  }),
  player_eliminated: base.extend({ player_id: z.string(), cause: z.string() }),
  night_kill: base.extend({ actor_id: z.string(), target_id: z.string() }),
  investigation_result: base.extend({
    actor_id: z.string(),
    target_id: z.string(),
    result: z.string(),
  }),
  night_resolved: base.extend({ eliminated_player_id: z.string().nullable() }),
  memory_updated: base.extend({
    actor_id: z.string(),
    memory_version: z.number(),
    markdown: z.string(),
  }),
  action_defaulted: base.extend({ actor_id: z.string(), action_type: z.string() }),
  game_ended: base.extend({
    winner: z.string().nullable(),
    reason: z.string(),
    final_day: z.number(),
    living_players: z.array(z.string()),
  }),
} as const;

type Schemas = typeof schemas;
export type EventType = keyof Schemas;
export type EventOf<T extends EventType> = z.infer<Schemas[T]> & { type: T };
export type BaseEvent = z.infer<typeof base>;
export type GameEvent = BaseEvent;

export function isType<T extends EventType>(event: GameEvent, type: T): event is EventOf<T> {
  return event.type === type;
}

export type ParseResult = { ok: true; event: GameEvent } | { ok: false; error: string; raw: unknown };

export function parseEvent(raw: unknown): ParseResult {
  const type = (raw as { type?: unknown } | null)?.type;
  const schema = typeof type === "string" && type in schemas ? schemas[type as EventType] : base;
  const result = schema.safeParse(raw);
  if (result.success) return { ok: true, event: result.data as GameEvent };
  const issue = result.error.issues[0];
  return {
    ok: false,
    raw,
    error: `${String(type)}: ${issue.path.join(".") || "(root)"} ${issue.message}`,
  };
}
