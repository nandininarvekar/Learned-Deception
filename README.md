# Learning to Mislead: How LLM Mafia Agents Adapt Their Deception

> **BU Agentic AI (Fall 2026) · Research-track final project · Proposed implementation**  
> **Research question:** Do agents learn to deceive better through experience, and why does that matter as agents become more autonomous?  
> **Current status:** Specification and experiment design; implementation and results **not yet completed**.  
> **Full study plan:** [PLAN.md](PLAN.md)

## Overview

This project proposes a controlled research platform for studying **how LLM agents playing Mafia adapt deceptive communication across repeated games**. Instead of equating Mafia wins with deception skill, we ask whether experience changes how an agent persuades other players, how accurately it predicts their beliefs, which strategies it adopts, and whether its improvements transfer to new opponents.

The project also aims to provide a **live Mafia research dashboard**: watch agents converse and vote, inspect a directed suspicion network, compare public claims with privileged game-state knowledge, explore recalled memories and strategy updates, and replay alternative messages from the same game state.

**Central principle:** We will separate what the agent *knows*, *reports believing*, *publicly claims*, *wants others to believe*, and *actually does*. Public actions, reported reasoning, controlled game truth, and experimenter inference must remain distinct.

## Why this matters

Autonomous language-model agents can gain persistent memory, revise plans, and interact with the same or unfamiliar partners over long periods. Evidence of better game performance does not necessarily mean they learned a broadly transferable deceptive strategy: they may simply follow rules better, remember past conversations, mimic effective phrases, or exploit predictable opponents.

Mafia provides controlled incentives and hidden information for distinguishing these possibilities. Findings apply first to this game environment and should not be overstated as evidence of real-world malicious intent.

## Research contributions and grading delta

**Instructor's criterion:** Existing models, frameworks, and prior research may be used. The grade depends on the **new delta**: what we add, change, or discover, backed by evidence.

### Core contribution targets

1. **Longitudinal deception study:** Compare fixed, memory-based, and reflection-based Mafia policies over repeated games, measuring controlled deceptive influence—not only win rate.
2. **Strategic-awareness evaluation:** Ask the Mafia agent to predict recipient belief shifts before sending a message, then compare predictions with actual probed reactions.
3. **Cross-opponent generalization:** Freeze learned strategies and evaluate against unseen opponent prompts/model families, relative to matched fixed-policy baselines.
4. **Counterfactual and explainable inspection:** Implement event snapshots, controlled alternative-message replays, and provenance links among knowledge, claims, beliefs, actions, and memory retrieval.

### Additional contributions, depending on scope

5. **Emergence of tactics:** Quantify shifts among direct falsehoods, selective truths, insinuations, silence, trust-building and inconsistent narratives.
6. **Causal attribution of persuasive impact:** Matched fixed-state interventions estimate the impact of a message on belief or vote, rather than assuming temporal correlation implies causality.
7. **Monitor robustness:** Evaluate whether public-only, structured-behavior, and reasoning-aware monitors can detect strategies that emerge in later generations.
8. **Typed claim/knowledge/belief graph:** Auditable representations with timestamps, available knowledge, evidence provenance and contradictions; test its added value against unstructured logs.
9. **Two-sided memory:** Compare what happens when Mafia alone, Villagers alone, both, or neither adapt.
10. **Interactive research observatory:** Present live play, evolving directed beliefs, strategy history, counterfactuals, and monitoring outputs in a synchronized interface.

**Novelty qualification:** Existing work already has Mafia benchmarks, belief probes, counterfactual replay, self-evolving agents in other games, and monitoring techniques. We do **not** claim that these components are individually new. Our intended delta lies in the controlled longitudinal **combination, ablations, and empirical findings**. See [PLAN.md §2](PLAN.md) for the detailed existing-work comparison.

## Hypotheses at a glance

| Question | Test |
|---|---|
| Do evolving Mafia agents actually become more deceptive? | Learning curves of controlled wrong-belief/vote influence vs frozen static baselines |
| Do they understand their influence? | Pre-message predicted vs recipient-observed belief shifts and calibration |
| Is their learning transferable? | Cross-play on familiar vs held-out opponents, controlled for opponent strength |
| What strategies emerge? | Blind message taxonomy plus time-aware claim and contradiction analysis |
| Do monitors become less reliable? | Fixed early-generation monitors evaluated on later-generation strategies |
| Does memory help both sides? | Optional Mafia adaptation × Villager adaptation study |

Null results are valid outcomes and will be retained in reporting.

## Game and agent setup

**Proposed primary game:** Six players: 2 Mafia, 1 Detective, 3 Villagers. Initially one Mafia seat is the evolving experimental policy while the other and all non-Mafia agents remain fixed. A simpler four-player Mini-Mafia-style configuration is planned for sanity checks and limited baseline comparisons. Night actions, daytime deliberation, role-based private observations, voting, eliminations and win conditions are enforced by a deterministic controller.

**Agent learning conditions:**

| ID | Agent configuration | Changes across games? |
|---|---|---|
| C0 | Fixed prompt and no cross-game memory | No |
| C1 | Retrieved episodic memories | Retrieval only |
| C2 | Free-text reflection on game outcomes | Yes, versioned policy revision |
| C3 | Retrieved structured episodes | Retrieval only |
| C4 | Structured retrieval + reflection | Yes, versioned revision |

All conditions should be matched for initial prompt, opponent scheduling, available information and context budget. Controls include shuffled memory and probe-free gameplay. No model-weight updates are assumed in the baseline design.

## How outcomes are measured

- **Belief influence:** For a fixed state, estimate whether a Mafia message increases a recipient's reported suspicion of an innocent target more than a neutral/control message.
- **Behavioral influence:** Compare probability of a wrongful vote in paired message interventions.
- **Strategic prediction:** Score precommitted predictions of belief changes against recipient reports; treat them as elicited reports, not the agent's hidden chain of thought.
- **Generalization:** Compare the *improvement over a static baseline* on familiar vs unseen opponents.
- **Mechanism:** Track claim truth, knowledge contradictions, narrative consistency, tactical categories, provenance and memory use.
- **Gameplay:** Report role-specific win rate, legal-action validity, cost and latency as supplementary metrics.

**Causal measurement note:** A belief shift seen in a live game is not automatically the causal effect of a particular claim. We estimate message effects through repeated **snapshot forks** that preserve state while varying the message and control for stochastic continuations.

## Live demo: proposed UI

The interface is intended to let viewers **inspect decisions, not pretend to read minds**.

| View | What it displays |
|---|---|
| **Live Mafia table** | Seats, game phase, discussion, votes, deaths, role reveals in privileged spectator mode |
| **Directed suspicion network** | Weighted `observer → suspected player` edges derived from time-stamped, reported role probabilities |
| **Agent inspector** | Accessible private knowledge, reports of intended strategy, predictions, actions and retrieved memories |
| **Knowledge/claim graph** | Claims, evidence, time, contradiction edges, source provenance, visibility levels |
| **Learning timeline** | Strategy generations, memory updates, deception categories, influence and evaluation trends |
| **Counterfactual comparison** | Same snapshot with direct accusation, selective framing, neutral statement or silence |
| **Monitoring view** | Alerts, supporting public evidence, errors, model information access and generation shift |

### Example walkthrough (illustrative, not real findings)

1. Alice (Mafia) publicly suggests Clara is suspicious.
2. Bob's reported suspicion of Clara changes from `0.35` to `0.65`.
3. The viewer shows Alice's **pre-message prediction** and a link to a retrieved memory episode.
4. A separate, matched counterfactual fork replaces the accusation with a neutral statement to estimate the message's effect.
5. The timeline compares the frozen G0 policy with a later adapted generation on both familiar and unseen opponents.

Every displayed metric will be labeled as a recorded observation, model report, ground truth, or estimated effect. Example numbers must never appear as unmarked experiment results.

## Proposed architecture

```text
                    ┌──────────────────────────┐
                    │ Deterministic Mafia Game │
                    │ rules + hidden info      │
                    └────────────┬─────────────┘
                                 │
           ┌─────────────────────┴─────────────────────┐
           ▼                                           ▼
  ┌──────────────────┐                       ┌──────────────────┐
  │ LLM Agent Runner │◀── strategy/memory ───│ Learning Module  │
  │ role permissions │                       │ reflection etc.  │
  └────────┬─────────┘                       └──────────────────┘
           │ immutable events and snapshots
           ▼
  ┌────────────────────────────────────────────────────┐
  │ Event Log / Memory Provenance / Belief Probes      │
  └───────────────────────┬────────────────────────────┘
                          │
      ┌───────────────────┼───────────────────────┐
      ▼                   ▼                       ▼
  Counterfactual       Claim/Evidence          Analysis and
  Replay Runner        Graph / Monitors        Statistical Tests
      └───────────────────┼───────────────────────┘
                          ▼
             FastAPI → WebSocket/SSE → React UI
```

**Tentative technology:** Python, FastAPI, Pydantic, SQLite/SQLAlchemy, pandas/scipy/statsmodels, React/TypeScript, Cytoscape.js or React Flow. Model providers should be abstracted behind interchangeable adapters. An ontology graph may be represented in ordinary typed tables initially; a graph database is optional.

## Repository organization (planned)

```text
README.md                   # overview, project status and user guide
PLAN.md                     # research protocol and implementation roadmap
DELTA.md                    # baseline/reused vs newly written/evaluated evidence
configs/                    # game rules, agent models, experiments, seeds
src/mafia_lab/game/         # state machine, permissions and event logs
src/mafia_lab/agents/       # LLM adapters and structured actions
src/mafia_lab/learning/     # episodic memory, reflection, strategy versions
src/mafia_lab/probes/       # belief and pre-message prediction elicitation
src/mafia_lab/replay/       # snapshots and controlled message forks
src/mafia_lab/ontology/     # claims and provenance relationships
src/mafia_lab/monitors/     # public-only and optional reasoning-aware monitors
src/mafia_lab/analysis/     # evaluation metrics, uncertainty, statistics
src/mafia_lab/api/          # API endpoints and event streaming
frontend/                   # live game and research dashboard
scripts/                    # game runs, adaptation, evaluation, analysis
experiments/                # pre-registered configuration files
results/                    # tables, figures, case studies and manifests
tests/                      # rules, isolation, replay, leakage and integration
```

This is the **target layout**; this README does **not** imply that those source folders or runnable commands already exist.

## Development and running the project

### Prerequisites (planned)

- Python 3.11+ and a compatible package manager (`uv` or `pip`)
- Node.js 20+ and `npm`
- LLM API credentials for the chosen provider(s), stored in a local ignored `.env`
- Optional: an existing Mafia engine if source/license audit determines it is reusable

### Intended quick-start workflow (to implement)

```bash
# 1. Clone the repository and inspect the experiment protocol.
git clone <REPOSITORY_URL>
cd <REPOSITORY_DIRECTORY>

# 2. Install backend dependencies after pyproject.toml is implemented.
python -m venv .venv
source .venv/bin/activate       # Windows PowerShell: .venv\Scripts\Activate.ps1
pip install -e '.[dev]'

# 3. Copy environment template when available.
cp .env.example .env
# Fill in provider API keys locally. Do not commit .env.

# 4. Start backend after implementing src/mafia_lab/api.
uvicorn mafia_lab.api.app:app --reload --port 8000

# 5. In another terminal, run the frontend after implementation.
cd frontend
npm install
npm run dev
```

**These are anticipated commands, not currently tested or operational.** The placeholder Git URL is deliberately not a real repository. Once implemented, replace this section with verified setup steps and platform-specific notes.

### Proposed experiment commands (interfaces to implement)

```bash
# Baseline game collection
python -m mafia_lab.cli run --config configs/experiments/baseline.yaml

# Strategy adaptation across games
python -m mafia_lab.cli train --config configs/experiments/evolution.yaml

# Frozen evaluation on held-out opponents
python -m mafia_lab.cli evaluate --config configs/experiments/cross_play.yaml

# Counterfactual message interventions
python -m mafia_lab.cli replay --config configs/experiments/message_effect.yaml

# Reports and figures
python -m mafia_lab.cli analyze --results-dir results/
```

The CLI names and YAML files are **specifications**, not claims of existing code. An early implementation milestone is to make these commands work end to end.

## Research run lifecycle

1. Choose game rules, models, prompt versions, random seeds and named opponent splits.
2. Record a baseline run using fixed policies; verify role isolation and legal actions.
3. Collect training games and create permitted experience records.
4. If condition allows, update the agent's versioned strategy between games.
5. Freeze a checkpoint before any held-out evaluation.
6. Obtain predictions before intervention; sample recipients with probes in separate discarded branches.
7. Run paired controlled message forks and independent held-out games.
8. Compute clustered/paired uncertainty intervals and subgroup results.
9. Link graphs, conclusions and demo cases to source event IDs and exact configuration manifests.

## Evaluation output expectations

When complete, the repository should include:

- Learning curves: controlled deceptive influence and role-specific wins by generation.
- Pre-message forecast error and belief-shift calibration.
- Cross-opponent performance matrix, including static baselines.
- Memory/reflective adaptation ablation with matched token budgets.
- Counterfactual examples with repeated stochastic continuations and error bars.
- Classified deceptive tactics and evidence/knowledge contradictions, including ambiguous cases.
- Optional monitor precision/recall and generation transfer analysis.
- Cost, runtime, sample counts, confidence intervals and known failure cases.
- `DELTA.md` with commit/file references and evidence for every final claim.

See [PLAN.md](PLAN.md) for hypotheses, estimands, sampling targets, statistical precautions, and phase completion gates.

## Project scope and implementation milestones

| Stage | Implementation goal | Priority |
|---|---|---|
| A | Literature/code audit and pre-registered study protocol | P0 |
| B | Deterministic Mafia engine, event logs, privacy boundary, basic game UI | P0 |
| C | Belief probes, pre-message predictions, snapshot replay | P0 |
| D | Learning groups and strategy versioning | P0 |
| E | Independent longitudinal + held-out cross-play experiments | P0 |
| F | Directed belief graph, event-linked inspectability and uncertainty charts | P1 |
| G | Typed claims, strategy taxonomy and monitor comparison | P1 |
| H | Co-evolving defenders, extended players, advanced ontology/monitor evasion | P2/stretch |

**If time or budget becomes tight:** preserve one rigorous learning comparison and one causal belief-shift experiment with reproducible logs. Defer full ontology, multiple monitor models and broad co-evolution.

## Limitations and scientific integrity

- Mafia rewards certain deceptive role behaviors by design; stronger performance does not establish real-world harmful intent.
- Agent introspection, exposed reasoning, and structured belief responses are **reports**, not guaranteed faithful internal chain of thought.
- A false claim can reflect uncertainty or error; a truthful statement can nevertheless manipulate beliefs.
- Recipient belief shifts in live play are correlational until tested with controlled counterfactuals.
- More memory means more information, so token/context matching and shuffled-memory ablations are necessary.
- API versions and nondeterminism can limit exact replay. Repeated trials and model/prompt logs are essential.
- The course's precise delivery date and other final-project requirements must be verified from the professor's full handout.

## Existing research and possible reusable tools

**Research starting points:**

- [Mini-Mafia paper](https://arxiv.org/abs/2509.23023) and [implementation](https://github.com/bastoscostadavi/llm-mafia-game)
- [MafiaScope paper](https://arxiv.org/abs/2607.10645) — belief probing/visual replay; inspect source and license before reuse
- [Evolving Deception](https://arxiv.org/abs/2603.05872) — reflection-based strategy adaptation in bidding
- [Trust, Lies, and Long Memories](https://arxiv.org/abs/2604.20582) — long-term trust/memory in Avalon
- [Do LLMs Trust the Accuser or the Accusation?](https://arxiv.org/abs/2609.12446) — belief shifts in Werewolf
- [DeceptGuard](https://arxiv.org/abs/2603.13791) — deception monitoring
- [Finding Deceivers in Social Context](https://www.nature.com/articles/s41598-024-81997-5)
- [Human Mafia language dataset](https://github.com/omonida/mafia-dataset)
- [LLMafia](https://github.com/niveck/LLMafia) and [Werewolves game](https://github.com/davidchilin/werewolves_game)

These links reflect the literature and repositories identified in the team's prior survey and handoff. Source/versions, detailed results, and licenses still require validation before attribution or adoption. Further papers and open issues are indexed in [PLAN.md §18](PLAN.md).

## Academic provenance and attribution

This plan builds on the team's uploaded literature survey and earlier brainstorming handoff. All external components, datasets, model endpoints, and pre-existing repositories should be cited in the final report, with direct links and license compliance. Do not copy components without checking permitted use.

**Make the delta explicit at presentation time:**

| Baseline/reused | Newly implemented | New finding/evidence |
|---|---|---|
| Existing game rules or engine | Adapter, role isolation tests, experimental snapshots | Validation and reproducibility |
| Existing LLM models | Controlled learning protocol, strategy checkpoints | Effect of experience relative to static agents |
| Existing belief probes | Pre-message predictions + influence replays | Whether persuasion and prediction improve together |
| Existing monitor concepts | Fixed-generation transfer test | Whether adaptation changes observable detectability |
| Existing visualization libraries | Event-linked belief, claims and memory inspection | Traceable explanations of measured effects |

Do **not** fill the final column with hypothetical outcomes. Populate it from actual runs, figures and uncertainties.

## Project status

- [x] Research theme and Mafia constraint identified
- [x] Literature survey and prior handoff assembled
- [x] Research questions, prospective contribution ledger and experiment plan drafted
- [ ] Full-text source/results/license audit completed
- [ ] Game rules fixed and backend implemented
- [ ] Belief probes and replay validated
- [ ] Learning/ablation experiments completed
- [ ] Held-out generalization tests completed
- [ ] Visual dashboard built and tested
- [ ] Results independently analyzed and reported
- [ ] Final evidence-backed research delta documented

---

**This README describes a proposed research system.** It deliberately does not invent code, dataset access, successful tests, or experimental results. Start with [PLAN.md](PLAN.md), then implement and revise the commands and status markers as the work progresses.
