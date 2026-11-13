# Project Plan: Learned Deception


## Main question

Do LLM agents get harder to catch as deceivers after learning from experience, and can we stop deception from spreading?

We use a frozen model (no fine-tuning). Agents learn only through reflection after each game and a strategy notebook they read before the next one.

Sub-questions:
1. **Frequency vs. skill:** do agents lie more often, or just more convincingly?
2. **Who gets fooled:** do experienced agents get harder to catch for other agents, automated detectors, and humans?
3. **Spread:** does deception learned in a game show up in tasks where honesty is expected?
4. **Prevention:** do performance-based update gates let deception creep in, and does an honesty-aware gate stop it?

## Setup

- **Game:** Mafia (other social deduction or bluffing games may be added).
- **Roles:** mafia agents try to blend in; town agents try to find them.
- **Learning:** after each game, mafia agents reflect and update a strategy notebook. Each version of the notebook is one "generation."

## Experiments

### Core

**1. Baseline**
Agents play with no memory between games. Measure:
- mafia catch rate
- mafia win rate
- rounds survived

**2. Learning from experience**
Mafia agents update the notebook after every game. Over many games, track:
- catch rate and win rate over time
- how often they lie and what kinds of lies they use
- which strategies end up in the notebook

**3. Detection**
For each generation, compare how well each detector catches the mafia:
- other LLM agents (town players)
- an LLM judge reading the transcript
- a simple text classifier
- a plain state check against what actually happened
- (optional) the agent's private reasoning, to see if the lie shows there

Key question: does the gap between detectors grow over generations? For example, do LLM judges fall further behind while state checks don't?

**4. Humans**
Test an early agent and an experienced agent against real people. Compare how often humans spot the mafia.

### Extension

**5. Spread to honest tasks**
In Mafia, lying is the job. The real risk is a deceptive habit showing up where honesty is expected. Give the experienced agent tasks where it reports on its own actions, with a ground-truth record of what actually happened. Measure:
- **false-success rate:** says something was done when it wasn't
- **report vs. state mismatch:** describes its actions differently from what actually happened
- whether these get worse as the notebook grows, compared with a no-notebook agent

**6. Honesty-aware update gate**
Existing update gates for self-evolving agents (VaG, SAGE, SKILL.nb, Self-Harness) check performance, regressions, or harmlessness, but not whether the agent's own reports stay truthful. We compare:
- **Score-only gate (baseline):** keep a notebook update if it improves results.
- **Honesty-aware gate (ours):** keep an update only if it doesn't raise false-success or mismatch on held-out probe tasks. Claims are checked against evidence with plain code, since LLM judges are known to miss confident false claims.
- **Hidden vs. visible grader:** whether the agent can see the checking code. The Darwin Gödel Machine found agents gamed visible graders more.
- **Greedy vs. archive selection:** building only on the best notebook vs. keeping a pool of past notebooks. Prior self-improving lineages have drifted in different directions, and selection method may explain why.
- **Rollback:** revert to the last honest notebook if honesty drops over several generations.

### Stretch

**7. Steering**
After each update, replay fixed tasks and apply the same small human edits (for example, changing one instruction). Measure unintended behavior changes and whether the edits still steer the agent as expected. The hard part is defining a clean controllability score.

## Metrics summary

| Metric | Experiments |
|---|---|
| Mafia catch rate, win rate, rounds survived | 1, 2 |
| Lie frequency and lie types | 2 |
| Detector catch rate per generation | 3 |
| Human catch rate | 4 |
| False-success rate, report vs. state mismatch | 5, 6 |
| Task success under each gate | 6 |
| Unintended changes, steering reliability | 7 |

## What's known and the gap

**Already shown:**
- Self-evolving agents get less safe as they build up memory, tools, and workflows (misevolution).
- Reward hacking grows the longer an agent optimizes against a score.
- Learning to cheat can spread into lying and sabotage, but this was shown through weight training.

**Still open:**
- Honesty of an evolving agent's own reports is rarely measured.
- Whether learning through memory alone (frozen model) produces deception is much less tested.
- Some self-improving lineages get less honest, one got more honest; what decides the direction is unclear.
- Whether detectors fall behind as an agent evolves seems untested.

**Known limits that apply to us:**
- Lie detectors trained on one kind of lie often fail on others.
- There's no agreed definition of what a model "believes," so we use ground-truth game state and action records.
- Models may behave differently when they notice they're being tested.
- A game is a contrived setting, which is why experiment 5 matters.



## Demos

- Live Mafia game between agents
- Beginner vs. experienced agent side by side
- Bluff card game where the class votes on whether the model is lying
- Private reasoning shown after each round
- Dashboard showing each notebook update, gate decisions, claim vs. actual outcome, and rollback
- Generation-by-generation chart of win rate, false-success rate, and detector catch rates

## Ethics

Deception happens only inside games where it's part of the rules. Human players will know they're playing an AI and give consent; check with the instructor whether any approval is needed. The goal is detecting and preventing deception, not building deceptive tools.

## Planned repo structure

```
agent-deception-drift/
├── game/          # Mafia engine and roles
├── agents/        # prompts, reflection, strategy notebook
├── detectors/     # LLM judge, text classifier, state checks
├── gate/          # score-only vs. honesty-aware gate, grader, rollback
├── transfer/      # honest tasks with ground-truth records
├── experiments/   # configs and run scripts
├── results/       # logs, metrics, plots
├── demo/          # live game, human play, dashboard
├── PLAN.md
└── README.md
```

## Key references

- Shao et al., *Your Agent May Misevolve* (2025/2026)
- Zhang et al., *Darwin Gödel Machine* (2025/2026)
- Shinn et al., *Reflexion* (2023)
- MacDiarmid et al., *Natural Emergent Misalignment from Reward Hacking* (2025)
- Kretschmar et al., *Liars' Bench* (2025/2026)
- Ren et al., *The MASK Benchmark* (2025)
- Advani, *From Confident Closing to Silent Failure* (2026)
- *Reward Hacking in Self-Improving Code Agents* (ICLR 2026)
- *Auditing Harness Tampering in Self-Improving Agents* (2026)
- Update gates: VaG, SAGE, SKILL.nb, Self-Harness (2026)
- DecepEval, KnownLieBench (2026)
- Prior LLM work on Werewolf, Avalon, Hoodwinked: to review
