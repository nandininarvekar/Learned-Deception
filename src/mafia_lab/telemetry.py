"""Per-call logging. Each model call records what was asked, of which model, how long it took and
what it cost, so runs can be reproduced and costed per person.

Game.task opens a fresh list in CALLS before handing a request to an agent; the model wrappers
append one record per provider call to it. The list travels with the asyncio task, so calls made
in parallel for different players never mix.
"""
import hashlib
from contextvars import ContextVar

CALLS: ContextVar[list | None] = ContextVar("mafia_lab_calls", default=None)


def record(entry):
    calls = CALLS.get()
    if calls is not None:
        calls.append(entry)


def prompt_hash(*parts):
    """Hash of the fixed instructions (not the game data), so a changed prompt is visible in the logs."""
    return "sha256:" + hashlib.sha256("\n".join(parts).encode("utf-8")).hexdigest()[:16]
