import { useState } from "react";
import type { GameState, TranscriptItem } from "../data/reducer";
import type { InvalidEvent } from "../data/api";
import { Transcript } from "./Transcript";
import { PlayerCards } from "./PlayerCards";
import { SuspicionLines } from "./SuspicionLines";
import { DebugPanel } from "./DebugPanel";
import { ErrorBoundary } from "./ErrorBoundary";

type Tab = "transcript" | "players" | "charts" | "debug";
const TABS: { id: Tab; label: string; spectatorOnly?: boolean }[] = [
  { id: "transcript", label: "Case log" },
  { id: "players", label: "Suspects" },
  { id: "charts", label: "Over time", spectatorOnly: true },
  { id: "debug", label: "Debug", spectatorOnly: true },
];

interface Props {
  state: GameState;
  transcript: TranscriptItem[]; // whole game; items after the cursor are faded
  cursor: number;
  spectator: boolean;
  invalid: InvalidEvent[];
  onJump: (cursor: number) => void;
}

/** The right-hand column: one tab visible at a time, only the tab body scrolls. */
export function SidePanel({ state, transcript, cursor, spectator, invalid, onJump }: Props) {
  const [chosen, setChosen] = useState<Tab>("transcript");
  const tabs = TABS.filter((t) => spectator || !t.spectatorOnly);
  // Spectator-only tabs fall back to the transcript in player view.
  const tab = tabs.some((t) => t.id === chosen) ? chosen : "transcript";

  return (
    <section className="panel side-panel">
      <nav className="tabs" role="tablist">
        {tabs.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} className={tab === t.id ? "on" : ""} onClick={() => setChosen(t.id)}>
            {t.label}
            {t.id === "debug" && invalid.length > 0 && <span className="warn"> ({invalid.length})</span>}
          </button>
        ))}
      </nav>
      {tab === "transcript" && <p className="tab-hint">Click a line to rewind the tape to that moment.</p>}
      {tab === "players" && <p className="tab-hint">Every player's file. Click a seat on the table to open just one.</p>}
      <div className="tab-body">
        <ErrorBoundary name={tab}>
          {tab === "transcript" && <Transcript items={transcript} cursor={cursor} onJump={onJump} />}
          {tab === "players" && <PlayerCards state={state} spectator={spectator} cursor={cursor} />}
          {tab === "charts" && <SuspicionLines state={state} spectator={spectator} />}
          {tab === "debug" && <DebugPanel event={state.cursorEvent} invalid={invalid} />}
        </ErrorBoundary>
      </div>
    </section>
  );
}
