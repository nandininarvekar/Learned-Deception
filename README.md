# Learned Deception

**Do LLM agents get harder to catch as deceivers after learning from experience?**

Research-track project, Agentic AI course (Fall 2026). 

## Question

We study agents that learn from repeated games of Mafia using a frozen model (no fine-tuning), learning only through post-game reflection and a strategy notebook. We ask:

1. Do agents lie more often, or just more convincingly?
2. Do they get harder to catch for other agents, automated detectors, and humans?
3. Does learned deception spread to tasks where honesty is expected?
4. Can an honesty-aware update gate stop it?

## Experiments

**Core**
1. **Baseline:** no memory between games. Measure mafia catch rate, win rate, rounds survived.
2. **Learning:** mafia agents reflect and update a notebook after each game. Track the same metrics over many games.
3. **Detection:** compare catch rates across other agents, an LLM judge, a text classifier, and a state check, per generation.
4. **Humans:** early vs. experienced agent against real people.

**Extension**

5. **Spread:** give the experienced agent honest tasks with a ground-truth record. Measure false-success rate and report-vs-state mismatch.
6. **Honesty-aware gate:** existing update gates check performance, not honesty. Compare a score-only gate with one that rejects notebook updates that raise false-success, checked against evidence with plain code. Also compare hidden vs. visible grader and greedy vs. archive selection.

**Stretch**

7. **Steering:** after each update, check whether the same small human edits still change behavior as expected.

## Gap

Self-evolving agents are known to drift unsafe and to game their scores. But honesty of their own reports is rarely measured, and the strongest deception results come from weight training, not learning through experience. Whether detectors fall behind as an agent evolves is also untested as far as we found.


## Demos

- Live Mafia game between agents
- Beginner vs. experienced agent side by side
- Bluff game where the class votes on whether the model is lying
- Private reasoning shown after each round
- Dashboard of each notebook update, gate decisions, and claim vs. actual outcome

## Ethics

Deception happens only inside games where it's part of the rules. Human players will know they're playing an AI and give consent. The goal is detecting and preventing deception, not building deceptive tools.

## Key references

Misevolution (Shao et al.), Darwin Gödel Machine (Zhang et al.), Reflexion (Shinn et al.), Natural Emergent Misalignment (MacDiarmid et al.), Liars' Bench, MASK, False Success in LLM Agents (Advani), update gates (VaG, SAGE, Self-Harness). Prior work on LLMs in Werewolf/Avalon: to review.


## License

MIT
