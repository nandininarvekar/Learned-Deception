import { useCallback, useEffect, useRef, useState } from "react";
import { parseEvent, type GameEvent } from "../types/events";

// Thin client for Sky's FastAPI server (src/mafia_lab/api.py).

export interface GameSummary {
  game_id: string;
  done: boolean;
}

export interface StartOptions {
  provider: "mock" | "openrouter" | "codex";
  players: 4 | 8 | 12;
  showcase: boolean;
  delay: number;
}

async function json<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, init);
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.detail ?? `${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<T>;
}

export const listGames = () => json<{ games: GameSummary[] }>("/api/games").then((r) => r.games);

export const startGame = (o: StartOptions) =>
  json<{ game_id: string }>("/api/games", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      seed: Math.floor(Math.random() * 100000),
      players: o.players,
      provider: o.provider,
      showcase: o.showcase,
      delay: o.delay,
      // Learning stays off for demo games so they never touch experiment memory.
      learning: "off",
      series: "lab",
    }),
  }).then((r) => r.game_id);

export const controlGame = (id: string, command: "pause" | "resume" | "cancel") =>
  json(`/api/games/${id}/${command}`, { method: "POST" });

export type StreamStatus = "idle" | "connecting" | "live" | "done" | "error";

export interface InvalidEvent {
  error: string;
  raw: unknown;
}

/**
 * Streams every event of one game over the WebSocket. The server first sends all
 * past events, then live ones, then `stream_ended`, so the same code handles live
 * games and replays. We always request the spectator stream; the reducer hides
 * privileged events in player view.
 */
export function useGameStream(gameId: string | undefined) {
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [status, setStatus] = useState<StreamStatus>("idle");
  const [invalid, setInvalid] = useState<InvalidEvent[]>([]);
  const seen = useRef(new Set<string>());

  const reset = useCallback(() => {
    seen.current = new Set();
    setEvents([]);
    setInvalid([]);
  }, []);

  useEffect(() => {
    reset();
    if (!gameId) {
      setStatus("idle");
      return;
    }
    let closed = false;
    let finished = false;
    let retries = 0;
    let socket: WebSocket | undefined;
    let pending: GameEvent[] = [];
    let flushTimer: number | undefined;

    // Batch incoming events so a replay of hundreds of events renders once, not hundreds of times.
    const flush = () => {
      flushTimer = undefined;
      if (!pending.length) return;
      const batch = pending;
      pending = [];
      setEvents((prev) => [...prev, ...batch]);
    };

    const open = () => {
      setStatus("connecting");
      const protocol = location.protocol === "https:" ? "wss:" : "ws:";
      socket = new WebSocket(`${protocol}//${location.host}/ws/games/${gameId}?spectator=true`);
      socket.onopen = () => {
        retries = 0;
        setStatus("live");
      };
      socket.onmessage = (message) => {
        let raw: unknown;
        try {
          raw = JSON.parse(message.data as string);
        } catch {
          setInvalid((prev) => [...prev, { error: "Message is not JSON", raw: message.data }]);
          return;
        }
        const type = (raw as { type?: string }).type;
        if (type === "heartbeat") return;
        if (type === "stream_ended") {
          finished = true;
          flush();
          setStatus("done");
          return;
        }
        const parsed = parseEvent(raw);
        if (!parsed.ok) {
          setInvalid((prev) => [...prev, { error: parsed.error, raw: parsed.raw }]);
          return;
        }
        if (seen.current.has(parsed.event.event_id)) return; // replayed after a reconnect
        seen.current.add(parsed.event.event_id);
        pending.push(parsed.event);
        if (flushTimer === undefined) flushTimer = window.setTimeout(flush, 50);
      };
      socket.onclose = () => {
        if (closed || finished) return;
        if (retries < 5) {
          retries += 1;
          setStatus("connecting");
          window.setTimeout(() => !closed && open(), 1000 * retries);
        } else {
          setStatus("error");
        }
      };
    };
    open();

    return () => {
      closed = true;
      if (flushTimer !== undefined) window.clearTimeout(flushTimer);
      socket?.close();
    };
  }, [gameId, reset]);

  return { events, status, invalid };
}
