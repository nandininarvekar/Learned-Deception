"""Experiment-setup tests: roles told after a game, personalities, belief checks, call logging,
learning conditions and saved moments. Mock agents only; every test runs in a temporary folder."""
import json
from pathlib import Path

import pytest

from mafia_lab import personas
from mafia_lab.game import Game
from mafia_lab.schema import Start
from mafia_lab.telemetry import CALLS, record


@pytest.fixture(autouse=True)
def temp_runs(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)


def start(**overrides):
    settings = dict(seed=1000, players=8, learning="off", provider="mock", showcase=False,
                    notebook=False, delay=0, series="test")
    return Start(**{**settings, **overrides})


async def play(**overrides):
    game = Game(start(**overrides))
    await game.run()
    return game


def of_type(game, kind):
    return [e for e in game.events if e["type"] == kind]


def requests(game, kind):
    return [e["request"]["payload"] for e in game.events
            if e["type"] == "protocol_exchange" and e["request"]["type"] == kind]


# --- 7. Learners are told everyone's roles after a game ------------------------------------------

async def test_reflection_includes_every_players_role():
    game = await play(learning="one_mafia")
    (reflection,) = requests(game, "reflection_requested")
    told = {d["agent_id"]: d["role"] for d in reflection["feedback"]["role_disclosures"]}
    assert told == game.roles


# --- 8. Personalities -----------------------------------------------------------------------------

async def test_personas_go_to_opponents_only_and_stay_private():
    game = await play(learning="one_mafia", personas="training")
    learner = game.learners[0]
    assert learner not in game.personas
    assert set(game.personas) == set(game.players) - {learner}
    assert {name for name, _ in game.personas.values()} <= set(personas.POOLS["training"])
    details = of_type(game, "setup_details")[0]
    assert details["visibility"] == "privileged"
    # Each player's own persona reaches only that player's observations.
    for payload in requests(game, "action_requested"):
        me = payload["observation"]["self"]["agent_id"]
        persona = payload["observation"]["self"]["persona"]
        assert persona == (game.personas[me][1] if me in game.personas else None)


def test_personas_are_assigned_per_game_not_per_name():
    by_seed = [personas.assign(["A", "B", "C", "D", "E", "F"], set(), "training", seed) for seed in range(20)]
    assert len({tuple(sorted((p, n) for p, (n, _) in a.items())) for a in by_seed}) > 1
    assert by_seed[3] == personas.assign(["A", "B", "C", "D", "E", "F"], set(), "training", 3)


def test_personas_do_not_change_role_assignment():
    with_personas = Game(start(personas="heldout"))
    without = Game(start(personas="off"))
    assert with_personas.roles == without.roles


def test_heldout_pool_differs_from_training_pool():
    assert not set(personas.POOLS["training"]) & set(personas.POOLS["heldout"])


async def test_naive_persona_goes_to_one_villager():
    game = await play(personas="off", naive=True)
    naive = [p for p, (name, _) in game.personas.items() if name == "naive"]
    assert len(naive) == 1 and game.roles[naive[0]] == "villager"


# --- 9. Belief checks in experiment games ---------------------------------------------------------

async def test_experiment_games_record_beliefs_without_showcase():
    game = await play(showcase=False, belief_checks="per_round")
    assert of_type(game, "belief_probe")
    assert all(e["measurement_point"] == "after_discussion_batch" for e in of_type(game, "beliefs_updated"))


async def test_beliefs_can_be_checked_after_every_mafia_message():
    game = await play(belief_checks="per_mafia_message")
    updates = of_type(game, "beliefs_updated")
    mafia_messages = [m for m in of_type(game, "public_message") if game.roles[m["actor_id"]] == "mafia"]
    assert len(updates) == len(mafia_messages) > 0
    assert {u["trigger_event_id"] for u in updates} == {m["event_id"] for m in mafia_messages}


async def test_belief_checks_can_be_turned_off():
    game = await play(belief_checks="off")
    assert not of_type(game, "belief_probe") and not of_type(game, "pre_message_prediction")


# --- 10. Every model call is logged -------------------------------------------------------------

async def test_calls_are_recorded_per_request():
    calls = []
    CALLS.set(calls)
    record({"model": "m", "input_tokens": 10})
    assert calls == [{"model": "m", "input_tokens": 10}]


async def test_each_request_and_the_game_carry_usage():
    game = await play()
    exchanges = of_type(game, "protocol_exchange")
    assert all("seconds" in e and "model_calls" in e for e in exchanges)
    (summary,) = of_type(game, "usage_summary")
    assert summary["model_calls"] == 0  # mock agents make no model calls


# --- 11. Learning conditions --------------------------------------------------------------------

async def run_series(condition, games=3):
    results = []
    for seed in range(1000, 1000 + games):
        results.append(await play(seed=seed, learning="one_mafia", condition=condition, series=condition))
    return results


async def test_c0_never_learns():
    games = await run_series("c0")
    assert all(not of_type(g, "memory_updated") and not requests(g, "reflection_requested") for g in games)
    assert all(g.learners and not g.learning for g in games)


async def test_c2_learns_from_its_own_reflection():
    games = await run_series("c2")
    assert [len(of_type(g, "memory_updated")) for g in games] == [1, 1, 1]
    assert games[-1].memories[games[-1].learners[0]].generalized_memory


async def test_irrelevant_control_reads_unrelated_text_of_the_same_length():
    games = await run_series("irrelevant")
    last = games[-1]
    learner = last.learners[0]
    stored = json.loads((last.memory_dir(learner) / "current.json").read_text())["memory"]["generalized_memory"]
    # The real reflection is stored, but the learner read unrelated text of the same length.
    shown = last.memories[learner].generalized_memory
    assert len(shown) == pytest.approx(len(stored), abs=2)
    assert "Mafia" not in shown and shown != stored


async def test_neutral_summary_control_writes_facts_not_advice():
    games = await run_series("neutral_summary")
    (reflection,) = requests(games[0], "reflection_requested")
    assert reflection["mode"] == "neutral_summary"
    assert games[-1].memories[games[-1].learners[0]].generalized_memory.startswith("Last game:")


# --- 12. Saved moments --------------------------------------------------------------------------

async def test_a_moment_is_saved_before_every_mafia_message():
    game = await play()
    saved = of_type(game, "moment_saved")
    mafia_messages = [m for m in of_type(game, "public_message") if game.roles[m["actor_id"]] == "mafia"]
    assert len(saved) == len(mafia_messages) > 0
    moment = json.loads(Path(saved[0]["path"]).read_text())
    message = next(m for m in mafia_messages if m["candidate_message_id"] == moment["candidate_message_id"])
    assert moment["original_action"]["message"] == message["message"]
    # The saved history ends before the message it was saved for.
    assert message["event_id"] not in {e["event_id"] for e in moment["public_history"]}
    assert set(moment) >= {"roles", "alive", "facts", "notebooks", "personas", "memories", "rng_state", "speaking_order"}


# --- Speed changes (A, B, D, E) -------------------------------------------------------------------

async def test_predictions_use_only_the_history_before_their_message():
    game = await play(belief_checks="per_round")
    messages = {m["candidate_message_id"]: m for m in of_type(game, "public_message")}
    predictions = requests(game, "influence_prediction_requested")
    assert predictions
    for request in predictions:
        message = messages[request["candidate_message_id"]]
        seen = {e["event_id"] for e in request["observation"]["public_history"]}
        assert message["event_id"] not in seen


async def test_players_get_a_slim_history():
    game = await play()
    payload = requests(game, "action_requested")[-1]
    history = payload["observation"]["public_history"]
    assert history and all("timestamp_utc" not in e and "game_id" not in e for e in history)
    assert not any(e["type"] == "phase_changed" for e in history)
    vote = next(e for e in history if e["type"] == "vote_results")
    assert isinstance(vote["votes"], dict)


async def test_beliefs_can_be_checked_once_per_day():
    game = await play(belief_checks="per_day")
    updates = of_type(game, "beliefs_updated")
    days_with_talk = {m["day"] for m in of_type(game, "public_message")}
    assert len(updates) == len(days_with_talk)
    assert all(u["measurement_point"] == "end_of_day" for u in updates)


@pytest.mark.parametrize("rounds", [1, 2, 3])
async def test_discussion_rounds_are_configurable(rounds):
    game = await play(discussion_rounds=rounds)
    assert max(m["discussion_round"] for m in of_type(game, "public_message")) <= rounds
    assert of_type(game, "game_started")[0]["discussion_rounds"] == rounds


def test_two_rounds_is_the_default():
    assert Start().discussion_rounds == 2
