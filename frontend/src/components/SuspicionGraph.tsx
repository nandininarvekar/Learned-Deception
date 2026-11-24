import { useState } from "react";
import type { Beliefs, GameState } from "../data/reducer";
import { displayName, meanSuspicion, short } from "../data/reducer";
import { ROLE_COLOR, suspicionColor } from "../data/colors";

const SIZE = 520;
const CENTER = SIZE / 2;
const RING = 185;
const NODE_R = 30;
const BOW = 34; // curve offset so A→B and B→A don't overlap
const MIN_DELTA = 0.05; // smaller belief changes are not labelled

type Point = { x: number; y: number };
const sub = (a: Point, b: Point) => ({ x: a.x - b.x, y: a.y - b.y });
const len = (a: Point) => Math.hypot(a.x, a.y) || 1;
const unit = (a: Point) => ({ x: a.x / len(a), y: a.y / len(a) });

function seatPositions(players: string[]): Record<string, Point> {
  return Object.fromEntries(
    players.map((id, i) => {
      const angle = -Math.PI / 2 + (i * 2 * Math.PI) / players.length;
      return [id, { x: CENTER + RING * Math.cos(angle), y: CENTER + RING * Math.sin(angle) }];
    }),
  );
}

function edgeGeometry(a: Point, b: Point, width: number) {
  const dir = unit(sub(b, a));
  const normal = { x: -dir.y, y: dir.x };
  const control = { x: (a.x + b.x) / 2 + normal.x * BOW, y: (a.y + b.y) / 2 + normal.y * BOW };
  const s = unit(sub(control, a));
  const e = unit(sub(control, b));
  const start = { x: a.x + s.x * NODE_R, y: a.y + s.y * NODE_R };
  const tip = { x: b.x + e.x * (NODE_R + 3), y: b.y + e.y * (NODE_R + 3) };
  const head = 8 + width * 0.8;
  const back = unit(sub(control, tip));
  const side = { x: -back.y, y: back.x };
  const base = { x: tip.x + back.x * head, y: tip.y + back.y * head };
  const arrow = [
    tip,
    { x: base.x + side.x * head * 0.55, y: base.y + side.y * head * 0.55 },
    { x: base.x - side.x * head * 0.55, y: base.y - side.y * head * 0.55 },
  ];
  return {
    d: `M${start.x},${start.y} Q${control.x},${control.y} ${base.x},${base.y}`,
    arrow: arrow.map((p) => `${p.x},${p.y}`).join(" "),
    label: { x: (start.x + 2 * control.x + tip.x) / 4, y: (start.y + 2 * control.y + tip.y) / 4 },
  };
}

function topSuspect(row: Record<string, number> | undefined, alive: Set<string>, self: string) {
  let best: string | undefined;
  for (const [target, p] of Object.entries(row ?? {})) {
    if (target === self || !alive.has(target)) continue;
    if (best === undefined || p > row![best]) best = target;
  }
  return best;
}

interface Props {
  state: GameState;
  spectator: boolean;
  /** True right after a batch of belief probes: arrows show how much they changed. */
  fresh: boolean;
  /** Player selected by clicking a seat (shared with the rest of the page). */
  focus: string | null;
  onFocus: (id: string | null) => void;
  /** Presentation mode: show the current message in the middle of the table. */
  presentation?: boolean;
}

type Show = "top" | "all";

export function SuspicionGraph({ state, spectator, fresh, focus, onFocus, presentation = false }: Props) {
  const [show, setShow] = useState<Show>("top");
  const [threshold, setThreshold] = useState(0.5);
  const [hovered, setHovered] = useState<string | null>(null);
  const players = state.players;
  const pos = seatPositions(players);
  const beliefsMode = spectator && state.probeSteps.length > 0;
  const steps = state.probeSteps;
  const current: Beliefs = state.beliefs;
  const previous: Beliefs | undefined = steps.length > 1 ? steps[steps.length - 2].beliefs : undefined;
  const selected = focus ?? hovered;

  // Every ordered pair is always rendered; hidden ones fade out, so changes animate smoothly.
  const edges: { from: string; to: string; p: number; delta: number | null; shown: boolean }[] = [];
  if (beliefsMode) {
    for (const from of players) {
      const row = current[from];
      const top = topSuspect(row, state.alive, from);
      for (const to of players) {
        if (to === from) continue;
        const p = row?.[to] ?? 0;
        const before = previous?.[from]?.[to];
        const alive = state.alive.has(from) && state.alive.has(to);
        // "top": only each player's main suspect; "all": every suspicion above the threshold.
        const passes = show === "top" ? to === top : p >= threshold;
        // With a player selected, keep only arrows from or to that player.
        const touchesSelected = !selected || from === selected || to === selected;
        const shown = alive && passes && touchesSelected;
        edges.push({ from, to, p, delta: before === undefined || !row ? null : p - before, shown });
      }
    }
  } else {
    for (const v of state.lastVotes) {
      if (v.target && pos[v.target] && pos[v.actor]) {
        edges.push({ from: v.actor, to: v.target, p: 1, delta: null, shown: !selected || v.actor === selected || v.target === selected });
      }
    }
  }
  edges.sort((a, b) => Number(a.shown) - Number(b.shown) || a.p - b.p);
  const shownCount = edges.filter((e) => e.shown).length;
  const lastStep = steps.at(-1);
  // The newest public happening (message, vote, elimination…) for the presentation speech card.
  const latest = state.transcript.at(-1);
  const speaker = presentation && latest?.kind === "message" ? latest.actor : undefined;

  return (
    <div className="graph">
      <div className="graph-toolbar">
        <span className="tag">{beliefsMode ? "BELIEVES · model report" : "DOES · public votes"}</span>
        {beliefsMode && (
          <div className="segmented">
            <button className={show === "top" ? "on" : ""} onClick={() => setShow("top")} title="One arrow per player: their main suspect">
              Top suspect only
            </button>
            <button className={show === "all" ? "on" : ""} onClick={() => setShow("all")} title="Every suspicion above the threshold">
              All above {Math.round(threshold * 100)}%
            </button>
          </div>
        )}
        {beliefsMode && show === "all" && (
          <input type="range" min={0.1} max={0.9} step={0.05} value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} aria-label="Suspicion threshold" />
        )}
        {focus && (
          <button className="ghost" onClick={() => onFocus(null)}>
            Showing {displayName(focus)} only ✕
          </button>
        )}
      </div>

      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="graph-svg" role="img" aria-label="Suspicion graph" onClick={() => onFocus(null)}>
        <circle cx={CENTER} cy={CENTER} r={RING} className="table-ring" />
        {fresh && lastStep && (
          <g className="banner">
            <rect x={CENTER - 120} y={14} width={240} height={30} rx={15} />
            <text x={CENTER} y={34}>Beliefs updated · {lastStep.label.replace("D", "Day ").replace(" R", " · round ")}</text>
          </g>
        )}
        {presentation && latest ? (
          <foreignObject x={CENTER - 135} y={CENTER - 78} width={270} height={156}>
            <div className={`speech speech-${latest.kind}`}>
              <div className="speech-phase">{state.phaseLabel}</div>
              <div className="speech-title">{latest.kind === "message" ? `${latest.title} says` : latest.title}</div>
              <div className="speech-text">{latest.text}</div>
            </div>
          </foreignObject>
        ) : (
          <text x={CENTER} y={CENTER - 6} className="center-label">
            {state.phaseLabel}
          </text>
        )}
        <text x={CENTER} y={CENTER + 16} className="center-sub" style={{ display: presentation && latest ? "none" : undefined }}>
          {beliefsMode
            ? `${shownCount} arrow${shownCount === 1 ? "" : "s"}${focus ? "" : " · click a player to focus"}`
            : state.lastVotes.length
              ? "latest vote"
              : spectator
                ? "no belief probes yet"
                : "no votes yet"}
        </text>

        {beliefsMode &&
          players.map((id) => {
            const m = state.alive.has(id) ? meanSuspicion(current, id) : null;
            if (m === null) return null;
            const p = pos[id];
            const r = NODE_R + 4 + 16 * m;
            return <circle key={`halo-${id}`} className="halo" cx={p.x} cy={p.y} r={r} style={{ r, opacity: 0.12 + 0.4 * m }} />;
          })}

        {edges.map((edge) => {
          const width = beliefsMode ? 1.5 + 6.5 * edge.p : 3;
          const g = edgeGeometry(pos[edge.from], pos[edge.to], width);
          const color = beliefsMode ? suspicionColor(edge.p) : "var(--vote)";
          const showDelta = beliefsMode && edge.shown && fresh && edge.delta !== null && Math.abs(edge.delta) >= MIN_DELTA;
          const showPct = beliefsMode && edge.shown && !showDelta && !!selected;
          return (
            <g key={`${edge.from}-${edge.to}`} className="edge" style={{ opacity: edge.shown ? 0.4 + 0.6 * edge.p : 0 }}>
              <path d={g.d} fill="none" strokeLinecap="round" style={{ stroke: color, strokeWidth: width }} />
              <polygon points={g.arrow} style={{ fill: color }} />
              {showDelta && (
                <text x={g.label.x} y={g.label.y} className={"edge-label " + (edge.delta! > 0 ? "up" : "down")}>
                  {edge.delta! > 0 ? "+" : "−"}
                  {Math.round(Math.abs(edge.delta!) * 100)}
                </text>
              )}
              {showPct && (
                <text x={g.label.x} y={g.label.y} className="edge-label">
                  {Math.round(edge.p * 100)}%
                </text>
              )}
            </g>
          );
        })}

        {players.map((id) => {
          const p = pos[id];
          const alive = state.alive.has(id);
          const role = spectator ? state.roles[id] : undefined;
          return (
            <g
              key={id}
              className={"seat-node" + (alive ? "" : " dead") + (selected === id ? " hovered" : "") + (speaker === id ? " speaking" : "")}
              onMouseEnter={() => setHovered(id)}
              onMouseLeave={() => setHovered(null)}
              onClick={(e) => {
                e.stopPropagation();
                onFocus(focus === id ? null : id);
              }}
            >
              <circle cx={p.x} cy={p.y} r={NODE_R} fill={role ? ROLE_COLOR[role] : "var(--seat)"} />
              <text x={p.x} y={p.y + 6} className="seat-letter">
                {short(id).slice(0, 2)}
              </text>
              {!alive && (
                <path d={`M${p.x - 14},${p.y - 14} L${p.x + 14},${p.y + 14} M${p.x + 14},${p.y - 14} L${p.x - 14},${p.y + 14}`} className="dead-cross" />
              )}
              <text x={p.x} y={p.y + NODE_R + 18} className="seat-name">
                {displayName(id)}
                {role ? ` · ${role}` : ""}
              </text>
            </g>
          );
        })}
      </svg>

      <p className="legend">
        {beliefsMode ? (
          <>
            Arrow A → B: A's <b>reported</b> chance that B is Mafia (a belief probe, not A's hidden mind); thicker and
            redder = more suspicious. <b>Red halo</b> = how suspected a player is overall. After each round, arrows show
            the change (<span className="up">+</span> more suspicious, <span className="down">−</span> less).
          </>
        ) : (
          <>Arrow A → B: A voted for B in the most recent vote. Turn on spectator view to see reported beliefs.</>
        )}
      </p>
    </div>
  );
}
