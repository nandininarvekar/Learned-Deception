import asyncio
import json
import re
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from starlette.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .agents import Model
from .codex_model import CONCURRENCY, CodexModel
from .game import Game, RUNS
from .schema import Start

games = {}
tasks = {}
codex_slots = asyncio.Semaphore(CONCURRENCY)  # shared by every Codex game on this server
web = Path(__file__).with_name("web")


@asynccontextmanager
async def lifespan(app):
    yield
    for task in tasks.values():
        task.cancel()
    await asyncio.gather(*tasks.values(), return_exceptions=True)


app = FastAPI(title="Learned Deception · Mafia Lab", lifespan=lifespan)
app.add_middleware(TrustedHostMiddleware, allowed_hosts=["127.0.0.1", "localhost", "testserver"])
app.mount("/assets", StaticFiles(directory=web), name="assets")


@app.get("/")
def index():
    return FileResponse(web / "index.html")


def active(game_id):
    game = games.get(game_id)
    if not game:
        raise HTTPException(404, "Active game not found")
    return game


def read_game(game_id):
    if not re.fullmatch("[0-9a-f]{32}", game_id):
        raise HTTPException(404, "Game not found")
    if game_id in games:
        return games[game_id].events, games[game_id].done.is_set()
    path = RUNS / "games" / f"{game_id}.jsonl"
    if not path.exists():
        raise HTTPException(404, "Game not found")
    return [json.loads(line) for line in path.read_text().splitlines()], True


def visible(event, spectator):
    if event["type"] == "protocol_exchange":
        return False
    return spectator or event["visibility"] == "public"


@app.post("/api/games", status_code=201)
async def start(config: Start):
    if any(not g.done.is_set() and g.config.series == config.series and
           g.config.learning == config.learning and g.config.provider == config.provider
           and g.config.players == config.players
           and config.learning != "off" for g in games.values()):
        raise HTTPException(409, "Finish the current learning game in this series first.")
    try:
        model = None
        if config.provider == "openrouter":
            model = Model()
        elif config.provider == "codex":
            model = CodexModel(codex_slots)
        game = Game(config, model)
    except ValueError as e:
        raise HTTPException(422, str(e)) from e
    games[game.id] = game
    tasks[game.id] = asyncio.create_task(game.run())
    return {"game_id": game.id}


@app.get("/api/games")
def list_games():
    # Newest first, ordered by when each game started, so games from this server run and
    # earlier runs sort together and the UI can number them (#1 = oldest).
    ids = set(games) | {p.stem for p in (RUNS / "games").glob("*.jsonl")}
    rows = []
    for game_id in ids:
        items, done = read_game(game_id)
        rows.append((items[0]["timestamp_utc"] if items else "", game_id, done))
    rows.sort(reverse=True)
    return {"games": [{"game_id": game_id, "done": done} for _, game_id, done in rows]}


@app.get("/api/games/{game_id}/events")
def events(game_id: str, spectator: bool = False):
    items, done = read_game(game_id)
    return {"events": [e for e in items if visible(e, spectator)], "done": done}


@app.post("/api/games/{game_id}/{command}")
async def control(game_id: str, command: str):
    game = active(game_id)
    if game.done.is_set():
        raise HTTPException(409, "Game is complete")
    if command == "pause":
        game.paused.clear()
    elif command == "resume":
        game.paused.set()
    elif command == "cancel":
        tasks[game_id].cancel()
    else:
        raise HTTPException(404, "Unknown command")
    return {"status": command}


@app.websocket("/ws/games/{game_id}")
async def watch(socket: WebSocket, game_id: str, spectator: bool = False):
    try:
        items, done = read_game(game_id)
    except HTTPException:
        await socket.close(code=4404)
        return
    await socket.accept()
    index = 0
    game = games.get(game_id)
    try:
        while True:
            if game:
                game.changed.clear()
                done = game.done.is_set()
            batch = items[index:]
            index += len(batch)
            for event in batch:
                if visible(event, spectator):
                    await socket.send_json(event)
            if done:
                await socket.send_json({"type": "stream_ended"})
                await socket.close()
                return
            try:
                await asyncio.wait_for(game.changed.wait(), timeout=5)
            except asyncio.TimeoutError:
                await socket.send_json({"type": "heartbeat"})
    except (WebSocketDisconnect, OSError, RuntimeError):
        return
