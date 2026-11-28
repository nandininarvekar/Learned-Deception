# 12-player Mafia training

The three modes have separate, stable cohorts. Role assignments are seeded and change between games.

| Players | Mafia | Detective | Villagers |
|---|---:|---:|---:|
| 4 | 1 | 1 | 2 |
| 8 | 2 | 1 | 5 |
| 12 | 3 | 1 | 8 |

Each day starts with a night (Mafia kill, Detective investigation), then three discussion rounds in which players speak one at a time and each sees the messages before their turn, then a vote. A tied vote goes to a runoff between the tied players; if the runoff also ties, the game seed picks one of them. The day limit depends on the size (4 players: 3 days, 8: 6, 12: 8) unless `--max-days` sets it. Each recurring identity keeps its own lessons and opponent impressions, scoped to series, provider, condition, cohort, and role. The game notebook is private and resets each game. Existing six-player logs can still be opened as replays.

## Live training

From the project root, with the Python dependencies installed and the Codex CLI signed in:

```sh
PYTHONPATH=src python3 -m mafia_lab.train --provider codex --series luna-12
```

This uses `gpt-6-luna` by default. Preflight requires one verified JSON response before the first match. Each valid game runs 12 postgame reflections. The CLI saves results and resumes from the same series when rerun with the same configuration. The run stops at the first confirmed quota exhaustion, initialization failure, or two consecutive incomplete games. Use `--games 1` for a bounded trial. There is no automatic retry after quota resets.

Game logs live under `runs/games/`. The run's settings, results and current status go to `runs/training/luna-12/codex/all/`. Private memory and `skill.md` live under `runs/memory/luna-12/codex/all/12/`. If quota runs out during postgame reflection, successful revisions already written are retained and the run records the number of saved revisions. Games with defaulted gameplay actions are excluded from learning.

## Mock control run

```sh
PYTHONPATH=src python3 -m mafia_lab.train --provider mock --series 12p-smoke --learning off --games 20
PYTHONPATH=src python3 -m mafia_lab.train --provider mock --series 12p-smoke --learning all --games 20
```

These two runs predate the rule changes above (night first, turn-taking, runoff votes, size-based day limits). Both used seeds 1000–1019 and a five-day cap, with showcase and notebook probes disabled. The mock policy ignores learned memory when choosing moves, so matching game outcomes are expected. This comparison verifies persistence and measurement. A learning-effect estimate requires model-driven games and a held-out evaluation.

| Condition | Games | Mafia wins | Villager wins | Draws | Defaulted actions | Memory updates |
|---|---:|---:|---:|---:|---:|---:|
| Mock, memory off | 20 | 8 | 0 | 12 | 0 | 0 |
| Mock, all agents reflect | 20 | 8 | 0 | 12 | 0 | 240 |

Each condition recorded 126 false structured Mafia claims and 214 votes for Mafia out of 635 non-abstaining town votes. These counts describe the mock game. The win split and frequent day-cap draws are worth checking before choosing a realistic evaluation horizon.

The Mac execution session reached Codex login status but its CLI failed to initialize with `Operation not permitted` even when the state database and logs were redirected to a writable directory. The training run recorded `preflight_failed: CODEX_INIT_FAILED`. It did not reach inference, play a live game, or exhaust the account allowance.
