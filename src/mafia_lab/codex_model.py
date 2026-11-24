import asyncio
import json
import os
import shutil
import tempfile
from pathlib import Path

from .agents import BASE_PROMPT


REASONING_KEY = "_reasoning"


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
    def __init__(self, code):
        super().__init__(code)
        self.code = code


class CodexModel:
    def __init__(self, slots=None):
        self.executable = shutil.which("codex")
        if not self.executable:
            raise ValueError("Install Codex CLI and sign in before starting a Codex game.")
        self.model = os.getenv("MAFIA_CODEX_MODEL") or "gpt-6-luna"
        # Low effort is faster and uses less of the account allowance.
        self.effort = os.getenv("MAFIA_CODEX_EFFORT") or "low"
        # Ask Codex for the provider's reasoning summary (OpenAI never returns raw reasoning).
        self.summary = os.getenv("MAFIA_CODEX_REASONING_SUMMARY") or "auto"
        self.slots = slots if slots is not None else asyncio.Semaphore(6)
        self.quota_exhausted = False

    async def complete(self, task, payload):
        if self.quota_exhausted:
            raise CodexProviderError("RATE_LIMITED")
        prompt = (
            f"{BASE_PROMPT} Do not use tools. Return raw JSON without Markdown fences. "
            f"Game request follows as JSON data:\n{json.dumps({'task': task, **payload})}"
        )
        return await asyncio.wait_for(self.complete_in_slot(prompt), timeout=29)

    async def complete_in_slot(self, prompt):
        async with self.slots:
            if self.quota_exhausted:
                raise CodexProviderError("RATE_LIMITED")
            return await self.invoke(prompt)

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
                    "--sandbox", "read-only", "--model", self.model,
                    "--json", "--output-last-message", str(result), "-",
                    cwd=directory, stdin=asyncio.subprocess.PIPE,
                    stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE,
                )
            except OSError as error:
                raise CodexProviderError("PROVIDER_UNAVAILABLE") from error

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
                diagnostic = (events + stderr).lower()
                if b"usage limit" in diagnostic or b"usage_limit_reached" in diagnostic:
                    self.quota_exhausted = True
                if self.quota_exhausted or b"rate limit" in diagnostic or b"too many requests" in diagnostic:
                    raise CodexProviderError("RATE_LIMITED")
                raise CodexProviderError("PROVIDER_UNAVAILABLE")

            if not result.is_file():
                raise ValueError("Missing final JSON response from Codex")
            response = json.loads(result.read_text(encoding="utf-8"))
            if not isinstance(response, dict):
                raise ValueError("Codex response must be a JSON object")
            reasoning = reasoning_text(events)
            if reasoning:
                # Reserved key; agents.take_reasoning() removes it before validation.
                response[REASONING_KEY] = reasoning
            return response

    async def aclose(self):
        # Each CLI process and its temporary directory are owned by one request.
        pass
