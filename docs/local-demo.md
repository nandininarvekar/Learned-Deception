# Local demo

Run from the repository root with Python 3.10 or newer.

```sh
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -e .
python -m uvicorn mafia_lab.api:app --host 127.0.0.1 --port 8765
```

Open [Mafia Lab](http://127.0.0.1:8765) and select **Start simulation**. The default is a six-player seeded mock game. Use **Spectator view** for private strategy reports, roles, belief probes, and postgame memories. **Replay** opens an existing game's event stream. The API also accepts four-player games.

The app is a loopback-only demo. Spectator view exposes private research data to the local operator. Run it with one Uvicorn worker. Completed game logs are under `runs/games/`. Memory versions and each agent's rendered `skill.md` are under `runs/memory/`. The series, model provider mode, and learning mode partition memory. For independent experimental runs, use distinct series IDs. The mock simulation illustrates the UI and protocol.

To try actual inference later, set `OPENROUTER_API_KEY` and `OPENROUTER_MODEL` in the server environment. Optionally set `OPENROUTER_PROVIDER` to pin the upstream provider. Start a game using the HTTP API with `{"provider":"openrouter","series":"pilot","showcase":false}`, then choose the game from the replay dropdown after reloading. The frontend starts mock games by default. Provider-specific behavior requires a live pilot before collecting results.

[Agent–backend protocol proposal](agent-backend-protocol.md)

## Codex CLI provider

Sign in with `codex login` and make sure `codex` is on the server's PATH.
The default model is `gpt-6-luna`. Set `MAFIA_CODEX_MODEL` in the server
environment to select a different model. Model calls use the signed-in
CLI's account allowance.

Start a short live game and select its ID from the replay dropdown.

```sh
curl -fsS http://127.0.0.1:8765/api/games \
  -H 'Content-Type: application/json' \
  -d '{"provider":"codex","players":4,"max_days":1,"delay":0,"series":"codex-pilot","showcase":false}'
```

Set `"showcase":true` to include self-reported strategies, belief probes,
and prepublication predictions. These increase the number of model calls.
Each worker allows up to six concurrent Codex requests. The replay may
include defaulted actions after provider or model-output failures. Private
JSONL logs record the protocol failure codes.
