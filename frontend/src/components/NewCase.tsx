import { useState } from "react";
import type { GameSummary, StartOptions } from "../data/api";

// Starting a game: the same three options the header used to hold (who plays,
// how many players, showcase), laid out as numbered choices with plain explanations.

const PROVIDERS: { value: StartOptions["provider"]; title: string; text: string }[] = [
  { value: "mock", title: "Mock agents", text: "Scripted players. Free and instant. For trying out the room." },
  { value: "openrouter", title: "OpenRouter", text: "A real model plays every seat, using the model set on the server." },
  { value: "codex", title: "Codex CLI", text: "A real model through the server's signed-in Codex account." },
];

// Same cohorts as the backend (game.py COHORTS / MAFIA_COUNTS).
const SIZES: { value: StartOptions["players"]; title: string; text: string }[] = [
  { value: 4, title: "4 players", text: "1 Mafia, 1 Detective, 2 Villagers" },
  { value: 8, title: "8 players", text: "2 Mafia, 1 Detective, 5 Villagers" },
  { value: 12, title: "12 players", text: "3 Mafia, 1 Detective, 8 Villagers" },
];

const PROVIDER_NAME: Record<StartOptions["provider"], string> = { mock: "Mock agents", openrouter: "OpenRouter", codex: "Codex CLI" };

export function NewCase({ onStart }: { onStart: (options: StartOptions) => void }) {
  const [options, setOptions] = useState<StartOptions>({ provider: "mock", players: 8, showcase: true, delay: 0.3 });
  return (
    <div className="new-case">
      <div>
        <h2>Open a new case</h2>
        <p className="lead">Three choices, then start. Every game is recorded and can be replayed.</p>
      </div>

      <div>
        <div className="step-title"><span className="step-num">1</span>Who plays?</div>
        <div className="options">
          {PROVIDERS.map((p) => (
            <button key={p.value} className="option" aria-pressed={options.provider === p.value} onClick={() => setOptions({ ...options, provider: p.value })}>
              <strong>{p.title}</strong>
              <span>{p.text}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="step-title"><span className="step-num">2</span>How many players?</div>
        <div className="options">
          {SIZES.map((s) => (
            <button key={s.value} className="option" aria-pressed={options.players === s.value} onClick={() => setOptions({ ...options, players: s.value })}>
              <strong>{s.title}</strong>
              <span>{s.text}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="step-title"><span className="step-num">3</span>Showcase?</div>
        <label className="check-option">
          <input type="checkbox" checked={options.showcase} onChange={(e) => setOptions({ ...options, showcase: e.target.checked })} />
          <span>
            <strong>Record suspicions and predictions</strong>
            After each round every player is asked who they think is Mafia, and Mafia's expected effect of each
            message is recorded. Needed for the suspicion arrows. Uses more model calls.
          </span>
        </label>
      </div>

      <div className="start-row">
        <button className="primary" onClick={() => onStart(options)}>▸ Start game</button>
        <span className="muted">
          {PROVIDER_NAME[options.provider]} · {options.players} players · Showcase {options.showcase ? "on" : "off"}
        </span>
      </div>
    </div>
  );
}

export function CaseFiles({ games, onSelect, onRefresh }: { games: GameSummary[]; onSelect: (id: string, done: boolean) => void; onRefresh: () => void }) {
  return (
    <aside className="panel case-files">
      <div className="case-files-head">
        <h2>Case files</h2>
        <button onClick={onRefresh} title="Refresh game list">↻ Refresh</button>
      </div>
      <p style={{ margin: 0, fontSize: 13 }}>Open any game to watch it live or replay it.</p>
      {games.length === 0 && <p className="muted" style={{ margin: 0, color: "#4a4636" }}>No games yet.</p>}
      {games.map((g) => (
        <button key={g.game_id} className="case-file" onClick={() => onSelect(g.game_id, g.done)}>
          <span>Case {g.game_id.slice(0, 8)}</span>
          <span className={"case-stamp " + (g.done ? "finished" : "running")}>{g.done ? "Finished" : "Running"}</span>
        </button>
      ))}
    </aside>
  );
}
