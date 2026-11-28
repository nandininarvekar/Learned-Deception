import { useEffect, useRef } from "react";
import type { GameEvent } from "../types/events";
import { nextStep, PACES, scaled, type Pace } from "../data/pacing";

interface Props {
  events: GameEvent[];
  cursor: number;
  playing: boolean;
  live: boolean; // keep playing as new events arrive
  pace: Pace;
  spectator: boolean;
  running: boolean; // the backend game is still going
  onCursor: (cursor: number) => void;
  onPlaying: (playing: boolean) => void;
  onLive: (live: boolean) => void;
  onPace: (pace: Pace) => void;
}

export function Timeline(props: Props) {
  const { events, cursor, playing, live, pace, spectator, running, onCursor, onPlaying, onLive, onPace } = props;
  const hold = useRef(0); // how long to keep the step just shown on screen

  // The pacing loop: show one step, wait its hold time, show the next.
  useEffect(() => {
    if (!playing) return;
    if (cursor >= events.length) {
      if (!live) onPlaying(false); // live mode waits here for new events
      return;
    }
    const timer = window.setTimeout(() => {
      const step = nextStep(events, cursor, spectator);
      hold.current = step.hold;
      onCursor(step.cursor);
    }, scaled(hold.current, pace));
    return () => window.clearTimeout(timer);
  }, [playing, live, cursor, events, pace, spectator, onCursor, onPlaying]);

  const pause = () => {
    onPlaying(false);
    onLive(false);
  };
  const ticks = events
    .map((e, i) => ({ e, i }))
    .filter(({ e }) => e.type === "phase_changed" || e.type === "game_ended");
  const max = Math.max(events.length, 1);
  const behind = events.length - cursor;

  return (
    <div className="timeline">
      <span className="tape-label">Case tape</span>
      <button
        className="play"
        disabled={!events.length}
        aria-label={playing ? "Pause" : "Play"}
        onClick={() => {
          if (playing) return pause();
          if (cursor >= events.length) onCursor(0);
          hold.current = 0;
          onPlaying(true);
        }}
      >
        {playing ? "❚❚ Pause" : "▶ Play"}
      </button>
      <button className="ghost" onClick={() => { pause(); onCursor(0); }} disabled={!events.length} title="Back to start">
        ⏮ Start
      </button>
      <div className="track">
        <input
          type="range"
          min={0}
          max={events.length}
          value={Math.min(cursor, events.length)}
          onChange={(e) => {
            pause();
            onCursor(Number(e.target.value));
          }}
          aria-label="Game timeline"
        />
        <div className="ticks">
          {ticks.map(({ e, i }) => (
            <span
              key={e.event_id}
              className={"tick tick-" + (e.type === "game_ended" ? "end" : e.phase)}
              style={{ left: `${(i / max) * 100}%` }}
              title={e.type === "game_ended" ? "Game over" : `Day ${e.day} · ${e.phase.replace("_", " ")}`}
              onClick={() => {
                pause();
                onCursor(i + 1);
              }}
            />
          ))}
        </div>
        <div className="tape-legend" aria-hidden="true">
          <span>Marks on the tape:</span>
          <span><i style={{ background: "var(--accent)" }} />talk</span>
          <span><i style={{ background: "var(--vote)" }} />vote</span>
          <span><i style={{ background: "#6b7bd6" }} />night</span>
          <span><i style={{ background: "var(--mafia)" }} />game over</span>
          <span>· Rewinding is a replay, it never changes the game.</span>
        </div>
      </div>
      {running && (
        <button
          className={"ghost" + (live ? " on" : "")}
          title="Follow the running game at presentation pace"
          onClick={() => {
            hold.current = 0;
            onLive(true);
            onPlaying(true);
          }}
        >
          {live ? (behind > 0 ? `● Live · ${behind} behind` : "● Live") : "Follow live"}
        </button>
      )}
      <button className="ghost" onClick={() => { pause(); onCursor(events.length); }} title="Skip to the latest event">
        Latest ⏭
      </button>
      <label className="inline">
        Speed
        <select value={String(pace)} onChange={(e) => onPace((e.target.value === "instant" ? "instant" : Number(e.target.value)) as Pace)}>
          {PACES.map((p) => (
            <option key={String(p)} value={String(p)}>
              {p === "instant" ? "Instant" : `${p}×`}
            </option>
          ))}
        </select>
      </label>
      <span className="muted count" title="Events shown / events so far">
        {Math.min(cursor, events.length)} / {events.length}
      </span>

    </div>
  );
}
