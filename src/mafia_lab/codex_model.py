import asyncio
import json
import os
import re
import shutil
import tempfile
from pathlib import Path

import time

from .agents import BASE_PROMPT
from .telemetry import prompt_hash, record


REASONING_KEY = "_reasoning"


def usage_of(stdout):
    """Token counts from the `turn.completed` event of `codex exec --json`."""
    for line in reversed(stdout.decode("utf-8", "replace").splitlines()):
        try:
            event = json.loads(line)
        except ValueError:
            continue
        if isinstance(event, dict) and event.get("type") == "turn.completed":
            return event.get("usage") or {}
    return {}


def reasoning_text(stdout):
    """Collect reasoning-summary text from `codex exec --json` output (one JSON event per line)."""
    parts = []
    for line in stdout.decode("utf-8", "replace").splitlines():
        try:
            event = json.loads(line)
        except ValueError:
            continue
        item = event.get("item") if isinstance(event, dict) else None
        if not isinstance(item, dict) or item.get("type") != "reasoning":
            continue
        if not str(event.get("type", "")).endswith("completed"):
            continue
        text = item.get("text") or item.get("summary")
        if isinstance(text, list):
            text = "\n".join(str(t.get("text", t)) if isinstance(t, dict) else str(t) for t in text)
        if isinstance(text, str) and text.strip():
            parts.append(text.strip())
    return "\n\n".join(parts)


class CodexProviderError(Exception):
    def __init__(self, code, detail=""):
        super().__init__(detail or code)
        self.code = code


def failure_detail(events, stderr, returncode):
    messages = []
    for line in events.splitlines():
        try:
            event = json.loads(line)
        except (ValueError, UnicodeDecodeError):
            continue
        if isinstance(event, dict) and event.get("type") in {"error", "turn.failed"}:
            error = event.get("error", event)
            message = error.get("message") if isinstance(error, dict) else error
            if isinstance(message, str) and message.strip():
                messages.append(message)
    if messages:
        detail = messages[-1]
    else:
        lines = stderr.decode("utf-8", "replace").splitlines()
        errors = [line for line in lines if "error" in line.lower() or "failed" in line.lower()]
        detail = (errors or lines or [f"Codex exited with status {returncode}"])[-1]
    detail = re.sub(r"(?i)bearer\s+[\w./+=-]+|sk-[\w-]+", "[redacted]", detail)
    detail = re.sub(r"https?://[^\s]+", "[endpoint]", detail)
    return " ".join(detail.split())[:600]


# Fewer Codex processes at once: six in parallel made each call slower (median 14 s on Nov 27)
# and pushed many past the time limit, so turns were lost to defaults.
# Six caused slowdowns; five keeps parallel phases (belief checks, votes, notebooks) quick.
CONCURRENCY = int(os.getenv("MAFIA_CODEX_CONCURRENCY") or 5)
ATTEMPT_TIMEOUT = 60  # seconds for one Codex process
ATTEMPTS = 2  # one retry after a timeout


class CodexModel:
    # The real limit is per attempt (above). This outer limit is only a safety net and also covers
    # waiting for a free slot: in a 12-player vote, 12 calls share CONCURRENCY slots.
    request_timeout = 300

    def __init__(self, slots=None):
        self.executable = shutil.which("codex")
        if not self.executable:
            raise ValueError("Install Codex CLI and sign in before starting a Codex game.")
        self.model = os.getenv("MAFIA_CODEX_MODEL") or "gpt-6-luna"
        # Low effort is faster and uses less of the account allowance.
        self.effort = os.getenv("MAFIA_CODEX_EFFORT") or "low"
        # Ask Codex for the provider's reasoning summary (OpenAI never returns raw reasoning).
        self.summary = os.getenv("MAFIA_CODEX_REASONING_SUMMARY") or "auto"
        self.slots = slots if slots is not None else asyncio.Semaphore(CONCURRENCY)
        self.retries = 0  # timeouts recovered by a retry, for diagnostics
        self.quota_exhausted = False

    async def complete(self, task, payload):
        if self.quota_exhausted:
            raise CodexProviderError("RATE_LIMITED")
        prompt = (
            f"{BASE_PROMPT} Do not use tools. Return raw JSON without Markdown fences. "
            f"Game request follows as JSON data:\n{json.dumps({'task': task, **payload})}"
        )
        entry = dict(backend="codex", model=self.model, effort=self.effort,
                     prompt_hash=prompt_hash(BASE_PROMPT, task))
        started = time.monotonic()
        try:
            result, usage = await self.complete_in_slot(prompt)
        except Exception as error:
            record({**entry, "seconds": round(time.monotonic() - started, 2), "error": type(error).__name__})
            raise
        record({**entry, "seconds": round(time.monotonic() - started, 2),
                "input_tokens": usage.get("input_tokens"), "cached_input_tokens": usage.get("cached_input_tokens"),
                "output_tokens": usage.get("output_tokens"), "reasoning_tokens": usage.get("reasoning_output_tokens"),
                "attempts": usage.get("attempts", 1)})
        return result

    async def complete_in_slot(self, prompt):
        async with self.slots:
            for attempt in range(ATTEMPTS):
                if self.quota_exhausted:
                    raise CodexProviderError("RATE_LIMITED")
                try:
                    result, usage = await asyncio.wait_for(self.invoke(prompt), timeout=ATTEMPT_TIMEOUT)
                    return result, {**usage, "attempts": attempt + 1}
                except asyncio.TimeoutError:
                    if attempt == ATTEMPTS - 1:
                        raise
                    self.retries += 1

    async def invoke(self, prompt):
        with tempfile.TemporaryDirectory(prefix="mafia-codex-") as directory:
            result = Path(directory) / "result.json"
            try:
                process = await asyncio.create_subprocess_exec(
                    self.executable, "-a", "never", "exec",
                    "--ephemeral", "--ignore-user-config", "--ignore-rules",
                    "--skip-git-repo-check", "--disable", "shell_tool",
                    "--disable", "hooks", "-c", 'web_search="disabled"',
                    "-c", f'model_reasoning_effort="{self.effort}"',
                    "-c", f'model_reasoning_summary="{self.summary}"',
                    "--sandbox", "read-only",
                    *(("--model", self.model) if self.model != "cli-default" else ()),
                    "--json", "--output-last-message", str(result), "-",
                    cwd=directory, stdin=asyncio.subprocess.PIPE,
                    stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE,
                )
            except OSError as error:
                raise CodexProviderError("PROVIDER_UNAVAILABLE", error.strerror) from error

            try:
                events, stderr = await process.communicate(prompt.encode("utf-8"))
            finally:
                if process.returncode is None:
                    try:
                        process.kill()
                    except ProcessLookupError:
                        pass
                    await process.wait()

            if process.returncode:
                detail = failure_detail(events, stderr, process.returncode)
                diagnostic = (events + stderr).lower()
                if b"usage limit" in diagnostic or b"usage_limit_reached" in diagnostic:
                    self.quota_exhausted = True
                if self.quota_exhausted or b"rate limit" in diagnostic or b"too many requests" in diagnostic:
                    raise CodexProviderError("RATE_LIMITED", detail)
                if b"model_not_in_accessible_catalog" in diagnostic or b"model_not_found" in diagnostic:
                    raise CodexProviderError("MODEL_UNAVAILABLE", detail)
                if b"failed to initialize in-process app-server client" in diagnostic:
                    raise CodexProviderError("CODEX_INIT_FAILED", detail)
                raise CodexProviderError("PROVIDER_UNAVAILABLE", detail)

            if not result.is_file():
                raise ValueError("Missing final JSON response from Codex")
            response = json.loads(result.read_text(encoding="utf-8"))
            if not isinstance(response, dict):
                raise ValueError("Codex response must be a JSON object")
            reasoning = reasoning_text(events)
            if reasoning:
                # Reserved key; agents.take_reasoning() removes it before validation.
                response[REASONING_KEY] = reasoning
            return response, usage_of(events)

    async def aclose(self):
        # Each CLI process and its temporary directory are owned by one request.
        pass
