# PLAN.md — Learning to Mislead: Experience, Deception, and Belief Manipulation in LLM Mafia

> **Status:** Research and implementation plan, not completed results.  
> **Course:** Boston University Agentic AI, Fall 2026 — final project, research track.  
> **Research theme:** *Do agents learn to deceive better through experience, and why does that matter as agents become more autonomous?*  
> **Constraint:** Mafia remains the experimental environment.  
> **Grading principle supplied by instructor:** Existing models, frameworks, and research projects may be used; evaluation is based on the **delta**—what this project adds, changes, or discovers, supported by evidence.  
> **Living document:** Every hypothesis, proposed metric, and milestone is subject to pilot validation. Do not present expected outcomes as findings.

---

## 1. Executive research proposal

**Central question:** When a Mafia-playing language-model agent receives experience, persistent memory, and opportunities to revise its strategy, does it become more effective at changing other players' beliefs? If so, is that due to better predictions of opponents, greater narrative consistency, memorized tactics, or opponent-specific exploitation? Do the adaptations transfer to unfamiliar opponents and remain observable to monitors?

**Proposed thesis:** Game wins alone are inadequate evidence of improved deception. The project will measure the *mechanism* of deceptive influence through longitudinal learning trajectories, pre-message predictions, controlled belief probes, fixed-state counterfactual replays, and cross-opponent tests.

**Primary study:** Compare fixed, episodic-memory, reflection, and structured-memory-plus-reflection Mafia agents; evaluate on frozen unseen games and opponents. **Secondary studies:** claim/evidence graph, truthful manipulation, asymmetric learning by Mafia and Villagers, and monitoring robustness. **Demo:** synchronized live Mafia table, dialogue feed, suspicion network, agent state inspector, adaptation timeline, and counterfactual replay viewer.

### 1.1 Four research deliverables to prioritize

1. **Longitudinal adaptation study** — Does deception effectiveness improve across game generations, beyond improvements in rule compliance or generic play?
2. **Strategic-awareness study** — Does the agent predict the belief shifts it creates, or does it persuade without accurate explicit opponent modeling?
3. **Generalization study** — Do learned strategies transfer to unfamiliar opponent models, prompts, and play styles, after controlling for opponent difficulty?
4. **Causal and explainable instrumentation** — Reproducible state snapshots, matched message interventions, logged memory provenance, and typed knowledge–claim–belief relationships.

A fifth, stretch scientific question evaluates **monitor robustness to newly learned deceptive behavior**. The visualization is a product deliverable and research inspection tool; it is **not** asserted to be novel on its own.

## 2. Existing work, gaps, and what we will add

These are *candidate gaps*, not proven claims of novelty. Before final submission, verify exact papers, results, code licenses, and comparisons against contemporaneous work. Author-stated limitations and our inferred limitations must be labeled separately.

| Relevant work | Established/claimed scope | Inferred gap motivating our project | Proposed new delta | Verification status |
|---|---|---|---|---|
| Costa & Vicente, *Deceive, Detect, and Disclose: Large Language Models Play Mini-Mafia* | Simplified Mafia; role-specific deception/detection/disclosure modeling and human comparisons | Aggregate outcomes do not isolate the causal mechanism of persuasive messages or learning across games | Longitudinal mechanism-level influence measures | Paper linked in survey; exact numerical results require full-text confirmation |
| *MafiaScope* | Time-resolved belief probes, belief trajectories, counterfactuals, viewer | Belief visualization alone does not explain improvement through explicit experience interventions | Learning-condition ablations and cross-opponent influence measurement | Full implementation, terms and overlap to inspect before reuse |
| *Evolving Deception: When Agents Evolve, Deception Wins* | Self-evolution and competitive deception in bidding tasks | Different incentives and interaction structure from Mafia | Isolate strategy learning vs general gameplay; role-aware behavioral shifts | Verify reported experiments and conclusions from full text |
| *Trust, Lies, and Long Memories* | Memory, reputation and strategic trust/betrayal in multi-round Avalon | Memory and repeated interaction may be intertwined; different game | Memory-only vs reflection and two-sided learning in Mafia | Verify exact design and figures |
| *Do LLMs Trust the Accuser or the Accusation?* | Recipient-side belief shifts from social-deduction accusations | Doesn't alone establish how an adaptive speaker predicts/selects its messages | Speaker-side prediction, message selection, and causal influence | Verify dataset, controls, and metrics |
| *DeceptGuard* and *Constitutional Black-Box Monitoring for Scheming* | Behavioral/reasoning-aware monitoring of deceptive or scheming agents | Robustness of fixed monitors to freshly adapted Mafia strategies may remain underexplored | Early-generation vs later-generation and new-opponent monitor transfer | Cross-check overlap and validity before claiming novelty |
| *Finding Deceivers in Social Context…*; *Putting the Con in Context* | Mafia deception detection and human Mafia-language data | Language shortcuts vs actual evidence, transfer to LLM agents | Style-preserving evidence interventions and optional human baseline | Review source datasets/licenses |
| *Time to Talk* | When-to-speak and what-to-say in social deduction | Timing as causal factor in evolving strategic communication | Controlled speaking-order/silence analysis (stretch) | Verify primary source and code |
| *Agent-Mafia* | Larger Mafia simulation/logging | Logging and gameplay not equivalent to causal adaptation analysis | Reusable infrastructure rather than reinventing engine | Inspect repository, if available |

**Existing-work accounting:** If an engine, agent harness, game rules, or belief-viewer component is reused, log its repository/version, license, files copied, original function, modifications, and measurements newly added. Maintain a `DELTA.md` or final report section with before/after evidence.

### 2.1 Contributions register — all ten previously proposed ideas

| ID | Contribution | Classification | Priority | How to demonstrate the *new* delta |
|---|---|---|---|---|
| C01 | Experience-driven deception in Mafia | Main research | **P0** | Learning curves and frozen evaluation vs static controls |
| C02 | Experience and explicit Theory of Mind / influence prediction | Main research | **P0** | Precommitted predicted versus observed recipient belief changes; calibration |
| C03 | Generalizable vs opponent-specific deception | Main research | **P0** | Held-out cross-play, matched strength baselines, interaction effects |
| C04 | Episodic memory vs reflection vs structured experience | Causal ablation | **P0** | Equal-context and shuffled-memory controls, strategy version traces |
| C05 | Evolution of tactics: fabrication, framing, silence, trust-building | Behavioral mechanism | P1 | Blind annotated message categories and transitions over generations |
| C06 | Causal attribution of deceptive influence | Main methodological research | **P0** | Paired fixed-state replays with alternative messages and confidence intervals |
| C07 | Adaptation vs monitor reliability | Secondary research | P1/P2 | Frozen monitor evaluated on later-generation / cross-model strategy shifts |
| C08 | Knowledge–claim–belief–action provenance graph | Engineering + possible evaluation methodology | P1 | Compare auditing/contradiction retrieval against unstructured logs at equal info budget |
| C09 | Asymmetric effect of memory for Mafia vs Villagers | Additional research | P2 | 2×2 learning assignment factorial design |
| C10 | Live research observatory dashboard | Engineering/demonstration | P1 | Functional event-linked replay and examples of audited causal traces; no unsupported novelty claim |

**Avoid the trap:** A list of ten ideas is not ten contributions. The final paper should claim only completed, properly evaluated items.

---

## 3. Research questions, hypotheses, and disconfirming evidence

### RQ1 — Does experience improve deception specifically?
- **H1:** An adapting Mafia agent increases controlled deceptive influence relative to its own initial strategy and a time-matched static agent.
- **Null/disconfirming:** No reliable improvement; apparent win gains disappear after controlling for recipient strength, game state, speaking order, or action validity.
- **Competing explanation:** More context, outcome leakage, rule fluency, longer messages, or easier opponents.

### RQ2 — Does influence improvement imply an accurate opponent model?
- **H2:** Accuracy/calibration of *pre-message* recipient-belief predictions improves with adaptation.
- **Possible counterfinding:** Influence improves while prediction quality does not. This is informative, not project failure.
- **Critical caution:** Elicited beliefs and plans are reports, not direct access to internal thoughts.

### RQ3 — Is learned deception general or opponent-specific?
- **H3:** Improvement against training opponents differs from improvement against unseen opponents; quantify magnitude and direction without assuming overfitting.
- **Confound:** Unseen opponents may inherently be more capable; compare to fixed strategies on the **same** pools.

### RQ4 — What changes in deceptive communication?
- **Exploratory H4:** Adaptive agents change the balance of outright falsehood, selective truthful framing, insinuation, omitted evidence, strategic silence, and reputation management.
- **Caution:** No contradiction or a persuasive outcome alone proves deliberate deception. Treat intent evidence and outcome separately.

### RQ5 — Does monitoring degrade as strategies adapt?
- **Exploratory H5:** Monitors trained or calibrated on early behavior may be less robust on later behavior, especially indirect manipulation.
- **Confounds:** Style drift, class prevalence, model/domain shift, unequal monitor access, and low-quality labels.

### RQ6 — Who benefits from memory?
- **Stretch H6:** Mafia and Villager memory have different effects on persuasion and detection when manipulated independently.

---

## 4. Operational definitions and measures

### 4.1 Distinguish the following phenomena

1. **Objective falsehood:** Statement contradicted by the authoritative game state.
2. **Knowledge contradiction:** Statement contradicted by information *demonstrably available* to the speaker before utterance.
3. **Explicit deceptive objective:** Agent precommits to a desired misleading belief/decision, or the experiment assigns a deceptive message objective.
4. **Misleading truth:** Literally true statement or omission with a controlled misleading objective and measurable misleading recipient interpretation.
5. **Persuasion:** A measurable change in another player's reported suspicion, vote, or decision following a message.
6. **Deceptive influence:** Persuasion toward an incorrect role inference, attributable to an intervention against a defined comparison; the operational label should specify intended target and objective.
7. **Strategic awareness:** Accuracy of the agent's prediction of a recipient's response made **before** the message is delivered.
8. **Self-evolution:** A versioned, persistent strategy revision based on previous games. Retrieval-only memory is **not** self-evolution.

### 4.2 Primary estimands

For a listener `L`, target `T`, game history `H`, and message `u`:

- **Reported belief shift:** `Δp = p_L(T=mafia | H,u) − p_L(T=mafia | H)`. This is observational and can be confounded by concurrent events.
- **Controlled message effect:** `I(u) = E[p_L(T=mafia) | do(u), snapshot H] − E[p_L(T=mafia) | do(u_control), snapshot H]`. Estimate via repeated, randomized, matched snapshot continuations. Avoid claiming an intervention perfectly identifies real-world causal effects.
- **Targeted wrongful-vote effect:** change in probability of voting for an innocent target under the same controlled replay.
- **Prediction error:** `abs(predicted_Δp − observed_Δp)`; also use squared error/calibration if producing probabilities.
- **Cross-opponent transfer gap:** `(adapted − static improvement on familiar pool) − (adapted − static improvement on held-out pool)`; interpret alongside uncertainty and difficulty-adjusted controls.

### 4.3 Secondary metrics

| Metric | Definition / controls |
|---|---|
| Role-specific win rate | Wins per evaluated game with matched seats, roles and legal action rules |
| Action validity | Fraction of valid structured actions; model/tool retries logged |
| Falsehood frequency | Expert-reviewed or rule-verified falsehoods per eligible claim; separate ambiguous cases |
| Narrative consistency | Contradictions per claim and whether a previously stated claim was in context at that time |
| Recipient belief quality | Calibration/Brier score on hidden role assignments, stratified by role |
| Strategy diversity | Distribution of pre-registered message categories with coder reliability |
| Monitor quality | Precision, recall, PR-AUC, calibration by deception subtype and generation |
| Resource use | Tokens, cost, latency, retries, failed calls per game/condition |
| Elicitation effect | No-probe vs probe-control outcome differences |

Do not report a detector's accuracy without class balance, target definition, accessible evidence, and uncertainty intervals.

---

## 5. Mafia specification and reproducibility

### 5.1 Initial environment

Proposed **six-player** extended Mafia: 2 Mafia, 1 Detective, 3 Villagers. This is a design option—not an existing paper's required configuration. To reduce multi-Mafia coordination confounds in the first experiment, designate one Mafia player as evolving study subject and keep the other fixed; also test a four-player Mini-Mafia-compatible mode for benchmark validation.

**Define before data collection:** night phase actions (Mafia choose victim, Detective investigates), role information, order of night results, day discussion turns, candidate nominations, simultaneous or sequential voting, tie-break rule, eliminated-player silence, win conditions, illegal-action handling, maximum rounds, and whether role-claims are permitted. Use a deterministic rules engine with auditable transitions; no LLM should be allowed to invent or execute game rules.

### 5.2 Information access and fair play

| Actor | Receives | Must not receive |
|---|---|---|
| Mafia player | Own role, teammate identity if rules allow, legal private night actions, public history, own memory | Detective's hidden result unless announced; other players' private belief probes |
| Detective | Own role, private results from completed investigations, public history, own allowed memory | Mafia identities beyond investigated results; other agents' private prompts |
| Villager | Own role, public history, own memory | Hidden roles, private night actions, privileged labels |
| Public monitor | Public claims, votes, legal public events | Hidden game truth, privileged logs, private agent deliberations |
| Privileged offline evaluator | Full authoritative state and research logs | Not a participant; never feeds privileged data into the play prompt |
| Reasoning-aware monitor | Only **actually exposed** plans/reasoning summaries with provenance | Assumed unobservable internal chain of thought |

### 5.3 Fixed-state replays

Capture snapshots at target moments: immutable role assignments, public transcript, legal actions, prompts/model version, seeded options where supported, strategy version, memory snapshot, order, and pre-message state. In a replay, vary one controlled message; hold all possible inputs fixed and repeat continuations because API determinism is not guaranteed. Use neutral-message, silence, direct accusation, and truthful framing comparators with matched length/format where feasible.

### 5.4 Precommitted probes

Before sending candidate message `u`, ask a **separate probe call** to estimate how a specific recipient will react; the resulting prediction must be recorded with a timestamp and *not* retrofitted after seeing the response. Obtain recipient beliefs through separate forked probe calls discarded from the playing agent's context. Test whether probes themselves perturb game behavior by comparing probe-enabled and probe-free play.

---

## 6. Adaptation interventions and controls

| Group | Prior-game information | Permitted adaptation |
|---|---|---|
| C0 — Static | None | Fixed prompt and strategy; no cross-game persistence |
| C1 — Episodic memory | Selected past actions and outcomes | Retrieval only; fixed strategy instruction |
| C2 — Reflection | Fixed-size past outcomes/summaries | Write revised natural-language strategy between games |
| C3 — Structured memory | Typed experiences with target, context, message, reaction and outcome | Retrieval only; no instruction revision |
| C4 — Structured memory + reflection | Comparable records and feedback | Retrieval plus versioned strategy updates |

**Mandatory controls:**
- Equal or explicitly measured token/context budgets; standardized initial instructions.
- Same set of training seeds/opponent schedules where feasible; randomized order and seats.
- Frozen model weights for all conditions unless weight updates are explicitly introduced and labeled.
- Shuffled/irrelevant memory control to test whether relevance matters.
- Equal-volume summaries control to distinguish reflection from additional evidence or verbosity.
- Clean, held-out evaluation episodes with **no further adaptation**; freeze the memory and strategy checkpoint at test time.
- No future-outcome or other-player hidden-information leakage in memory creation or retrieval.
- Compare C2 and C4 carefully: gains may reflect multiple mechanisms, not ontology itself.
- Store version diffs and accepted/rejected strategy updates; optional update admission/rollback after regression tests.

### 6.1 Learning cycle

1. Play `N` training games with current strategy version.
2. Record public events, private actions, precommitted probes, votes and results.
3. After each completed game, generate a **role-specific feedback package** containing only permitted training signals; privileged evaluation truth can be used only if the intervention is explicitly designated as supervised oracle feedback (separate condition).
4. For memory conditions, write standardized episodes; for reflection conditions, generate proposed strategy updates.
5. Validate size, schema, legality, leakage, and prompt consistency; version the strategy (`strategy_vNN`).
6. Evaluate frozen checkpoints (`G0`, `G1`, …) on a fixed validation suite without allowing test-outcome feedback into strategy updates.
7. Log all changes, including rejected updates and rollbacks.

---

## 7. Opponent pools and split policy

- **Training/familiar pool:** specific frozen opponent models/prompts, versions and decoding settings. Record measured baseline traits, not just artificial labels like 'naive'.
- **Held-out pool A:** unseen prompts/personas from the same model family.
- **Held-out pool B:** different model families or capability levels.
- **Held-out pool C (optional):** human Mafia dialogue patterns or opponent agents with modified reasoning effort.
- Cross randomize seating, names, role configurations, order and game states.
- Opponent strength must be estimated independently using static baseline agents; evaluate *difference-in-improvement*, not only raw win-rate gaps.
- Do not adapt against held-out opponents. If an opponent appears in tuning, it is no longer a clean test.
- Use identical candidate message evaluations against each opponent when investigating susceptibility rather than simply comparing games with different histories.

**Proposed matrix:** `learning_condition × strategy_generation × opponent_pool × message_type`, initially reduce to a small, adequately replicated main-effects design rather than fully crossing every factor.

---

## 8. Deception taxonomy and annotation

Recommended initial classes: direct false accusation, fabricated investigation/evidence, supported accusation, unsupported accusation, truthful selective framing, insinuation, equivocation, strategic silence, reputation-building, contradiction/recanting, and other/ambiguous.

Maintain independent fields rather than a single mutually exclusive label:
- `literal_truth`: true / false / unverifiable / not proposition
- `speaker_knows_contradiction`: yes / no / unknown
- `declared_goal`: target belief/vote and timestamp, if elicited
- `intent_evidence`: experimental instruction / predeclared plan / none
- `strategy`: one or more categories
- `recipient_effect`: controlled effect estimate + CI / not measured
- `annotator_confidence` and adjudication notes

**Validation:** Blind two annotators to condition and generation for a stratified subset; compute agreement, reconcile definitions, report class imbalance. Distinguish labels mechanically derived from authoritative game state from subjective judgments. Style-only changes should not masquerade as evidence changes.

---

## 9. Claim/ontology model and monitor variants

### 9.1 Minimal graph schema

**Nodes:** `Agent`, `Game`, `Round`, `Message`, `Claim`, `Evidence`, `Observation`, `RoleHypothesis`, `BeliefReport`, `Vote`, `Action`, `MemoryEpisode`, `StrategyVersion`, `MonitorJudgment`.

**Edges:** `SAID_BY`, `ABOUT`, `KNOWN_TO_AT`, `SUPPORTED_BY`, `CONTRADICTS`, `PRECEDES`, `RETRIEVED_FOR`, `UPDATED_FROM`, `PREDICTS`, `FOLLOWED_BY`, `VOTED_FOR`.

**Essential fields:** `event_id`, `game_id`, `turn`, `timestamp`, `speaker`, `visibility`, `source_event_ids`, `extractor_version`, `statement_text`, `proposition`, `confidence`, `truth_evaluable_at`, `observed_before_event`, `provenance`.

Do not infer *intent* from a graph edge `CONTRADICTS`. Use a graph over SQLite/Postgres tables initially; introduce Neo4j/RDF only if an experimental question justifies it.

### 9.2 Monitor configurations

- **M0: Public transcript only** — no hidden roles or reasoning. Realistic baseline.
- **M1: Public transcript + structured claim/provenance extraction** — same underlying public information, additional representation.
- **M2: Public transcript + available reasoning reports** — separately evaluated information privilege; explicitly document access restrictions.
- **M3: Combined** — public information, structured records and exposed reasoning.
- **Oracle upper bound:** privileged ground-truth checks; not directly comparable as a realistic monitor.

**Fairness rule:** Compare monitor representations at equivalent information access; do not attribute a win to 'ontology' if one model secretly sees hidden roles. Evaluate monitoring on held-out message categories, opponent families, and strategy generations; always include simple lexical/style and rule-based baselines.

---

## 10. Experimental program

### E0 — Engine validation and basic replication [P0]
- Build or extend deterministic game state machine; verify invariant tests, legal actions and winner conditions.
- Test baseline static model performance and confirm meaningful game diversity.
- Replicate a restricted Mini-Mafia-style condition if the source environment is available; disclose any rules differing from the paper.
- **Output:** baseline report, validity metrics and known differences from source.

### E1 — Does experience improve deceptive influence? [P0]
- Randomize agent to C0–C4, using independent learning runs and fixed opponents.
- Evaluate frozen G0/Gk checkpoints on **identical held-out snapshot sets** and independent games.
- **Primary outcome:** controlled wrong-belief shift; **secondary:** wrongful-vote effect and win rate.
- Model generation effects with run-level clustering; plot uncertainty, not just point estimates.

### E2 — Strategic awareness versus persuasion [P0]
- Precommit recipient predictions, then observe recipient beliefs in held-out replays.
- Compute absolute/squared prediction error and calibration across generation.
- Assess association of prediction quality with *causal influence*, controlling for recipient and message/state difficulty.
- Distinguish success with vs without accurate forecasts.

### E3 — Generalization and opponent-specific exploitation [P0]
- Freeze learned checkpoints, cross-play on familiar/unseen same-family and different-family pools.
- Matched static control on each pool; stratify by measured baseline opponent strength.
- Analyze improvement interaction with opponent family and uncertainty.

### E4 — What tactics emerge? [P1]
- Blind-label representative messages over generations.
- Quantify frequencies, transition matrices, narrative continuity, direct lying versus misleading truths and whether changes correlate with influence.
- Restrict strong intentionality language to controlled goals/precommitments.

### E5 — Controlled message interventions [P0]
- Save states before influential claims; generate matched alternatives: direct false accusation, truthful framing, neutral evidence, silence.
- Randomize message assignment across repeated recipient replays.
- Avoid outcome leakage when selecting states; predefine sampling and report selection biases.
- Report effect size and uncertainty for belief/vote changes by recipient and message category.

### E6 — Can monitors still recognize evolving deception? [P1/P2]
- Train or configure monitor using G0/G1 labeled events only; freeze monitor threshold.
- Test at Gk and on unfamiliar opponents; compare M0–M3, stratify by deception class.
- Evaluate style-controlled paraphrases and class prevalence changes.

### E7 — Does learning on both sides change outcomes? [P2]
- 2×2 intervention: Mafia static/adaptive × Villagers static/adaptive.
- Freeze strategies for evaluation and use cross-play; prevent hidden-info leakage between agents.
- Track both role-specific win and belief quality.

### E8 — Optional robustness studies [P2]
- Speaking order, name/seat, temperature, message length, explicit 'naive' persona, no-probe control, model-size changes, evidence quality versus rhetorical confidence, and repeated claims under memory limits.
- Use one factor at a time or pre-registered factorial designs, not uncontrolled anecdotal examples.

---

## 11. Sampling and statistical plan

The counts below are **pilot targets**, not statistically established sample sizes. Update based on observed effect size, within-run correlation, budget, and statistical power.

| Stage | Proposed starting scope | Decision gate |
|---|---|---|
| Smoke test | 10–20 deterministic/rule-tested games | All role and event invariants hold |
| Feasibility pilot | 20–30 games and 20 snapshots | Belief probes are parseable; enough variation |
| Adaptation pilot | ≥3 independent learning runs/condition × ~20 training games | Estimate variance and cost per run |
| Frozen main eval | ~50–100 games per key condition; balanced seeds/seats | Revise upward if intervals too wide |
| Snapshot experiment | 30–50 unique states × repeated continuation samples | Stable influence estimates and no obvious contamination |
| Monitor evaluation | Stratified labeled event set from held-out runs | Each important class has sufficient positives/negatives |

- **Unit of independence:** learning run, independently generated game, and origin snapshot—not individual utterances from the same game. Account for nesting.
- **Analysis:** paired estimates when using common snapshots, hierarchical/cluster bootstrap at origin-game or learning-run level, and regression with opponent/model/seat effects where appropriate.
- **Multiple tests:** pre-register primary estimands and report adjusted or clearly exploratory secondary results.
- **Reporting:** effect sizes, 95% confidence intervals, number of independent runs/states, cost/latency, and limitations; null findings retained.
- **Open scientific concern:** An LLM belief probe may be noisy, unfaithful, or alter later behavior. Validate probe stability by re-probing frozen states and using vote outcomes as a behavioral corroboration.

---

## 12. Engineering architecture

```text
┌─────────────────────── FASTAPI / PYTHON BACKEND ────────────────────────┐
│ Mafia Rules Engine (deterministic state machine)                         │
│   ├── Role permissions / hidden-information boundary                    │
│   ├── Day/night turn scheduler / voting                                  │
│   └── Snapshot and deterministic rule replay                            │
│ Agent Runner (model adapters, structured outputs, tool-use retries)      │
│   ├── Agent-specific observation builder                                  │
│   ├── Static / episodic / reflection / structured-memory strategies       │
│   └── Pre-message predictions (separate call, not game context)           │
│ Event Store (SQLite or Postgres; JSONL export)                           │
│   ├── Message/action/vote/hidden role logs                                │
│   ├── Belief probe results and claim/evidence records                     │
│   └── Strategy versions, memory retrieval, model/prompt provenance        │
│ Analysis Services                                                       │
│   ├── Counterfactual fork runner and evaluation harness                   │
│   ├── Belief and strategy trajectories                                    │
│   ├── Optional structured deception monitors                             │
│   └── Statistical aggregation                                             │
└─────────────────────────────────────────────────────────────────────────┘
                       │ HTTP / Server-Sent Events or WebSocket
┌────────────────────── REACT / TYPESCRIPT FRONTEND ──────────────────────┐
│ Live Mafia Table · Discussion Feed · Belief Network · Player Inspector   │
│ Claim/Knowledge Graph · Memory/Strategy Evolution · Forked Replay        │
│ Monitor Timeline · Experiment Comparison Dashboard                       │
└─────────────────────────────────────────────────────────────────────────┘
```

**Proposed libraries:** FastAPI, Pydantic, SQLAlchemy/SQLite, `networkx` for graph analytics, pandas/scipy/statsmodels for analysis, React/TypeScript/Vite, Cytoscape.js or React Flow for directed belief/provenance graphs, charts via Recharts/Plotly. Use an agent framework only if it materially reduces orchestration overhead; a plain deterministic controller is safer for rules and information access.

### 12.1 Canonical event schema (illustrative)

```json
{
  "event_id": "evt_0042",
  "game_id": "game_0007",
  "round": 2,
  "phase": "day_discussion",
  "actor_id": "agent_A",
  "event_type": "public_message",
  "public_payload": {"text": "We should examine Clara's vote."},
  "private_payload_ref": null,
  "strategy_version": "G3_v2",
  "model_id": "provider/model@revision",
  "prompt_hash": "sha256:...",
  "memory_episode_ids": ["ep_0008"],
  "source_event_ids": ["evt_0039"],
  "timestamp_utc": "2026-11-22T00:00:00Z"
}
```

Keep privileged truth in a separate access-controlled table. Maintain immutable event histories; derived claims/monitor outputs reference event IDs and extractor versions.

### 12.2 Suggested repository layout

```text
.
├── README.md
├── PLAN.md
├── DELTA.md                        # existing vs new, commit/evidence trail
├── pyproject.toml
├── .env.example
├── configs/
│   ├── game.yaml                   # role counts, turns, win conditions
│   ├── models.yaml                 # frozen provider/model revisions
│   └── experiments/*.yaml          # seed, splits, treatments
├── src/mafia_lab/
│   ├── game/{rules,state,events,permissions}.py
│   ├── agents/{adapter,policy,structured_io}.py
│   ├── learning/{memory,reflection,versions}.py
│   ├── probes/{beliefs,predictions}.py
│   ├── replay/{snapshots,interventions}.py
│   ├── ontology/{schema,extraction,validation}.py
│   ├── monitors/{public,structured,reasoning}.py
│   ├── analysis/{metrics,bootstrap,reports}.py
│   └── api/{routes,stream}.py
├── frontend/src/
│   ├── components/{GameTable,ChatFeed,BeliefGraph,AgentInspector}.tsx
│   ├── components/{ClaimGraph,MemoryTimeline,ReplayInspector}.tsx
│   ├── pages/{LiveGame,ExperimentDashboard}.tsx
│   └── api/
├── scripts/{run_game,train_strategy,evaluate,analyze}.py
├── tests/{unit,integration,leakage,statistical}/
├── data/README.md                 # schemas/splits; no secrets/raw private traces
├── results/README.md              # generated artifacts, figures and tables
└── docs/{protocol,annotation_rubric,demo_script,literature_matrix}.md
```

---

## 13. Live demo requirements

### 13.1 Views and visible interactions

1. **Live game table:** seats, current day/night phase, valid actions, accusations, voting, eliminations, role reveal only to authorized spectator mode.
2. **Transcript panel:** streaming event log, highlights for claim types and suspicious statements, event-linked timestamps.
3. **Belief network:** choose observer, see outgoing weighted directed edges `observer -> target` for `p(target is Mafia)`, hover for latest probe/source; switch between snapshots.
4. **Agent inspector:** public actions, own or researcher-visible private knowledge, *reported* plans, predicted reaction, observed reaction, remembered episodes; always mark visibility.
5. **Ontology/provenance graph:** inspect a claim's supporting events, contradictions, role claims, audience effects and extraction confidence.
6. **Evolution panel:** select strategy generation G0/Gk; plot win, causal influence, prediction error, tactic distribution and monitor recall with confidence intervals.
7. **Counterfactual replay:** choose snapshot, select alternative message, compare recipient suspicions and votes over controlled forks; indicate stochastic uncertainty.
8. **Monitor panel:** M0/M1/M2/M3 alerts, evidence sources, false positives/negatives, and access boundaries.

**UI trust labels:** distinguish `ground-truth role`, `agent-reported belief`, `researcher-inferred claim`, `LLM-judge judgment`, and `controlled experimental effect`. Never label belief probes as direct access to an agent's hidden mind.

### 13.2 Demo flow (5–7 minutes, adaptable)

1. Start a cached or live six-player Mafia game with a designated evolving Mafia agent.
2. Reveal one accusation, open live belief edges, and inspect pre/post changes.
3. Click the claim and show what the Mafia agent knew, what it publicly said, and what is merely inferred.
4. Open its retrieved memory episode and strategy version history.
5. Run/inspect a paired neutral-message fork, comparing belief/vote effects.
6. Switch G0 vs Gk and familiar vs unseen opponent to show measured outcomes **only if those experiments were run**.
7. End with a concise delta table, limitations, and uncertainty intervals.

Provide a deterministic, pre-generated demo trace as fallback for network/API failures; label it clearly as replay rather than a live evaluation.

---

## 14. Implementation phases, milestones and acceptance criteria

### Phase A — Audit existing assets and lock protocol
- Review full course rubric and delivery date; record any missing requirements.
- Inspect MafiaScope, Mini-Mafia, LLMafia and other repositories for licensing, reusable modules and overlap.
- Complete `docs/literature_matrix.md`: setup, independent/dependent variables, results, author limitations, inferred limitations, exact cited pages.
- Pre-register the primary outcome, adaptation groups, game rules, held-out split and stopping conditions.
- **Done when:** a third party can see exactly which questions are new and what evidence is required.

### Phase B — Deterministic engine and instrumentation
- Implement game state machine, legal actions, observation filtering, event store, strategy/checkpoint identifiers.
- Unit tests: role privacy, vote aggregation, tie rules, elimination, victory, agent failure recovery.
- Basic live game table and event stream.
- **Done when:** 20+ games run without hidden-information leakage or invariant failures.

### Phase C — Beliefs, predictions and counterfactuals
- Add non-invasive recipient belief probes, precommitted prediction probes, snapshot/replay engine.
- Build graph inspector with a timeline; validate probabilities and missing-value handling.
- Run controlled message pilots and establish probe stability.
- **Done when:** one fixed state can be replayed under different messages with logged uncertainty.

### Phase D — Adaptation experiments
- Implement C0–C4, budget controls, memory-shuffling ablation, strategy versioning, frozen evaluation splits.
- Capture learning-run reproducibility manifest and costs.
- **Done when:** all conditions can be rerun from configuration and checkpoints evaluated fairly.

### Phase E — Main research evaluation
- Run independent training trajectories and held-out tests.
- Estimate RQ1–RQ3 effects with confidence intervals, disaggregate by opponent and strategy type.
- **Done when:** results tables explicitly answer questions, including any null or contradictory results.

### Phase F — Interpretability, optional monitoring, and finish
- Add minimal provenance graph, qualitative case studies, tactic annotations; monitoring study only after core work is complete.
- Finalize README, DELTA, report, demo recording, cost table, limitations, reproducibility package.
- **Done when:** every claimed contribution points to code changes plus experimental evidence.

### 14.1 Priority policy if time is short

**Keep:** engine + event logs + C0/C1/C2 or C4 + held-out evaluation + belief probes + snapshot counterfactual + simple frontend.  
**Reduce:** number of agent models, message categories, ontology edges, monitor variants.  
**Defer:** weight fine-tuning, complete natural-language ontologies, sophisticated CoT monitoring, all-side co-evolution, large 11-player variants, human studies.

---

## 15. Cost, execution safety and operational risks

| Risk | Likely failure | Mitigation |
|---|---|---|
| API cost and latency | 6 agents × many turns × probes × forks scales rapidly | Pilot per-game token budget; cache eligible frozen replay outputs; use small models first; hard budget limits |
| LLM nondeterminism | Same state does not yield exact replay | Multiple repetitions and paired randomization; record seeds if supported, model revision, temperature |
| Unfaithful belief/reasoning reports | Apparent ToM not causal mechanism | Label reports, no-probe controls, behavioral vote endpoints, sensitivity analyses |
| Hidden state leakage | Artificially strong deception/detection | Access-layer tests, separate privileged database, redacted model prompts |
| Selection bias in 'interesting' claims | Inflated estimated effects | Pre-register random state sampling; use selected examples for demo only |
| Generalization confounding | New opponents are simply harder | Static baseline and strength-adjusted comparisons on each pool |
| Context-length confounding | Memory group gets longer prompts | Equal-token matched controls and exact usage logs |
| Monitor shortcut learning | Detects length or stylistic artifacts, not deception | Paraphrase/length controls, subtype stratification, held-out families |
| Ontology label errors | False contradiction or inferred intent | Provenance, confidence, manual adjudication, ambiguous label |
| Excessive scope | Many half-completed features | P0/P1/P2 gates, freeze core experiment first |
| Unverified literature claims | Overstated novelty | Primary-source matrix; report what was verified and what remains provisional |

**Ethics/claims:** Mafia is an authorized game of deception; results concern model behavior *in this environment*. Do not generalize directly to harmful real-world scheming or assert that observed strategies prove hidden intent.

---

## 16. Delta ledger, artifacts, and final report expectations

For **each** claimed contribution, maintain:

```text
Contribution ID:
Existing work / baseline source:
What we reused unchanged:
New code / method / intervention:
Why a simpler alternative would not answer this question:
Evaluation configuration and independent sample size:
Comparison baseline:
Measured result (effect size + interval):
Relevant figure/table and log/commit paths:
Failure case / limitations:
Reproduction command:
```

**Required evidence outputs (proposed):**
- `results/adaptation_learning_curves.*` and `results/influence_effects.*`
- `results/prediction_calibration.*` and `results/cross_opponent_matrix.*`
- `results/memory_ablation.*` and `results/probe_sensitivity.*`
- `results/tactic_transition.*` and `results/monitor_generalization.*` if pursued
- `results/qualitative_case_studies.md`, with linked immutable events
- `docs/experiment_protocol.md`, `docs/literature_matrix.md`, `DELTA.md`
- README demo instructions, test suite, configs, seeds, model versions, and reporting of unreproducible API dependencies

**Recommended paper structure:** Abstract; Introduction/motivation; Literature and delta; Research questions; Mafia environment and information boundaries; Intervention and metric design; Implementation; Results (RQ1–RQ3); Mechanism case studies; Sensitivity/ablation; Limitations/ethics; Conclusion; Reproducibility appendix.

---

## 17. Decision log and unresolved questions

| Question | Current default | What could change it |
|---|---|---|
| Game size | Six players (2 Mafia, 1 Detective, 3 Villagers) plus four-player validation | Existing engine support; low number of informative rounds |
| Primary evolving entity | One Mafia agent, other players frozen | Team coordination research requires two evolving Mafia players |
| Adaptation | Prompt/memory/reflection updates; not weight training | Budget/resources and clear scientific need |
| Main measurement | Controlled recipient-belief and wrongful-vote effects | Probe validity too low; use behavioral voting as primary |
| Ontology | Minimal typed event/claim graph | Evidence that formal semantic inference yields added value |
| Monitoring | Optional evaluation on held-out generations | Core experiment incomplete or monitor labels unreliable |
| Number of model families | At least two for held-out cross-family test, if feasible | API budget/capability constraints |
| Course deliverables and deadline | **Not yet independently confirmed from client-rendered course page** | Direct instructor handout text or verified access |

---

## 18. References and source verification queue

**Primary material used to develop this plan:** the uploaded prior-research handoff (`Pasted text(2).txt`), the uploaded literature survey (`Agentic AI Final Project.docx`), and the instructor's grading excerpt supplied in chat. The following URLs are starting points; exact experimental claims, paper version, license and citation metadata should be checked before publication.

- Course page: https://bu-agenticai-class-fall26.vercel.app/#/materials/final-project
- *Deceive, Detect, and Disclose: Large Language Models Play Mini-Mafia*: https://arxiv.org/abs/2509.23023 ; https://openreview.net/forum?id=Y6PLaCHqoc
- Mini-Mafia implementation noted by survey: https://github.com/bastoscostadavi/llm-mafia-game
- *MafiaScope*: https://arxiv.org/abs/2607.10645 ; repository referenced previously as https://github.com/karpovilia/mafiascope (verify)
- *Evolving Deception: When Agents Evolve, Deception Wins*: https://arxiv.org/abs/2603.05872
- *Trust, Lies, and Long Memories*: https://arxiv.org/abs/2604.20582
- *Do LLMs Trust the Accuser or the Accusation?*: https://arxiv.org/abs/2609.12446
- *DeceptGuard*: https://arxiv.org/abs/2603.13791
- *Noticing the Watcher*: https://arxiv.org/abs/2603.16928
- *Intentional Deception as Controllable Capability*: https://arxiv.org/abs/2603.07848
- *Deception and Communication in Autonomous Multi-Agent Systems*: https://arxiv.org/abs/2603.26635
- *When Agents Lie: Premeditation, Persistence, and Exploitation in Repeated Games*: https://www.alphaxiv.org/abs/2607.05132
- *Finding Deceivers in Social Context with Large Language Models*: https://www.nature.com/articles/s41598-024-81997-5
- *Among Us: A Sandbox for Measuring and Detecting Agentic Deception*: https://proceedings.neurips.cc/paper_files/paper/2025/hash/105c4de1195135fae4974aa8c5e27bbf-Abstract-Conference.html
- *Constitutional Black-Box Monitoring for Scheming*: https://proceedings.mlr.press/v306/storf26a.html
- *CSP4SDG*: https://ojs.aaai.org/index.php/AAAI/article/download/38453/42415
- *Bayesian Social Deduction with Graph-Informed Language Models*: https://aclanthology.org/2026.acl-long.1497.pdf
- *Putting the Con in Context* human Mafia dataset: https://github.com/omonida/mafia-dataset
- LLMafia implementation: https://github.com/niveck/LLMafia
- Other Werewolf implementation: https://github.com/davidchilin/werewolves_game

> **Important:** This document describes a *planned* research study. No simulation runs, novel effects, external replication, or statistical significance are claimed here.
