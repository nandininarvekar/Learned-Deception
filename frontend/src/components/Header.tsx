import { useState } from "react";
import type { GameSummary, StartOptions, StreamStatus } from "../data/api";
import { NewCase } from "./NewCase";
import { PhaseSteps } from "./PhaseSteps";

interface Props {
  games: GameSummary[];
  gameId?: string;
  status: StreamStatus;
  spectator: boolean;
  phaseLabel: string;
  day: number;
  phase: string;
  round: number | null;
  provider?: string;
  showcase?: boolean;
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
  live: "● Live",
  done: "Replay",
  error: "Disconnected",
};

const PROVIDER_LABEL: Record<string, string> = { mock: "Mock agents", openrouter: "OpenRouter", codex: "Codex CLI" };

function BrandMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <svg width="28" height="28" viewBox="0 0 8 8" shapeRendering="crispEdges">
        <rect x="2" y="0" width="4" height="1" fill="#101218" />
        <rect x="1" y="1" width="6" height="1" fill="#101218" />
        <rect x="0" y="2" width="8" height="1" fill="#101218" />
        <rect x="2" y="3" width="4" height="3" fill="#101218" />
        <rect x="3" y="4" width="1" height="1" fill="#f5b942" />
        <rect x="1" y="6" width="6" height="2" fill="#101218" />
      </svg>
    </span>
  );
}

function LampIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 8 8" shapeRendering="crispEdges" aria-hidden="true">
      <rect x="2" y="0" width="4" height="1" fill="#f5b942" />
      <rect x="1" y="1" width="6" height="3" fill="#f5b942" />
      <rect x="2" y="4" width="4" height="1" fill="#f5b942" />
      <rect x="3" y="5" width="2" height="1" fill="#efe6cf" />
      <rect x="3" y="6" width="2" height="1" fill="#b8b09a" />
    </svg>
  );
}

export function Header(props: Props) {
  const [showNew, setShowNew] = useState(false);
  const running = props.status === "live" || props.status === "connecting";
  const result =
    props.winner === undefined ? null : props.winner === "mafia" ? "Mafia wins" : props.winner === "villagers" ? "Villagers win" : "Ended";
  return (
    <header className="header">
      <div className="header-top">
        <div className="brand">
          <BrandMark />
          <div>
            <h1>Mafia Lab</h1>
            <span className="muted">Learned Deception</span>
          </div>
        </div>

        <div className="controls" hidden={props.presentation}>
          <label className="inline">
            Case
            <select
              value={props.gameId ?? ""}
              onChange={(e) => props.onSelect(e.target.value || undefined)}
              aria-label="Choose a game"
            >
              <option value="">Choose a game…</option>
              {props.games.map((g) => (
                <option key={g.game_id} value={g.game_id}>
                  {g.game_id.slice(0, 8)} · {g.done ? "finished" : "running"}
                </option>
              ))}
            </select>
          </label>
          <button onClick={props.onRefresh} title="Refresh game list" aria-label="Refresh game list">
            ↻
          </button>
          {props.gameId && (
            <button className={showNew ? "ghost on" : "primary"} onClick={() => setShowNew(!showNew)} aria-expanded={showNew}>
              {showNew ? "✕ Close" : "+ New case"}
            </button>
          )}
          {running && props.gameId && (
            <>
              <button onClick={() => props.onControl("pause")} title="Pause the game itself (not just the replay)">
                ❚❚ Pause game
              </button>
              <button onClick={() => props.onControl("resume")} title="Let the game continue">
                ▶ Resume game
              </button>
            </>
          )}
          <span className="divider" />
          <button
            className={"lamp" + (props.spectator ? " on" : "")}
            aria-pressed={props.spectator}
            onClick={() => props.onSpectator(!props.spectator)}
            title="Spectator view: shows roles, reported suspicions, notes and private actions. Off = what a player sees."
          >
            <LampIcon />
            Spectator lamp: <b>{props.spectator ? "On" : "Off"}</b>
          </button>
        </div>

        <button
          className={"ghost" + (props.presentation ? " on" : "")}
          onClick={() => props.onPresentation(!props.presentation)}
          title="Table only, with the current message in the middle (for the talk)"
        >
          {props.presentation ? "Exit presentation" : "Presentation mode"}
        </button>
      </div>

      {showNew && !props.presentation && props.gameId && (
        <section className="panel new-case-popover">
          <NewCase
            onStart={(options) => {
              props.onStart(options);
              setShowNew(false);
            }}
          />
        </section>
      )}

      {props.gameId && (
        <div className="status-line">
          <span className={`pill pill-${props.status}`}>{STATUS_LABEL[props.status]}</span>
          <PhaseSteps day={props.day} phase={props.phase} round={props.round} label={props.phaseLabel} finished={props.winner !== undefined} />
          <span className="spacer" />
          {props.provider && (
            <span className="pill pill-info" title="Recorded when the game started">
              Played by: <b>{PROVIDER_LABEL[props.provider] ?? props.provider}</b>
              {props.showcase !== undefined && ` · Showcase ${props.showcase ? "on" : "off"}`}
            </span>
          )}
          {result && <span className="pill pill-result">{result}</span>}
          {props.spectator && props.defaulted > 0 && (
            <span className="pill pill-warn" title="Actions replaced by a default after model failures">
              {props.defaulted} defaulted action{props.defaulted > 1 ? "s" : ""}
            </span>
          )}
          {props.spectator && props.claimsDropped > 0 && (
            <span className="pill pill-warn" title="Claims written in a broken format were removed; the messages were kept">
              {props.claimsDropped} claim{props.claimsDropped > 1 ? "s" : ""} dropped
            </span>
          )}
          {props.error && <span className="pill pill-warn">{props.error}</span>}
        </div>
      )}
      {!props.gameId && props.error && (
        <div className="status-line">
          <span className="pill pill-warn">{props.error}</span>
        </div>
      )}
    </header>
  );
}
