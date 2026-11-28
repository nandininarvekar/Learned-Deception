import { useState } from "react";
import type { GameSummary, StartOptions, StreamStatus } from "../data/api";

interface Props {
  games: GameSummary[];
  gameId?: string;
  status: StreamStatus;
  spectator: boolean;
  phaseLabel: string;
  winner: string | null | undefined;
  defaulted: number;
  claimsDropped: number;
  onSelect: (id: string | undefined) => void;
  onRefresh: () => void;
  onStart: (options: StartOptions) => void;
  onSpectator: (on: boolean) => void;
  onControl: (command: "pause" | "resume" | "cancel") => void;
  error?: string;
  presentation: boolean;
  onPresentation: (on: boolean) => void;
}

const STATUS_LABEL: Record<StreamStatus, string> = {
  idle: "No game",
  connecting: "Connecting…",
  live: "Live",
  done: "Replay",
  error: "Disconnected",
};

export function Header(props: Props) {
  const [options, setOptions] = useState<StartOptions>({ provider: "mock", players: 8, showcase: true, delay: 0.3 });
  const running = props.status === "live" || props.status === "connecting";
  const result =
    props.winner === undefined ? null : props.winner === "mafia" ? "Mafia wins" : props.winner === "villagers" ? "Villagers win" : "Ended";

  return (
    <header className="header">
      <div className="brand">
        <h1>Mafia Lab</h1>
        <span className="muted">Learned Deception</span>
      </div>

      <div className="controls" hidden={props.presentation}>
        <select
          value={props.gameId ?? ""}
          onChange={(e) => props.onSelect(e.target.value || undefined)}
          aria-label="Choose a game"
        >
          <option value="">Choose a game…</option>
          {props.games.map((g) => (
            <option key={g.game_id} value={g.game_id}>
              {g.game_id.slice(0, 8)} {g.done ? "(finished)" : "(running)"}
            </option>
          ))}
        </select>
        <button className="ghost" onClick={props.onRefresh} title="Refresh game list">
          ↻
        </button>

        <span className="divider" />

        <select
          value={options.provider}
          onChange={(e) => setOptions({ ...options, provider: e.target.value as StartOptions["provider"] })}
          aria-label="Model provider"
        >
          <option value="mock">Mock agents</option>
          <option value="openrouter">OpenRouter</option>
          <option value="codex">Codex CLI</option>
        </select>
        <select
          value={options.players}
          onChange={(e) => setOptions({ ...options, players: Number(e.target.value) as StartOptions["players"] })}
          aria-label="Number of players"
        >
          <option value={4}>4 players</option>
          <option value={8}>8 players</option>
          <option value={12}>12 players</option>
        </select>
        <label className="inline" title="Showcase games probe beliefs and record predictions (more model calls)">
          <input
            type="checkbox"
            checked={options.showcase}
            onChange={(e) => setOptions({ ...options, showcase: e.target.checked })}
          />
          Showcase
        </label>
        <button className="primary" onClick={() => props.onStart(options)}>
          Start game
        </button>
        {running && props.gameId && (
          <>
            <button className="ghost" onClick={() => props.onControl("pause")}>Pause</button>
            <button className="ghost" onClick={() => props.onControl("resume")}>Resume</button>
          </>
        )}

        <span className="divider" />

        <label className="inline switch" title="Spectator view shows roles, beliefs, thoughts and private actions">
          <input type="checkbox" checked={props.spectator} onChange={(e) => props.onSpectator(e.target.checked)} />
          Spectator view
        </label>
      </div>

      <div className="status-line">
        <button className={"ghost" + (props.presentation ? " on" : "")} onClick={() => props.onPresentation(!props.presentation)} title="Graph only, with the current message in the middle (for the talk)">
          {props.presentation ? "Exit presentation" : "Presentation mode"}
        </button>
        <span className={`pill pill-${props.status}`}>{STATUS_LABEL[props.status]}</span>
        <span className="phase">{props.phaseLabel}</span>
        {result && <span className="pill pill-result">{result}</span>}
        {props.spectator && props.defaulted > 0 && (
          <span className="pill pill-warn" title="Actions replaced by a default after model failures">
            {props.defaulted} defaulted actions
          </span>
        )}
        {props.spectator && props.claimsDropped > 0 && (
          <span className="pill pill-warn" title="Claims written in a broken format were removed; the messages were kept">
            {props.claimsDropped} claims dropped
          </span>
        )}
        {props.error && <span className="pill pill-warn">{props.error}</span>}
      </div>
    </header>
  );
}
