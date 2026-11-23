# Agent–Backend Message Protocol

**Project:** [Learned-Deception](https://github.com/nandininarvekar/Learned-Deception)  
**Version:** 1.0 — proposed contract for review; not an implemented API.

## 1. Architecture and scope

FastAPI owns the game state, rules, scheduling, validation, and event log. Six isolated agent runners receive tasks, call the configured model, and return structured results. The frontend uses WebSocket with FastAPI; frontend messages are outside this document.

The messages below work as internal async request/response objects or as JSON over HTTP. Agents do not need six separate HTTP servers. If independently deployed, each runner may expose `POST /v1/messages`: task messages return the corresponding result; notification messages return HTTP 204. The backend validates results and delivers receipts as subsequent notifications. Transport acknowledgments are not additional message types.

Examples are illustrative and independent, not a single continuous transcript. In particular, role-specific examples use different hypothetical roles for agent_A.

## 2. Catalog

### Backend → Agent

| Type | Purpose | Agent output |
|---|---|---|
| `game_started` | Initialize identity, role, rules, private memory | None |
| `phase_changed` | Announce a phase transition | None |
| `public_events` | Deliver published dialogue/outcomes | None |
| `action_requested` | Request one legal action | `action_submitted` or `request_failed` |
| `private_result` | Deliver role-specific information | None |
| `action_receipt` | Accept/reject an action | None; correction if allowed |
| `game_ended` | Announce result and permitted disclosures | None |
| `reflection_requested` | Request private postgame memory revision | `memory_update_submitted` or `request_failed` |
| `memory_update_receipt` | Accept/reject memory revision | None |
| `belief_probe_requested` | Measure reported beliefs in an isolated call | `belief_probe_result` or `request_failed` |
| `influence_prediction_requested` | Predict recipient response before publication | `influence_prediction_result` or `request_failed` |
| `request_cancelled` | Invalidate outstanding work | None |

### Agent → Backend

| Type | Purpose |
|---|---|
| `action_submitted` | Return one action and optional private strategy summary |
| `memory_update_submitted` | Propose replacement private memory |
| `belief_probe_result` | Return reported Mafia probabilities |
| `influence_prediction_result` | Return predicted belief shifts and optional goal |
| `request_failed` | Report a runner/model failure |

Notifications update runner state without invoking the model. Only action, reflection, belief-probe, and influence-prediction requests trigger model work.

## 3. Common envelope

All examples include the complete envelope:

- `protocol_version`: version of this protocol.
- `type`: one of the catalog message types.
- `message_id`: unique delivery/result identifier; used for idempotency.
- `reply_to`: triggering message ID, or null for an unsolicited notification.
- `game_id`: game or replay branch identifier.
- `agent_id`: recipient for backend messages; sender for agent messages. Authentication determines identity.
- `timestamp_utc`: ISO 8601 UTC timestamp supplied by trusted code.
- `payload`: type-specific content.

`observation_id` identifies an immutable player-specific snapshot; `window_id` identifies a game action window. Responses must match both where supplied. Event IDs identify game facts and are separate from protocol message IDs. The runner constructs/verifies metadata; the model generates result fields only.

## 4. Game initialization

### `game_started`

The backend sends the common rules and private initial context. Other players' roles are absent. Mafia receives teammate identities through private facts. The memory content is private and frozen during this game.

**Input received by the agent**

```json
{
  "protocol_version": "1.0",
  "type": "game_started",
  "message_id": "msg_start",
  "reply_to": null,
  "game_id": "game_001",
  "agent_id": "agent_A",
  "timestamp_utc": "2026-11-23T02:00:00Z",
  "payload": {
    "self": {
      "agent_id": "agent_A",
      "role": "villager",
      "alive": true
    },
    "players": [
      {
        "agent_id": "agent_A",
        "display_name": "Player A"
      },
      {
        "agent_id": "agent_B",
        "display_name": "Player B"
      },
      {
        "agent_id": "agent_C",
        "display_name": "Player C"
      },
      {
        "agent_id": "agent_D",
        "display_name": "Player D"
      },
      {
        "agent_id": "agent_E",
        "display_name": "Player E"
      },
      {
        "agent_id": "agent_F",
        "display_name": "Player F"
      }
    ],
    "rules": {
      "max_discussion_rounds": 3,
      "max_speeches_per_player_per_day": 3,
      "max_public_message_codepoints": 600,
      "max_strategy_summary_codepoints": 600,
      "vote_abstention_allowed": true,
      "night_no_action_allowed": true,
      "self_vote_allowed": false,
      "reveal_roles_on_elimination": false,
      "reveal_roles_at_game_end": false,
      "day_vote_resolution": "unique_plurality_else_no_elimination",
      "mafia_night_resolution": "plurality_seeded_random_tiebreak",
      "max_days": 10
    },
    "private_facts": [],
    "memory": {
      "version": 3,
      "strategy_version": "G0",
      "updates_enabled": true,
      "generalized_memory": "Request evidence before committing to a vote.",
      "opponent_impressions": []
    },
    "summary_enabled": true
  }
}
```

**Output:** None. The runner initializes state without a model call. The base prompt is loaded from shared experiment configuration and is identical across players.

## 5. Phase notification

### `phase_changed`

Phase values are `day_discussion`, `day_vote`, and `night_action`. This notification does not authorize an action; wait for `action_requested`.

**Input received by the agent**

```json
{
  "protocol_version": "1.0",
  "type": "phase_changed",
  "message_id": "msg_phase",
  "reply_to": null,
  "game_id": "game_001",
  "agent_id": "agent_A",
  "timestamp_utc": "2026-11-23T02:00:00Z",
  "payload": {
    "phase": "day_vote",
    "day": 1,
    "discussion_round": null,
    "living_players": [
      "agent_A",
      "agent_B",
      "agent_C",
      "agent_D",
      "agent_E",
      "agent_F"
    ],
    "public_outcomes": []
  }
}
```

**Output:** None.

## 6. Public information delivery

### `public_events`

Contains only published information permitted by the rules. Public votes are included only after the complete vote window closes. Deduplicate repeated deliveries by event ID.

**Input received by the agent**

```json
{
  "protocol_version": "1.0",
  "type": "public_events",
  "message_id": "msg_public",
  "reply_to": null,
  "game_id": "game_001",
  "agent_id": "agent_A",
  "timestamp_utc": "2026-11-23T02:00:00Z",
  "payload": {
    "events": [
      {
        "event_id": "evt_011",
        "type": "public_message",
        "actor_id": "agent_B",
        "day": 1,
        "discussion_round": 1,
        "message": "C changed the explanation. I would like to know why."
      },
      {
        "event_id": "evt_012",
        "type": "vote_results",
        "day": 1,
        "votes": [
          {
            "actor_id": "agent_A",
            "target_id": "agent_C"
          },
          {
            "actor_id": "agent_B",
            "target_id": "agent_C"
          },
          {
            "actor_id": "agent_C",
            "target_id": "agent_B"
          },
          {
            "actor_id": "agent_D",
            "target_id": "agent_C"
          },
          {
            "actor_id": "agent_E",
            "target_id": null
          },
          {
            "actor_id": "agent_F",
            "target_id": "agent_B"
          }
        ],
        "eliminated_player_id": "agent_C"
      },
      {
        "event_id": "evt_013",
        "type": "player_eliminated",
        "day": 1,
        "player_id": "agent_C",
        "cause": "day_vote"
      }
    ]
  }
}
```

**Output:** None. Append published events to local history. Hidden roles, private summaries, and other players' private actions never appear here.

## 7. Gameplay requests and every action output

### `action_requested` and `action_submitted`

Each request carries a complete, permitted current-game observation. The runner combines it with its previously loaded private memory. The example public history is short only because it is an illustrative early-game snapshot.

During discussion, each living player has at most one opportunity per round and three per day. `pass` consumes an opportunity. Every player in a synchronized round sees the same public-history cutoff. Publish the entire round only after responses arrive or the deadline passes.

### 7.1 Discussion input

**Input received by the agent**

```json
{
  "protocol_version": "1.0",
  "type": "action_requested",
  "message_id": "req_discuss",
  "reply_to": null,
  "game_id": "game_001",
  "agent_id": "agent_A",
  "timestamp_utc": "2026-11-23T02:00:00Z",
  "payload": {
    "observation_id": "obs_discuss",
    "window_id": "day1_round2",
    "phase": "day_discussion",
    "day": 1,
    "discussion_round": 2,
    "allowed_actions": [
      "speak",
      "pass"
    ],
    "legal_targets": [],
    "remaining_speeches_today": 2,
    "deadline_at": "2026-11-23T02:00:30Z",
    "observation": {
      "self": {
        "agent_id": "agent_A",
        "role": "villager",
        "alive": true
      },
      "living_players": [
        "agent_A",
        "agent_B",
        "agent_C",
        "agent_D",
        "agent_E",
        "agent_F"
      ],
      "public_history": [
        {
          "event_id": "evt_001",
          "type": "public_message",
          "actor_id": "agent_B",
          "message": "Please explain the evidence for your accusation."
        }
      ],
      "private_facts": [],
      "memory_version": 3,
      "strategy_version": "G0"
    }
  }
}
```

### 7.2 Output option: `speak`

**Output sent by the agent**

```json
{
  "protocol_version": "1.0",
  "type": "action_submitted",
  "message_id": "res_speak",
  "reply_to": "req_discuss",
  "game_id": "game_001",
  "agent_id": "agent_A",
  "timestamp_utc": "2026-11-23T02:00:00Z",
  "payload": {
    "observation_id": "obs_discuss",
    "window_id": "day1_round2",
    "action": {
      "type": "speak",
      "message": "B, what evidence supports your accusation? I would like to hear the explanation before deciding."
    },
    "strategy_summary": "I will ask B to support the accusation. I am withholding judgment until I hear the evidence."
  }
}
```

Only `action.message` becomes public dialogue. The optional `strategy_summary` is a brief observer-facing self-report, not step-by-step internal reasoning. Both text fields should be about 2–3 sentences, capped at 600 Unicode code points each. Use null for the summary when disabled.

### 7.3 Alternative output: `pass`

**Output sent by the agent**

```json
{
  "protocol_version": "1.0",
  "type": "action_submitted",
  "message_id": "res_pass",
  "reply_to": "req_discuss",
  "game_id": "game_001",
  "agent_id": "agent_A",
  "timestamp_utc": "2026-11-23T02:00:00Z",
  "payload": {
    "observation_id": "obs_discuss",
    "window_id": "day1_round2",
    "action": {
      "type": "pass"
    },
    "strategy_summary": "I do not have new evidence to add. I will wait for more public information."
  }
}
```

These are alternative responses. Exactly one valid response is accepted for this player/window.

### 7.4 Voting input

**Input received by the agent**

```json
{
  "protocol_version": "1.0",
  "type": "action_requested",
  "message_id": "req_vote",
  "reply_to": null,
  "game_id": "game_001",
  "agent_id": "agent_A",
  "timestamp_utc": "2026-11-23T02:00:00Z",
  "payload": {
    "observation_id": "obs_vote",
    "window_id": "day1_vote",
    "phase": "day_vote",
    "day": 1,
    "discussion_round": null,
    "allowed_actions": [
      "vote"
    ],
    "legal_targets": [
      "agent_B",
      "agent_C",
      "agent_D",
      "agent_E",
      "agent_F"
    ],
    "remaining_speeches_today": 0,
    "deadline_at": "2026-11-23T02:00:30Z",
    "observation": {
      "self": {
        "agent_id": "agent_A",
        "role": "villager",
        "alive": true
      },
      "living_players": [
        "agent_A",
        "agent_B",
        "agent_C",
        "agent_D",
        "agent_E",
        "agent_F"
      ],
      "public_history": [
        {
          "event_id": "evt_001",
          "type": "public_message",
          "actor_id": "agent_B",
          "message": "Please explain the evidence for your accusation."
        }
      ],
      "private_facts": [],
      "memory_version": 3,
      "strategy_version": "G0"
    }
  }
}
```

### 7.5 Output option: `vote` for a player

**Output sent by the agent**

```json
{
  "protocol_version": "1.0",
  "type": "action_submitted",
  "message_id": "res_vote",
  "reply_to": "req_vote",
  "game_id": "game_001",
  "agent_id": "agent_A",
  "timestamp_utc": "2026-11-23T02:00:00Z",
  "payload": {
    "observation_id": "obs_vote",
    "window_id": "day1_vote",
    "action": {
      "type": "vote",
      "target_id": "agent_C"
    },
    "strategy_summary": "C has not resolved the inconsistency in the public discussion. My vote reflects suspicion rather than confirmed knowledge."
  }
}
```

### 7.6 Alternative output: `vote` with abstention

**Output sent by the agent**

```json
{
  "protocol_version": "1.0",
  "type": "action_submitted",
  "message_id": "res_abstain",
  "reply_to": "req_vote",
  "game_id": "game_001",
  "agent_id": "agent_A",
  "timestamp_utc": "2026-11-23T02:00:00Z",
  "payload": {
    "observation_id": "obs_vote",
    "window_id": "day1_vote",
    "action": {
      "type": "vote",
      "target_id": null
    },
    "strategy_summary": "I cannot distinguish the candidates confidently. I will abstain under the current rules."
  }
}
```

Null is legal only when abstention is enabled. Votes remain private until the window closes.

### 7.7 Mafia night input

**Input received by the agent**

```json
{
  "protocol_version": "1.0",
  "type": "action_requested",
  "message_id": "req_kill",
  "reply_to": null,
  "game_id": "game_001",
  "agent_id": "agent_A",
  "timestamp_utc": "2026-11-23T02:00:00Z",
  "payload": {
    "observation_id": "obs_kill",
    "window_id": "night1",
    "phase": "night_action",
    "day": 1,
    "discussion_round": null,
    "allowed_actions": [
      "night_kill",
      "no_action"
    ],
    "legal_targets": [
      "agent_C",
      "agent_D",
      "agent_E",
      "agent_F"
    ],
    "remaining_speeches_today": 0,
    "deadline_at": "2026-11-23T02:00:30Z",
    "observation": {
      "self": {
        "agent_id": "agent_A",
        "role": "mafia",
        "alive": true
      },
      "living_players": [
        "agent_A",
        "agent_B",
        "agent_C",
        "agent_D",
        "agent_E",
        "agent_F"
      ],
      "public_history": [
        {
          "event_id": "evt_001",
          "type": "public_message",
          "actor_id": "agent_B",
          "message": "Please explain the evidence for your accusation."
        }
      ],
      "private_facts": [
        {
          "type": "mafia_teammate",
          "agent_id": "agent_B"
        }
      ],
      "memory_version": 3,
      "strategy_version": "G0"
    }
  }
}
```

### 7.8 Output: `night_kill`

**Output sent by the agent**

```json
{
  "protocol_version": "1.0",
  "type": "action_submitted",
  "message_id": "res_kill",
  "reply_to": "req_kill",
  "game_id": "game_001",
  "agent_id": "agent_A",
  "timestamp_utc": "2026-11-23T02:00:00Z",
  "payload": {
    "observation_id": "obs_kill",
    "window_id": "night1",
    "action": {
      "type": "night_kill",
      "target_id": "agent_D"
    },
    "strategy_summary": "D is coordinating the opposing team effectively. Removing D may weaken that coordination."
  }
}
```

This is a target proposal, not an immediate kill. Resolve Mafia proposals together under the configured rule. The illustrative rule uses plurality with a seeded random tie-break.

### 7.9 Detective night input

**Input received by the agent**

```json
{
  "protocol_version": "1.0",
  "type": "action_requested",
  "message_id": "req_investigate",
  "reply_to": null,
  "game_id": "game_001",
  "agent_id": "agent_A",
  "timestamp_utc": "2026-11-23T02:00:00Z",
  "payload": {
    "observation_id": "obs_investigate",
    "window_id": "night1",
    "phase": "night_action",
    "day": 1,
    "discussion_round": null,
    "allowed_actions": [
      "investigate",
      "no_action"
    ],
    "legal_targets": [
      "agent_B",
      "agent_C",
      "agent_D",
      "agent_E",
      "agent_F"
    ],
    "remaining_speeches_today": 0,
    "deadline_at": "2026-11-23T02:00:30Z",
    "observation": {
      "self": {
        "agent_id": "agent_A",
        "role": "detective",
        "alive": true
      },
      "living_players": [
        "agent_A",
        "agent_B",
        "agent_C",
        "agent_D",
        "agent_E",
        "agent_F"
      ],
      "public_history": [
        {
          "event_id": "evt_001",
          "type": "public_message",
          "actor_id": "agent_B",
          "message": "Please explain the evidence for your accusation."
        }
      ],
      "private_facts": [],
      "memory_version": 3,
      "strategy_version": "G0"
    }
  }
}
```

### 7.10 Output option: `investigate`

**Output sent by the agent**

```json
{
  "protocol_version": "1.0",
  "type": "action_submitted",
  "message_id": "res_investigate",
  "reply_to": "req_investigate",
  "game_id": "game_001",
  "agent_id": "agent_A",
  "timestamp_utc": "2026-11-23T02:00:00Z",
  "payload": {
    "observation_id": "obs_investigate",
    "window_id": "night1",
    "action": {
      "type": "investigate",
      "target_id": "agent_F"
    },
    "strategy_summary": "F has attracted conflicting accusations. An investigation could resolve that uncertainty."
  }
}
```

### 7.11 Alternative output: `no_action`

**Output sent by the agent**

```json
{
  "protocol_version": "1.0",
  "type": "action_submitted",
  "message_id": "res_no_action",
  "reply_to": "req_investigate",
  "game_id": "game_001",
  "agent_id": "agent_A",
  "timestamp_utc": "2026-11-23T02:00:00Z",
  "payload": {
    "observation_id": "obs_investigate",
    "window_id": "night1",
    "action": {
      "type": "no_action"
    },
    "strategy_summary": null
  }
}
```

`no_action` is legal only if explicitly offered. Villagers receive no night-action request. Investigations and kill proposals require non-null legal targets. Dead players cannot be targeted; Mafia cannot target teammates. Backend validation enforces every restriction.

## 8. Action validation

### `action_receipt`

The receipt references the submitted response, not the original task. Acceptance records the action without resolving the window early.

**Input: action accepted**

```json
{
  "protocol_version": "1.0",
  "type": "action_receipt",
  "message_id": "receipt_action",
  "reply_to": "res_speak",
  "game_id": "game_001",
  "agent_id": "agent_A",
  "timestamp_utc": "2026-11-23T02:00:00Z",
  "payload": {
    "accepted": true,
    "submitted_message_id": "res_speak",
    "window_id": "day1_round2",
    "status": "pending_resolution",
    "error": null
  }
}
```

**Output:** None. Do not submit a second action.

**Alternative input: action rejected**

```json
{
  "protocol_version": "1.0",
  "type": "action_receipt",
  "message_id": "receipt_invalid",
  "reply_to": "res_invalid",
  "game_id": "game_001",
  "agent_id": "agent_A",
  "timestamp_utc": "2026-11-23T02:00:00Z",
  "payload": {
    "accepted": false,
    "submitted_message_id": "res_invalid",
    "window_id": "day1_vote",
    "status": "rejected",
    "error": {
      "code": "INVALID_TARGET",
      "message": "Select a target from legal_targets.",
      "retryable": true,
      "deadline_at": "2026-11-23T02:00:30Z"
    }
  }
}
```

**Output:** If retryable and before the original deadline, return a corrected `action_submitted` with a new message ID, the same snapshot/window, and `reply_to` referencing the original action request. A rejected action does not consume an opportunity. Limit model-format repairs to two attempts per window.

**Output sent by the agent**

```json
{
  "protocol_version": "1.0",
  "type": "action_submitted",
  "message_id": "res_corrected",
  "reply_to": "req_vote",
  "game_id": "game_001",
  "agent_id": "agent_A",
  "timestamp_utc": "2026-11-23T02:00:00Z",
  "payload": {
    "observation_id": "obs_vote",
    "window_id": "day1_vote",
    "action": {
      "type": "vote",
      "target_id": "agent_C"
    },
    "strategy_summary": null
  }
}
```

| Error | Meaning | Response |
|---|---|---|
| `INVALID_SCHEMA` | Missing/extra/mistyped fields | Correct before deadline |
| `TEXT_TOO_LONG` | Text exceeds cap | Shorten before deadline |
| `INVALID_TARGET` | Target not legal | Correct before deadline |
| `ACTION_NOT_ALLOWED` | Wrong role/action/phase | Correct before deadline |
| `STALE_WINDOW` | Closed window or snapshot mismatch | Discard stale response |
| `ALREADY_SUBMITTED` | Valid action already recorded | Retain accepted action |
| `MESSAGE_ID_CONFLICT` | Same ID with different body | Runner error |

Identical retries return the original receipt even after the window closes, without counting twice. Schema and game-state checks happen atomically. Timeout defaults are pass, abstention, or night no-action, recorded explicitly as forced defaults rather than intentional choices. A failure default may apply even when voluntary abstention/no-action is disabled by rules.

## 9. Role-specific result

### `private_result`

Delivered only to the authorized player and privileged spectator/evaluator. Night actions resolve together.

**Input: investigation result**

```json
{
  "protocol_version": "1.0",
  "type": "private_result",
  "message_id": "msg_result",
  "reply_to": null,
  "game_id": "game_001",
  "agent_id": "agent_A",
  "timestamp_utc": "2026-11-23T02:00:00Z",
  "payload": {
    "source_event_id": "evt_private_021",
    "result_type": "investigation",
    "day": 1,
    "target_id": "agent_F",
    "result": "mafia"
  }
}
```

**Output:** None. Store as a private fact. Possible investigation results are `mafia` and `non_mafia`; exact special roles are not disclosed. Any later public claim requires a separate `speak` action.

## 10. Game termination

### `game_ended`

**Input: final outcome**

```json
{
  "protocol_version": "1.0",
  "type": "game_ended",
  "message_id": "msg_end",
  "reply_to": null,
  "game_id": "game_001",
  "agent_id": "agent_A",
  "timestamp_utc": "2026-11-23T02:00:00Z",
  "payload": {
    "winner": "villagers",
    "reason": "all_mafia_eliminated",
    "final_day": 3,
    "team_result": "win",
    "final_public_event_id": "evt_080",
    "role_disclosures": []
  }
}
```

**Output:** None. Stop gameplay and invalidate outstanding action windows. Winner is `villagers`, `mafia`, null for draw/cancellation. Hidden roles are disclosed only if the frozen policy explicitly allows it. Full evaluator truth is not automatically player feedback.

## 11. Postgame reflection

### `reflection_requested`

Only agents with updates enabled receive this request. Static agents and frozen evaluation do not update. Feedback includes only permitted experience, never other players' private records.

**Input: request memory revision**

```json
{
  "protocol_version": "1.0",
  "type": "reflection_requested",
  "message_id": "req_reflection",
  "reply_to": null,
  "game_id": "game_001",
  "agent_id": "agent_A",
  "timestamp_utc": "2026-11-23T02:00:00Z",
  "payload": {
    "source_game_id": "game_001",
    "expected_memory_version": 3,
    "update_window_id": "game001_memory",
    "deadline_at": "2026-11-23T02:01:00Z",
    "current_memory": {
      "generalized_memory": "Request evidence before committing to a vote.",
      "opponent_impressions": []
    },
    "feedback": {
      "own_role": "villager",
      "team_result": "win",
      "public_events": [
        {
          "event_id": "evt_001",
          "type": "public_message",
          "actor_id": "agent_B",
          "message": "Please explain the evidence for your accusation."
        }
      ],
      "own_private_results": [],
      "own_actions": [
        {
          "type": "vote",
          "target_id": "agent_C"
        }
      ],
      "role_disclosures": []
    },
    "requirements": {
      "required_sections": [
        "generalized_memory",
        "opponent_impressions"
      ],
      "max_rendered_utf8_bytes": 16384,
      "opponent_ids": [
        "agent_B",
        "agent_C",
        "agent_D",
        "agent_E",
        "agent_F"
      ]
    }
  }
}
```

### `memory_update_submitted`

**Output: proposed complete replacement**

```json
{
  "protocol_version": "1.0",
  "type": "memory_update_submitted",
  "message_id": "res_memory",
  "reply_to": "req_reflection",
  "game_id": "game_001",
  "agent_id": "agent_A",
  "timestamp_utc": "2026-11-23T02:00:00Z",
  "payload": {
    "source_game_id": "game_001",
    "update_window_id": "game001_memory",
    "expected_memory_version": 3,
    "generalized_memory": "Request supporting evidence before voting. One successful team result does not establish that every accusation was correct.",
    "opponent_impressions": [
      {
        "agent_id": "agent_B",
        "impression": "Requested evidence before supporting an accusation.",
        "evidence_game_ids": [
          "game_001"
        ],
        "evidence_event_ids": [
          "evt_001"
        ],
        "confidence": "low",
        "alternative_explanation": "The behavior may be specific to this game rather than a stable style."
      }
    ]
  }
}
```

The backend renders a private skill.md with `## 1. Generalized Memory` and `## 2. Opponent Impressions`. The payload replaces both sections completely; it is not an append patch. Roles are reassigned across games, so old roles must not become current facts. Opponent entries use stable internal IDs.

### `memory_update_receipt`

**Input: update accepted**

```json
{
  "protocol_version": "1.0",
  "type": "memory_update_receipt",
  "message_id": "receipt_memory",
  "reply_to": "res_memory",
  "game_id": "game_001",
  "agent_id": "agent_A",
  "timestamp_utc": "2026-11-23T02:00:00Z",
  "payload": {
    "accepted": true,
    "source_game_id": "game_001",
    "memory_version": 4,
    "strategy_version": "G1",
    "error": null
  }
}
```

**Output:** None. Load this version next game.

**Alternative input: version conflict**

```json
{
  "protocol_version": "1.0",
  "type": "memory_update_receipt",
  "message_id": "receipt_conflict",
  "reply_to": "res_memory",
  "game_id": "game_001",
  "agent_id": "agent_A",
  "timestamp_utc": "2026-11-23T02:00:00Z",
  "payload": {
    "accepted": false,
    "source_game_id": "game_001",
    "memory_version": 4,
    "strategy_version": "G1",
    "error": {
      "code": "MEMORY_VERSION_CONFLICT",
      "message": "The expected memory version is no longer current.",
      "retryable": false
    }
  }
}
```

**Output:** None automatically. Reconcile against backend state before a new authorized reflection task. Other rejection codes: `MEMORY_TOO_LARGE`, `INVALID_MEMORY_SCHEMA`, `UPDATES_DISABLED`, `MEMORY_ALREADY_UPDATED`, `UPDATE_WINDOW_CLOSED`. Accept one update per agent/source game; identical retries return the original receipt. Timeout preserves old memory. Next game starts after all updates finish or the common deadline expires.

## 12. Isolated belief measurement

### `belief_probe_requested`

The probe runs in a forked call using the agent's permitted role/context and frozen memory. Its response is discarded from playing context. Other players do not receive it.

**Input: probe request**

```json
{
  "protocol_version": "1.0",
  "type": "belief_probe_requested",
  "message_id": "req_probe",
  "reply_to": null,
  "game_id": "game_001",
  "agent_id": "agent_A",
  "timestamp_utc": "2026-11-23T02:00:00Z",
  "payload": {
    "probe_id": "probe001",
    "observation_id": "obs_discuss",
    "trigger_event_id": "evt_001",
    "measurement_point": "after_public_message",
    "targets": [
      "agent_B",
      "agent_C",
      "agent_D",
      "agent_E",
      "agent_F"
    ],
    "observation": {
      "self": {
        "agent_id": "agent_A",
        "role": "villager",
        "alive": true
      },
      "living_players": [
        "agent_A",
        "agent_B",
        "agent_C",
        "agent_D",
        "agent_E",
        "agent_F"
      ],
      "public_history": [
        {
          "event_id": "evt_001",
          "type": "public_message",
          "actor_id": "agent_B",
          "message": "Please explain the evidence for your accusation."
        }
      ],
      "private_facts": [],
      "memory_version": 3,
      "strategy_version": "G0"
    }
  }
}
```

### `belief_probe_result`

**Output: reported probabilities**

```json
{
  "protocol_version": "1.0",
  "type": "belief_probe_result",
  "message_id": "res_probe",
  "reply_to": "req_probe",
  "game_id": "game_001",
  "agent_id": "agent_A",
  "timestamp_utc": "2026-11-23T02:00:00Z",
  "payload": {
    "probe_id": "probe001",
    "observation_id": "obs_discuss",
    "probabilities": [
      {
        "target_id": "agent_B",
        "p_mafia": 0.25
      },
      {
        "target_id": "agent_C",
        "p_mafia": 0.6
      },
      {
        "target_id": "agent_D",
        "p_mafia": 0.35
      },
      {
        "target_id": "agent_E",
        "p_mafia": 0.4
      },
      {
        "target_id": "agent_F",
        "p_mafia": 0.4
      }
    ]
  }
}
```

Each target appears exactly once. Probabilities must be finite and within [0,1]. These are marginal probabilities, not a distribution summing to 1; do not silently normalize them. They are elicited reports, not direct access to internal mental states. No extra receipt is needed.

## 13. Pre-message influence prediction

### `influence_prediction_requested`

Hold the exact candidate message unpublished, ask the speaker for a prediction in a separate call, record it, then publish. Do not expose recipient private information or measured beliefs to the speaker. This example predicts a listener's response; the prediction is not a deception label.

**Input: prediction request**

```json
{
  "protocol_version": "1.0",
  "type": "influence_prediction_requested",
  "message_id": "req_prediction",
  "reply_to": null,
  "game_id": "game_001",
  "agent_id": "agent_A",
  "timestamp_utc": "2026-11-23T02:00:00Z",
  "payload": {
    "prediction_id": "prediction001",
    "observation_id": "obs_discuss",
    "candidate_message_id": "candidate001",
    "candidate_message": "B has not explained the change in the story. Please reconsider whether B is trustworthy.",
    "recipient_id": "agent_C",
    "targets": [
      "agent_B"
    ],
    "observation": {
      "self": {
        "agent_id": "agent_A",
        "role": "villager",
        "alive": true
      },
      "living_players": [
        "agent_A",
        "agent_B",
        "agent_C",
        "agent_D",
        "agent_E",
        "agent_F"
      ],
      "public_history": [
        {
          "event_id": "evt_001",
          "type": "public_message",
          "actor_id": "agent_B",
          "message": "Please explain the evidence for your accusation."
        }
      ],
      "private_facts": [],
      "memory_version": 3,
      "strategy_version": "G0"
    }
  }
}
```

### `influence_prediction_result`

**Output: precommitted prediction**

```json
{
  "protocol_version": "1.0",
  "type": "influence_prediction_result",
  "message_id": "res_prediction",
  "reply_to": "req_prediction",
  "game_id": "game_001",
  "agent_id": "agent_A",
  "timestamp_utc": "2026-11-23T02:00:00Z",
  "payload": {
    "prediction_id": "prediction001",
    "observation_id": "obs_discuss",
    "candidate_message_id": "candidate001",
    "recipient_id": "agent_C",
    "predicted_shifts": [
      {
        "target_id": "agent_B",
        "predicted_delta_p_mafia": 0.15
      }
    ],
    "declared_goal": {
      "target_id": "agent_B",
      "desired_belief": "increase_mafia_suspicion"
    }
  }
}
```

Each requested target appears once, with a finite shift in [-1,1]. `declared_goal` may be null; otherwise desired belief is `increase_mafia_suspicion` or `decrease_mafia_suspicion`. Log before publication and never retrofit the prediction after a response. Prediction failure is logged; missing predictions stay missing. Observed shifts come from separate recipient probes. No extra receipt is needed.

## 14. Request cancellation

### `request_cancelled`

**Input: cancel outstanding request**

```json
{
  "protocol_version": "1.0",
  "type": "request_cancelled",
  "message_id": "msg_cancel",
  "reply_to": "req_discuss",
  "game_id": "game_001",
  "agent_id": "agent_A",
  "timestamp_utc": "2026-11-23T02:00:00Z",
  "payload": {
    "request_id": "req_discuss",
    "reason": "window_expired"
  }
}
```

**Output:** None. Cancel work where supported and discard late responses. Over HTTP, cancellation requires a separate concurrent request; in-process runners use cancellation tokens. Backend transactions decide deadline races. Cancellation cannot undo an accepted, resolved action.

## 15. Runner failure

### `request_failed`

Generated by the runner rather than a game action. It can respond to any model task. It does not consume a game opportunity or update memory.

**Input received by the agent**

```json
{
  "protocol_version": "1.0",
  "type": "action_requested",
  "message_id": "req_failure",
  "reply_to": null,
  "game_id": "game_001",
  "agent_id": "agent_A",
  "timestamp_utc": "2026-11-23T02:00:00Z",
  "payload": {
    "observation_id": "obs_failure",
    "window_id": "day1_round3",
    "phase": "day_discussion",
    "day": 1,
    "discussion_round": 3,
    "allowed_actions": [
      "speak",
      "pass"
    ],
    "legal_targets": [],
    "remaining_speeches_today": 2,
    "deadline_at": "2026-11-23T02:00:30Z",
    "observation": {
      "self": {
        "agent_id": "agent_A",
        "role": "villager",
        "alive": true
      },
      "living_players": [
        "agent_A",
        "agent_B",
        "agent_C",
        "agent_D",
        "agent_E",
        "agent_F"
      ],
      "public_history": [
        {
          "event_id": "evt_001",
          "type": "public_message",
          "actor_id": "agent_B",
          "message": "Please explain the evidence for your accusation."
        }
      ],
      "private_facts": [],
      "memory_version": 3,
      "strategy_version": "G0"
    }
  }
}
```

**Output: model timeout**

```json
{
  "protocol_version": "1.0",
  "type": "request_failed",
  "message_id": "res_failure",
  "reply_to": "req_failure",
  "game_id": "game_001",
  "agent_id": "agent_A",
  "timestamp_utc": "2026-11-23T02:00:00Z",
  "payload": {
    "request_type": "action_requested",
    "error": {
      "code": "MODEL_TIMEOUT",
      "message": "The model did not respond before its configured timeout.",
      "retryable": true
    }
  }
}
```

Failure codes: `MODEL_TIMEOUT`, `PROVIDER_UNAVAILABLE`, `RATE_LIMITED`, `INVALID_MODEL_OUTPUT`, `INTERNAL_ERROR`. Retryability is advisory; deadlines and budgets still apply. After a recorded execution failure, any authorized new execution gets a new request ID, keeping the same window/snapshot and deadline. Transport retries of an identical request reuse the original result and must not rerun the model. Never include credentials or hidden truth in error strings.

## 16. Visibility and invariants

| Information | Own playing agent | Other playing agents | Authorized spectator/evaluator |
|---|---|---|---|
| Published dialogue and permitted public outcomes | Yes | Yes | Yes |
| Unpublished concurrent submissions | Own only | No | Yes |
| Role and private results | Own permitted facts | Only if rules disclose them | Yes |
| Private memory | Own only | No | Yes |
| Strategy summary | Own output only | No | Yes |
| Belief reports and influence predictions | Isolated probe only; no feedback to playing context | No | Yes |
| Provider-exposed reasoning, if captured | No automatic feedback | No | Configured privileged consumers only |

- Build player observations and spectator events separately. Never send full internal state and ask players to ignore hidden fields.
- Dead players receive no gameplay requests. Whether already-scheduled night actions resolve after death is a rule to freeze before experiments.
- Votes remain private until the window closes. Discussion batches and night outcomes resolve atomically.
- Backend validates identity, role, phase, snapshot/window, deadline, legal targets, length, and one accepted action per opportunity.
- Runner constructs/verifies IDs, timestamps, and model configuration. Reject unknown JSON fields and whitespace-only required text.
- Record model/provider settings, prompt hash, memory/strategy versions, token usage, latency, failures, and event links in private logs. Do not trust model-generated telemetry.
- Native reasoning, when exposed by the provider and enabled by the experiment, is optional private telemetry. No extra gameplay message is required, and it is not proof of intention. A short strategy summary remains a self-report.
- Reset playing contexts between games and load only permitted private memory. Frozen evaluation disables updates.
- Deliver notifications in order per agent. Each actionable request includes an authoritative snapshot; recover backend-authoritative state before resuming after disconnect.
- Replay forks use separate game/branch IDs and cannot update training memory unless explicitly authorized by the experiment.

## 17. Configuration choices to freeze

1. The latest team design allows all six agents to adapt; the repo's primary study currently specifies one learning Mafia agent and frozen opponents. This protocol supports both with per-agent memory update settings.
2. Stable internal identities versus randomized display names/seats: explicitly decide whether aliases are linked across games. Avoid accidentally providing an identity mapping unavailable in the intended experiment.
3. Freeze initial phase, victory conditions, day vote ties, Mafia proposal resolution, night simultaneity, max duration, and role disclosure before collecting results. Sample rule defaults here are proposals.
4. Six-player configuration: two Mafia, one Detective, three Villagers. Pilot for balance.
5. Freeze summary, reasoning, and probe settings within each experimental comparison. Showcase settings may differ only as a clearly labeled separate mode.

## 18. Repository references

- [PLAN.md](https://github.com/nandininarvekar/Learned-Deception/blob/main/PLAN.md): information boundaries, adaptation, and event architecture.
- [CLAUDE.md](https://github.com/nandininarvekar/Learned-Deception/blob/main/CLAUDE.md): planned Observation/Action models, `act`, `probe_beliefs`, `predict_shift`, and showcase/experiment separation.

This standalone proposal does not modify the repository README or claim that these interfaces already exist.
