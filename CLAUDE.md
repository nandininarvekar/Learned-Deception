# CLAUDE.md — Learned-Deception (BU Agentic AI Fall 2026, research track)

## Project in one line
Do LLM Mafia agents get better at *deceptive influence* (not just wins) through experience, do they predict their own influence, and does it transfer to unseen opponents?

Source docs: `project-handout.txt` (course rules), `PLAN.md` (protocol — authoritative), `Agentic AI Final Project.docx` (team literature survey), `README.md` (placeholder; team will rewrite it themselves — do NOT generate or edit README content with AI, per handout).

## Hard facts
- Final ZIP due **Sun Dec 13, 2026, 23:59 ET**. Presentation in the final two weeks of class (8 min + 5 min Q&A, live demo expected).
- Graded on **delta**: what we built/measured beyond existing work. Every claim must point to code + results.
- Team of 3. No code exists yet (as of 2026-11-22).

## Decisions made
1. **Conditions follow PLAN.md (C0–C4)**, not the docx's A–D. Core minimum: C0 static, C2 reflection, plus a shuffled-memory control. C1/C3/C4 if time allows.
2. **Own small game engine** — we do not reuse Mini-Mafia/MafiaScope code. External papers are cited as related work and design inspiration only; no license/code audit needed. Still apply their known findings: randomize speaking order and player names (Mini-Mafia: last speaker advantages Mafia by about 6 points, and names bias outcomes).
3. **Game size is configurable**; primary = 6 players (2 Mafia, 1 Detective, 3 Villagers), one Mafia seat is the learning agent, everyone else frozen. A 4-player mode (1 Mafia, 1 Detective, 2 Villagers) is used for fast smoke tests.
4. **LLM backend strategy:** all calls go through one `LLMClient` adapter, so changing backend is a config change.
   1. **Unit tests:** fake/mock client (deterministic, free).
   2. **Smoke tests:** Claude Code CLI (`claude -p --model haiku`) only to check the pipeline end to end. **No results come from CLI runs** (hidden harness prompt, no temperature control, unpinned versions).
   3. **Pilot:** the main OpenRouter model (a small Qwen, e.g. Qwen3.6 27B or Flash), 5–10 games. Tune prompts and parsing on *this* model, measure tokens per call, size the study, then **freeze prompts**.
   4. **All experiments (E0–E5):** one OpenRouter Qwen model for every seat. Pin the provider (fallbacks off), use a fixed temperature, turn off thinking mode or cap output tokens, enable prompt caching, and set a spending cap.
   5. **Held-out opponent family (E3):** a different open model family through OpenRouter (Llama/Mistral/Gemma), same API.
   6. **Optional frontier check:** a small frozen evaluation against Claude Haiku / GPT mini *through OpenRouter* (not the CLIs).
   - Estimated cost: about $5–35 for ~30k calls (prices as of 2026-11; check live before running).
   - Never mix backends within a comparison. Log model, provider, temperature and prompt hash in every event. If prompts change after the pilot, rerun the affected conditions.
   - Throughput: cache by prompt hash, probe only after Mafia messages and only in eval/fork games, rule-based night actions for frozen opponents, 3–4 games in parallel behind a rate limiter with backoff, resumable runs (one JSONL per finished game).
4b. **Reasoning / CoT logging (decide before the pilot; it must not change afterwards):**
   - Qwen **thinking mode ON for the learning Mafia agent in every condition**, OFF for frozen opponents. Turning it on or off changes play, so it is a confound if it differs between conditions.
   - Store the raw `reasoning` field returned by OpenRouter in a private event (`private_payload_ref`). It must never be shown to other agents, and is visible only to the offline evaluator and the reasoning-aware monitor.
   - Extra cost is about $2–11 (Mafia agent ≈ 1/6 of calls, ~1.5k reasoning tokens each). The "turn off thinking" rule in 4.4 applies to everyone else.
   - Never tell agents their reasoning is monitored (unless that is a deliberate condition; see *Noticing the Watcher*).
   - This enables E6 **offline, from existing logs, with no new games**: M0 (public transcript only) vs M2 (transcript + reasoning), evaluated on early vs late strategy generations. It also enables an intention–behavior divergence metric (reasoning plan vs actual action).
   - Reasoning traces are *reports*. A mismatch between reasoning and action is not proof of deliberate concealment.
   - E6 stays a stretch goal; only the logging is core.
   - Exception: showcase demo games (decision 8) give thoughts to all players; they are never used in statistics.
5. **Scope**: see "Scope tiers" below; that is the single source of truth for what is core, stretch or out.
6. README is written last, by the team.
7. **Ontology (what we include now) = a lightweight 5-layer typed event schema, not a graph database or claim extractor.** Every event is tagged with exactly one layer so the dashboard and analysis can separate them:

   | Layer | Meaning | Event types (source) | Visible to |
   |---|---|---|---|
   | KNOWS | Ground truth an agent has access to | `role_assigned`, `night_result`, `investigation_result` (engine) | that agent + privileged spectator |
   | BELIEVES | Reported p(player is Mafia) | `belief_probe` (separate probe call) | privileged spectator only |
   | SAYS | Public statements | `public_message` (engine) | everyone |
   | WANTS-OTHERS-TO-BELIEVE | Intended effect before speaking | `pre_message_prediction` (+ optional `declared_goal`: target and desired belief) | privileged spectator only |
   | DOES | Actions | `vote`, `night_kill`, `investigate` (engine) | per game rules |
   | (THINKS) | Raw reasoning / private thought | `reasoning` (Mafia agent always; all players in showcase mode) | privileged spectator only |

   Plus two rule-derived (non-LLM) checks that use only the engine's ground truth:
   - `literal_truth` of role claims and claimed investigation results;
   - `speaker_knows_contradiction`: did the speaker's KNOWS layer contradict what they SAID?
   
   **Stretch:** LLM claim extraction into propositions, `CONTRADICTS`/`SUPPORTED_BY` edges, the full claim/provenance graph view, and M1/M3 structured monitors.
8. **Demo "showcase mode"** (separate from experiment games, clearly labelled, never used in statistics):
   - Belief probe for **every living player after every public message**, which drives the live suspicion graph.
   - **Every player** emits a short private thought (Qwen thinking on, or a 1–2 sentence `private_thought` field) so the demo can show what each player is thinking.
   - Cost ≈ 200–250 extra calls per game; budget for ~5 showcase games (cents to ~$1).
   - Pre-record 2–3 showcase games as the fallback replay; run one live in the presentation.

## Minimum study we commit to
- E0: engine validation (20+ games, no info leakage).
- E1: C0 vs C2 vs shuffled-memory: ≥3 learning runs × ~20 games, then frozen eval (G0 vs Gk).
- E2: pre-message prediction vs observed recipient belief shift.
- E5: ~30 snapshots × forks (original / neutral / silence) → controlled belief + wrongful-vote effect.
- E3 (light): frozen checkpoint vs held-out opponent family, with static baseline on the same pool.
- Probe stability: re-probe ~20 frozen states 5× each; report variance (validates every belief result).
- Equal-length summary control in E1: separates reflection from "more context".
- E4-light tactic labels: an offline LLM judge over Mafia messages + a ~60-message hand-checked sample → tactic mix by generation.
- Naive-persona mini-study: ~10 games where opponents are told one player is naive (or that they are naive) vs ~10 games without.
- Demo: live table, transcript, animated "who suspects whom" graph, per-player thought panel, snapshot fork comparison.

## Scope tiers (single source of truth)
| Tier | Items |
|---|---|
| **Core** | E0, E1 (C0, C2, shuffled memory, equal-length summary control), E2, E5, E3-light, probe stability, 5-layer ontology schema + rule-based truth/contradiction checks, reasoning logging for the Mafia agent, showcase demo |
| **Core-light (cheap, offline or few games)** | E4 tactic labels; naive-persona mini-study; **misleading-truth analysis** (messages with `literal_truth = true` that still cause a wrong-direction belief shift, reported separately from lies); **strategic silence & timing** (a `pass` action, effect of speaking position from randomized order, silence arm already in E5 forks); **extra dashboard views** (strategy-learning timeline, simple claim graph from rule-based checks, monitor view once E6 exists) |
| **Stretch (only after core results exist)** | C1/C3/C4 conditions; E6 monitors M0/M2, then M1/M3; LLM claim extraction + full provenance graph; evolving Detective; honesty- vs deception-guided reflection; strategy update admission/rollback; two learning Mafia agents; E7 two-sided learning; E8 robustness sweeps; human dataset baseline |
| **Out of scope** | 8–11 player games, weight fine-tuning, human-player studies, graph database / formal ontology |

## Shared contracts (agree on these FIRST — this is what keeps the three workstreams independent)
- `Event` schema (PLAN.md §12.1): event_id, game_id, round, phase, actor_id, event_type, public_payload, private_payload_ref, strategy_version, model_id, prompt_hash, memory_episode_ids, timestamp.
- `Observation` (what an agent is allowed to see) and `Action` (speak / vote / night_kill / investigate) Pydantic models.
- `Agent` interface: `act(observation) -> Action`, `probe_beliefs(observation) -> {player: p_mafia}`, `predict_shift(observation, message, recipient) -> {player: Δp}`.
- `LLMClient` interface: `complete(system, prompt, model) -> str`.
- Storage: JSONL per game in `runs/<experiment>/<game_id>.jsonl` + `snapshot_<id>.json`.
- A hand-written `fixtures/sample_game.jsonl` so analysis/UI can start before the engine works.

## Task list (three workstreams, minimal cross-dependency)

### Shared (all three, do first, ~1 day)
- [ ] Agree and commit the contracts above (`src/mafia_lab/schema.py`) and the sample fixture.
- [ ] Repo skeleton, `pyproject.toml`, `.gitignore` (exclude `.env`, `runs/`), test setup.
- [ ] Write the pre-registration (`docs/protocol.md`): primary outcomes, conditions, opponent splits, sample sizes.

### Person A — Game engine & replay (depends only on schema)
- [ ] Deterministic state machine: night (kill, investigate) → day discussion → vote → elimination → win check.
- [ ] Rules config (`configs/game.yaml`): roles, turns per day, tie rule, max rounds.
- [ ] Observation builder enforcing information boundaries (PLAN §5.2).
- [ ] Randomized seating/names/speaking order from a seed.
- [ ] Event logger (JSONL) and snapshot save/load.
- [ ] Fork runner: load snapshot, substitute a message, continue N times.
- [ ] Unit tests: privacy/leakage (including: Mafia agent reasoning never appears in any observation), voting/ties, win conditions, illegal-action handling. Use a `RandomAgent` stub, so no LLM is needed.
- [ ] Batch runner: 3–4 games in parallel, one JSONL per finished game, resumable after a crash.
- [ ] Rule-based or random night actions for frozen opponents (saves LLM calls).
- [ ] Role prompts and frozen opponent personas: familiar pool + held-out pool (moved from B to balance work).
- [ ] Naive-persona prompt variant + config for the mini-study.
- [ ] Tag every engine event with its ontology layer (KNOWS / SAYS / DOES).
- [ ] Rule-based checks: `literal_truth` of role/investigation claims and `speaker_knows_contradiction` (needs a simple pattern/structured "claim" field in messages; anything unparseable → `unverifiable`).
- [ ] `pass` (stay silent) as a legal discussion action; log speaking position for every message.
- [ ] `--showcase` run mode flag: probe every living player after every message; private thoughts for all players.
- [ ] CLI: `run`, `replay`.

### Person B — Agents, LLM backend, learning, probes (depends only on schema + Agent interface)
- [ ] `LLMClient` adapters: fake/mock client (tests), Claude CLI (smoke only), OpenRouter (all results; provider pinning, temperature, max tokens). Response caching, a rate limiter with backoff, retries, and logging of tokens, latency and cost.
- [ ] Structured output parsing for actions; validity tracking.
- [ ] C0 static policy; C2 reflection (versioned `strategy_vNN` between games); shuffled-memory control; (stretch: C1, C3, C4).
- [ ] Belief probe (separate call, discarded from game context).
- [ ] Pre-message prediction probe (logged before the message is delivered).
- [ ] Probe-free control mode.
- [ ] Capture and log native reasoning for the Mafia agent (private event, never in other agents' context).
- [ ] Equal-length summary control condition (same token budget as C2, neutral non-reflective summary).
- [ ] Probe stability script: re-probe frozen states N times, output variance.
- [ ] Optional `declared_goal` in the pre-message prediction call (target and desired belief) → the WANTS layer.
- [ ] E4-light: LLM-judge tactic labelling over saved Mafia messages (moved from C to balance work). Include a `misleading_truth` label and a `silence` label.
- [ ] Prompt the Mafia agent so `pass` is a real option (not discouraged), identical across conditions.
- [ ] Showcase-mode agent behaviour: `private_thought` (or thinking) for every player; all-player probes.
- [ ] CLI: `train`, `evaluate` (freeze checkpoint, no updates).

### Person C — Analysis & demo dashboard (depends only on JSONL format; works on the fixture until real runs exist)
- [ ] Loaders: JSONL → pandas tables (messages, votes, probes, predictions, snapshots).
- [ ] Metrics: belief shift Δp, controlled message effect I(u), wrongful-vote effect, prediction error/calibration, role win rate, action validity, cost.
- [ ] Cluster bootstrap CIs (by learning run / origin snapshot).
- [ ] Figures: learning curves G0→Gk, fork effect bars, prediction calibration, cross-opponent matrix.
- [ ] Dashboard: FastAPI serving runs + React (or Streamlit if time is short), streaming events live.
- [ ] **Suspicion graph (headline demo view):** players as nodes in a circle (colour = true role, revealed only in spectator mode; greyed when dead); directed edges observer → target, thickness/colour = reported p(Mafia). Edges animate as each new probe arrives, with a timeline slider to scrub back and forth and a play button for replays.
- [ ] Optional small multiples: one p(Mafia) line chart per player over time ("how suspected is X").
- [ ] **Thought panel:** per-player cards showing the latest private thought/reasoning (THINKS), current beliefs (BELIEVES), last public message (SAYS), last action (DOES) and, for the Mafia agent, its prediction (WANTS). A layer label on each item; contradictions between KNOWS and SAYS are highlighted.
- [ ] Transcript, fork comparison view, trust labels (ground truth / reported belief / model report / estimated effect).
- [ ] Toggle between player view (public only) and spectator view (everything).
- [ ] Tactic-mix-by-generation chart (from B's E4 labels).
- [ ] Misleading-truth analysis: true statements × controlled/observed wrong-direction belief shift, shown next to lies.
- [ ] Silence & timing analysis: belief/vote effect by speaking position and of `pass`; uses E5 silence forks for the causal estimate.
- [ ] **Strategy-learning timeline view:** strategy versions G0→Gk with the reflection text diff, plus win rate, influence and tactic mix per generation.
- [ ] **Claim graph view (simple):** nodes = players + claims; edges SAID_BY / ABOUT / CONTRADICTS-KNOWLEDGE from the rule-based checks only.
- [ ] **Monitor view:** alerts per message with evidence (only if E6 is run).
- [ ] Cost/token dashboard table per condition (from the logs).
- [ ] (Stretch, E6) M0/M2 monitors run offline over the logs (moved from B), monitor precision/recall by generation (early vs late), and the intention–behavior divergence metric.
- [ ] Replay mode on a cached game (demo fallback).
- [ ] CLI: `analyze`.

### Integration & finish (all)
- [ ] End-to-end smoke: 4-player game with real LLMs → JSONL → dashboard.
- [ ] Pilot on the main OpenRouter model (5–10 games): tokens/cost/time per game, action validity, not-at-chance play → size the experiments, then freeze prompts.
- [ ] Run E0, E1 (incl. equal-length control), E2, E5, E3-light, probe stability, naive-persona mini-study, E4-light; store outputs in `results/`.
- [ ] Record 2–3 showcase games for the demo fallback.
- [ ] `DELTA.md`: what is reused vs new, with evidence links.
- [ ] Qualitative case studies linked to event IDs.
- [ ] Slides + demo script; README (team-written); ZIP with names + UIDs.

### Experiment ownership & cost sharing (each person pays about 1/3)
Everyone runs on **their own OpenRouter key** with the **same frozen config** (model, pinned provider, temperature, prompts, commit hash). Since config is identical, who ran a game is not a variable. Still log `runner_id` in every event so it can be checked.

| Experiment | Person A | Person B | Person C |
|---|---|---|---|
| Pilot (5–10 games) | runs it (shared cost is tiny) | — | — |
| E0 engine validation (20+ games) | 7 | 7 | 6–7 |
| E1 learning runs (C0, C2, shuffled) | run 1 of every condition | run 2 of every condition | run 3 of every condition |
| E1/E2 frozen eval games | game IDs ≡ 0 mod 3 | ≡ 1 mod 3 | ≡ 2 mod 3 |
| E5 snapshot forks (~30) | snapshots 1–10 | 11–20 | 21–30 |
| E3 held-out / frontier eval | 1/3 of games | 1/3 | 1/3 |
| Probe stability (~20 states × 5) | — | runs it (small) | — |
| Equal-length control learning runs | run 1 | run 2 | run 3 |
| Naive-persona mini-study (~20 games) | runs it | — | — |
| E4-light judge labelling (offline) | — | runs it (small) | — |
| E4 hand-check sample (~60 messages) | 20 | 20 | 20 |
| Showcase demo games (~5) | 2 | 2 | 1 |
| E6 monitors (stretch, offline) | — | — | runs it (monitor calls only; small) |

- Assign seeds and IDs up front in `configs/experiments/*.yaml` (a `runner:` field per run/ID range) so nobody runs the same work twice.
- Each person sets a spending cap of about $15 on their key. Report per-person spend from the cost logs; rebalance the remaining ID ranges if someone is ahead.
- Results land in `runs/<experiment>/<runner_id>/` and are merged by the analysis loaders. Don't edit someone else's run files.
- Alternative if preferred: one shared team key that everyone pays into. Same split, simpler billing.

Integration points (the only cross-person dependencies): A and B meet at the `Agent` interface (A tests with RandomAgent, B tests agents on hand-built Observations); A/B and C meet at the JSONL schema (C uses the fixture).

## Working rules for Claude in this repo
- Never present expected or illustrative numbers as results. Label everything shown as an observation, a model report, ground truth or an estimated effect.
- Belief probes and reasoning are *reports*, not internal thoughts.
- Never let privileged state leak into an agent prompt; keep a leakage test for every new observation field.
- Keep game rules deterministic in Python; LLMs never decide rules.
- Don't write README content.
- Mafia agent reasoning is privileged data: add a leakage test that it never reaches any agent's prompt.
- Control length and style when comparing messages or monitors (LLM messages are long and easy to classify; *Time to Talk*). Include votes in monitor inputs (*Finding Deceivers*: detectors rely heavily on voting patterns).
