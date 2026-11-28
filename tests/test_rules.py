"""Game-rule tests: night first, speaking in turn, runoff votes, day limits, no draws, no leaks.

All games use the free mock agents. Each test runs in a temporary folder, so nothing is written
to the real runs/ directory.
"""
import asyncio
import json

import pytest

from mafia_lab import codex_model
from mafia_lab.game import Game
from mafia_lab.schema import DEFAULT_MAX_DAYS, Start


@pytest.fixture(autouse=True)
def temp_runs(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)


def start(**overrides):
    settings = dict(seed=1000, players=8, learning="off", provider="mock", showcase=True,
                    notebook=True, delay=0, series="test")
    return Start(**{**settings, **overrides})


async def play(**overrides):
    game = Game(start(**overrides))
    await game.run()
    return game


def of_type(game, kind):
    return [e for e in game.events if e["type"] == kind]


# --- 4. Each game starts with a night -----------------------------------------------------------

async def test_day_one_opens_with_a_night():
    game = await play()
    phases = [e["phase"] for e in of_type(game, "phase_changed")]
    assert phases[0] == "night_action"
    assert phases[1] == "day_discussion"
    first_night = of_type(game, "night_resolved")[0]
    first_message = of_type(game, "public_message")[0]
    assert first_night["day"] == 1
    assert game.events.index(first_night) < game.events.index(first_message)


async def test_notebooks_are_written_from_the_second_night():
    for seed in range(1000, 1030):
        game = await play(seed=seed)
        if game.day >= 2:
            break
    days = {e["day"] for e in of_type(game, "notebook_updated")}
    assert days and min(days) == 2


# --- 3. Players speak one after another ---------------------------------------------------------

async def test_each_speaker_sees_the_messages_before_their_turn():
    game = await play()
    requests = [e for e in game.events if e["type"] == "protocol_exchange"
                and e["request"]["type"] == "action_requested" and e["phase"] == "day_discussion"]
    checked = 0
    for message in of_type(game, "public_message"):
        # The speaker's request must come after every earlier message of the same round...
        later = [r for r in requests if r["actor_id"] == message["actor_id"]
                 and r["day"] == message["day"] and r["discussion_round"] == message["discussion_round"]]
        seen = {e["event_id"] for e in later[-1]["request"]["payload"]["observation"]["public_history"]}
        earlier = [m for m in of_type(game, "public_message") if m["day"] == message["day"]
                   and m["discussion_round"] == message["discussion_round"]
                   and game.events.index(m) < game.events.index(message)]
        # ...and see all of them.
        assert {m["event_id"] for m in earlier} <= seen
        checked += len(earlier)
    assert checked > 0, "no round had two speakers to compare"


# --- 1. Runoff vote for ties --------------------------------------------------------------------

def scripted_votes(game, rounds):
    """Replace the agents' votes with a fixed script: one list of target names per voting round."""
    calls = iter(rounds)

    async def collect(order, candidates=None):
        targets = next(calls)
        return [dict(actor_id=p, target_id=t, forced=False) for p, t in zip(order, targets)]

    game.collect_votes = collect


async def test_a_tie_goes_to_a_runoff_that_decides():
    game = Game(start(players=4))
    alive = sorted(game.alive)
    a, b = alive[0], alive[1]
    scripted_votes(game, [[b, a, a, b], [b, a, b, b]])  # 2-2 tie, then the runoff picks b
    await game.vote()
    first, second = of_type(game, "vote_results")
    assert first["eliminated_player_id"] is None
    assert first["runoff_candidates"] == sorted([a, b])
    assert second["runoff"] is True and second["eliminated_player_id"] == b
    assert second["tie_break"] is None
    assert b not in game.alive


async def test_a_tied_runoff_is_broken_by_the_seed():
    picks = set()
    for seed in range(20):
        game = Game(start(players=4, seed=seed))
        alive = sorted(game.alive)
        a, b = alive[0], alive[1]
        scripted_votes(game, [[b, a, a, b], [b, a, a, b]])  # tied twice
        await game.vote()
        result = of_type(game, "vote_results")[-1]
        assert result["tie_break"] == "random"
        assert result["eliminated_player_id"] in (a, b)
        picks.add(result["eliminated_player_id"] == a)
    assert picks == {True, False}, "the seeded pick should not always choose the same side"


async def test_no_votes_still_eliminates_no_one():
    game = Game(start(players=4))
    scripted_votes(game, [[None, None, None, None]])
    await game.vote()
    (result,) = of_type(game, "vote_results")
    assert result["eliminated_player_id"] is None
    assert len(game.alive) == 4


# --- 2. Day limit by size -----------------------------------------------------------------------

@pytest.mark.parametrize("players", [4, 8, 12])
def test_day_limit_defaults_to_the_game_size(players):
    assert Game(start(players=players)).max_days == DEFAULT_MAX_DAYS[players]


def test_an_explicit_day_limit_is_kept():
    assert Game(start(players=12, max_days=4)).max_days == 4


@pytest.mark.parametrize("players", [8, 12])
async def test_mock_games_no_longer_end_in_draws(players):
    # Before these fixes, 12-player mock games ended in a draw 23 times out of 40.
    winners = [(await play(players=players, seed=seed, showcase=False, notebook=False)).winner
               for seed in range(1000, 1020)]
    assert winners.count(None) <= 1


# --- Information boundaries ---------------------------------------------------------------------

async def test_players_never_see_other_players_private_information():
    game = await play(players=8)
    roles = next(e for e in game.events if e["type"] == "roles_assigned")["roles"]
    for e in game.events:
        if e["type"] != "protocol_exchange" or "observation" not in e["request"]["payload"]:
            continue
        observation = e["request"]["payload"]["observation"]
        me = observation["self"]["agent_id"]
        text = json.dumps(observation)
        assert '"roles"' not in text
        private_types = {"roles_assigned", "setup_details", "belief_probe", "strategy_summary", "notebook_updated",
                         "pre_message_prediction", "night_kill", "investigation_result", "moment_saved"}
        for event in observation["public_history"]:
            assert event["type"] not in private_types
        teammates = {f["agent_id"] for f in observation["private_facts"] if f["type"] == "mafia_teammate"}
        if roles[me] != "mafia":
            assert not teammates


# --- 5. Codex reliability -----------------------------------------------------------------------

def fake_codex(behaviours, monkeypatch):
    """A CodexModel without the CLI: each call to invoke() takes the next behaviour."""
    monkeypatch.setattr(codex_model, "ATTEMPT_TIMEOUT", 0.05)
    model = codex_model.CodexModel.__new__(codex_model.CodexModel)
    model.slots = asyncio.Semaphore(codex_model.CONCURRENCY)
    model.retries = 0
    model.model, model.effort = "fake-model", "low"
    model.quota_exhausted = False
    steps = iter(behaviours)

    async def invoke(prompt):
        kind = next(steps)
        if kind == "hang":
            await asyncio.sleep(1)
        return {"ok": True}, {"input_tokens": 100, "output_tokens": 20}

    model.invoke = invoke
    return model


async def test_a_timed_out_codex_call_is_retried_once(monkeypatch):
    model = fake_codex(["hang", "answer"], monkeypatch)
    assert await model.complete("task", {}) == {"ok": True}
    assert model.retries == 1


async def test_a_codex_call_that_times_out_twice_fails(monkeypatch):
    model = fake_codex(["hang", "hang"], monkeypatch)
    with pytest.raises(asyncio.TimeoutError):
        await model.complete("task", {})


def test_codex_defaults():
    assert codex_model.CONCURRENCY == 5
    assert codex_model.ATTEMPT_TIMEOUT == 60
    assert codex_model.ATTEMPTS == 2
    assert codex_model.CodexModel.request_timeout >= codex_model.ATTEMPT_TIMEOUT * codex_model.ATTEMPTS
