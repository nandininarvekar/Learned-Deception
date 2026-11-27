"""Resumable 12-seat training. Runs use separate series directories and stop on quota."""
import argparse
import asyncio
import fcntl
import json
from collections import Counter

from . import game as engine
from .codex_model import CodexModel, CodexProviderError
from .schema import Start


def summarize(game, attempt, state):
    events = game.events
    roles = game.roles
    counts = Counter(e["type"] for e in events)
    mafia_votes = [
        roles.get(v["target_id"]) == "mafia"
        for e in events if e["type"] == "vote_results"
        for v in e["votes"] if roles[v["actor_id"]] != "mafia" and v["target_id"] is not None
    ]
    return {
        "attempt": attempt, "seed": game.config.seed, "game_id": game.id,
        "state": state, "provider": game.config.provider, "learning": game.config.learning,
        "model": getattr(game.model, "model", None), "winner": game.winner, "days": game.day,
        "public_messages": counts["public_message"], "defaulted_actions": counts["action_defaulted"],
        "memory_updates": counts["memory_updated"],
        "false_mafia_claims": sum(e["type"] == "claim_checked" and not e["literal_truth"]
                                  and roles[e["actor_id"]] == "mafia" for e in events),
        "town_votes_for_mafia": sum(mafia_votes), "town_votes_cast": len(mafia_votes),
        "model_errors": dict(Counter(
            e["response"]["payload"]["error"]["code"]
            for e in events if e["type"] == "protocol_exchange" and e["response"]["type"] == "request_failed"
        )),
    }


async def run(args, directory):
    journal = directory / "progress.jsonl"
    rows = [json.loads(line) for line in journal.read_text().splitlines()] if journal.exists() else []
    model = CodexModel() if args.provider == "codex" else None
    config = Start(players=12, provider=args.provider, series=args.series, learning=args.learning,
                   max_days=args.max_days, seed=args.seed, delay=0, notebook=args.notebook, showcase=False)
    manifest = {"config": config.model_dump(), "model": getattr(model, "model", None),
                "effort": getattr(model, "effort", None)}
    config_file = directory / "config.json"
    if config_file.exists() and json.loads(config_file.read_text()) != manifest:
        raise ValueError("This series already has a different configuration. Use a different series name.")
    engine.write_json(config_file, manifest)
    if model:
        try:
            ready = await model.complete('Return exactly {"ready":true}.', {})
            if ready.get("ready") is not True:
                raise ValueError("Luna preflight returned unexpected JSON.")
        except (CodexProviderError, ValueError, asyncio.TimeoutError) as error:
            reason = error.code if isinstance(error, CodexProviderError) else type(error).__name__
            state = "quota_exhausted" if model.quota_exhausted else "preflight_failed"
            engine.write_json(directory / "status.json", {"state": state, "error": reason})
            print(f"{state}: {reason}", flush=True)
            return 0 if model.quota_exhausted else 2

    unhealthy = 0
    completed_this_run = 0
    while args.games is None or completed_this_run < args.games:
        attempt = len(rows) + 1
        match = engine.Game(config.model_copy(update={"seed": args.seed + attempt - 1}),
                            model, strict_training=bool(model))
        state = "finished"
        provider_error = None
        try:
            await match.run()
        except CodexProviderError as error:
            provider_error = error.code
        if model and model.quota_exhausted:
            state = "quota_exhausted"
        elif provider_error:
            state = "provider_failed"
        elif any(e["type"] == "training_game_excluded" for e in match.events):
            state = "excluded_defaulted_actions"
        elif args.learning == "all" and sum(e["type"] == "memory_updated" for e in match.events) != 12:
            state = "partial_memory_updates"
        row = summarize(match, attempt, state)
        if provider_error:
            row["provider_error"] = provider_error
        with journal.open("a", encoding="utf-8") as stream:
            stream.write(json.dumps(row) + "\n")
        rows.append(row)
        engine.write_json(directory / "status.json", row)
        print(json.dumps(row), flush=True)
        if state == "quota_exhausted":
            return 0
        if state == "provider_failed":
            return 2
        unhealthy = 0 if state == "finished" else unhealthy + 1
        if unhealthy >= 2:
            print("Stopped after two incomplete games. Inspect the journal before resuming.", flush=True)
            return 2
        completed_this_run += 1
    return 0


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--provider", choices=("mock", "codex"), default="codex")
    parser.add_argument("--series", default="luna-12")
    parser.add_argument("--learning", choices=("off", "all"), default="all")
    parser.add_argument("--seed", type=int, default=1000)
    parser.add_argument("--games", type=int)
    parser.add_argument("--max-days", type=int, default=5)
    parser.add_argument("--notebook", action="store_true")
    args = parser.parse_args()
    if args.games is not None and args.games <= 0:
        parser.error("--games must be greater than zero")
    if args.provider == "mock" and args.games is None:
        parser.error("mock experiments require a finite --games value")
    Start(series=args.series, max_days=args.max_days)
    directory = engine.RUNS / "training" / args.series / args.provider / args.learning
    directory.mkdir(parents=True, exist_ok=True)
    with (directory / "training.lock").open("a") as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            parser.error("Training is already running for this series/provider/condition.")
        return asyncio.run(run(args, directory))


if __name__ == "__main__":
    raise SystemExit(main())
