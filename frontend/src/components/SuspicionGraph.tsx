import { useState } from "react";
import type { Beliefs, GameState } from "../data/reducer";
import { displayName, meanSuspicion } from "../data/reducer";
import { ROLE_COLOR, ROLE_LABEL, suspicionColor } from "../data/colors";

const SIZE = 520;
const CENTER = SIZE / 2;
const RING = 185;
const NODE_R = 40; // half the seat frame plus a little room, so arrows start and end outside the portrait
const FACE = 64; // portrait frame size
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

// Decoration only: a small pixel portrait whose colours are picked from the player's name,
// so the same name always gets the same face. It carries no game information.
const HAIR = ["#3b2a20", "#7a2f2a", "#141414", "#d8c06a", "#2b1d16", "#5a3a8a", "#8a8a8a"];
const SKIN = ["#e0b48c", "#c98e66", "#8a5a3c", "#f0c9a0", "#b9805a", "#d9a77a"];
const SHIRT = ["#6cc4e0", "#9b7fd1", "#e0a43c", "#4f8f6a", "#a8453e", "#5a6278", "#c06090", "#7a8a3a"];
function hash(text: string) {
  let h = 7;
  for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

function PixelFace({ id, x, y }: { id: string; x: number; y: number }) {
  const h = hash(id);
  const hair = HAIR[h % HAIR.length];
  const skin = SKIN[(h >>> 3) % SKIN.length];
  const shirt = SHIRT[(h >>> 6) % SHIRT.length];
  const long = (h >>> 9) % 2 === 0;
  return (
    <g className="face" transform={`translate(${x - 28} ${y - 28}) scale(3.5)`} shapeRendering="crispEdges" aria-hidden="true">
      <rect x="4" y="2" width="8" height="2" fill={hair} />
      {long && <rect x="3" y="3" width="1" height="6" fill={hair} />}
      {long && <rect x="12" y="3" width="1" height="6" fill={hair} />}
      <rect x="4" y="4" width="8" height="6" fill={skin} />
      <rect x="6" y="7" width="1" height="1" fill="#101218" />
      <rect x="9" y="7" width="1" height="1" fill="#101218" />
      <rect x="7" y="9" width="2" height="1" fill="#6b3a2a" />
      <rect x="2" y="11" width="12" height="5" fill={shirt} />
    </g>
  );
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
  // The living player with the highest average reported suspicion (the biggest red glow).
  let mostSuspected: string | undefined;
  if (beliefsMode) {
    let best = 0;
    for (const id of players) {
      const m = state.alive.has(id) ? meanSuspicion(current, id) : null;
      if (m !== null && m > best) {
        best = m;
        mostSuspected = id;
      }
    }
  }
  return (
    <div className="graph">
      <div className="graph-toolbar">
        <div className="graph-title">
          <h2>The table</h2>
          <span>
            {beliefsMode
              ? show === "top"
                ? "Arrows: each player's top suspect, as they report it"
                : `Arrows: every suspicion above ${Math.round(threshold * 100)}%, as reported`
              : "Arrows: the latest vote"}
          </span>
        </div>
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
          <button onClick={() => onFocus(null)}>
            Showing {displayName(focus)} only ✕
          </button>
        )}
      </div>
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="graph-svg" role="img" aria-label="Suspicion graph" onClick={() => onFocus(null)}>
        <rect x={CENTER - 120} y={CENTER - 78} width={240} height={156} className="table-top" />
        <rect x={CENTER - 112} y={CENTER - 70} width={224} height={140} className="table-edge" />
        {fresh && lastStep && (
          <g className="banner">
            <rect x={CENTER - 130} y={10} width={260} height={28} />
            <text x={CENTER} y={29}>Beliefs updated · {lastStep.label.replace("D", "Day ").replace(" R", " · round ")}</text>
          </g>
        )}
        {!(presentation && latest) && (
          <text x={CENTER} y={CENTER - 4} className="center-label">
            {state.phaseLabel}
          </text>
        )}
        <text x={CENTER} y={CENTER + 20} className="center-sub" style={{ display: presentation && latest ? "none" : undefined }}>
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
            const r = FACE / 2 + 4 + 16 * m;
            return (
              <rect
                key={`halo-${id}`}
                className="halo"
                x={p.x - r}
                y={p.y - r}
                width={r * 2}
                height={r * 2}
                style={{ opacity: 0.12 + 0.4 * m }}
              />
            );
          })}
        {edges.map((edge) => {
          const width = beliefsMode ? 1.5 + 6.5 * edge.p : 3;
          const g = edgeGeometry(pos[edge.from], pos[edge.to], width);
          const color = beliefsMode ? suspicionColor(edge.p) : "var(--vote)";
          const showDelta = beliefsMode && edge.shown && fresh && edge.delta !== null && Math.abs(edge.delta) >= MIN_DELTA;
          const showPct = beliefsMode && edge.shown && !showDelta && !!selected;
          return (
            <g key={`${edge.from}-${edge.to}`} className="edge" style={{ opacity: edge.shown ? 0.4 + 0.6 * edge.p : 0 }}>
              <path d={g.d} fill="none" strokeLinecap="square" style={{ stroke: color, strokeWidth: width }} />
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
        {presentation && latest && (
          <foreignObject x={CENTER - 135} y={CENTER - 78} width={270} height={156}>
            <div className={`speech speech-${latest.kind}`}>
              <div className="speech-phase">{state.phaseLabel}</div>
              <div className="speech-title">{latest.kind === "message" ? `${latest.title} says` : latest.title}</div>
              <div className="speech-text">{latest.text}</div>
            </div>
          </foreignObject>
        )}
        {players.map((id) => {
          const p = pos[id];
          const alive = state.alive.has(id);
          const role = spectator ? state.roles[id] : undefined;
          const name = displayName(id);
          const nameWidth = Math.max(48, name.length * 9 + (alive ? 12 : 48));
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
              <title>{`${name}${role ? ` · ${ROLE_LABEL[role] ?? role}` : ""}${alive ? "" : " · out"}. Click to show only their arrows and open their file.`}</title>
              <rect x={p.x - FACE / 2 + 4} y={p.y - FACE / 2 + 4} width={FACE} height={FACE} className="seat-shadow" />
              <rect x={p.x - FACE / 2} y={p.y - FACE / 2} width={FACE} height={FACE} className="seat-frame" />
              <PixelFace id={id} x={p.x} y={p.y} />
              {!alive && (
                <path d={`M${p.x - 22},${p.y - 22} L${p.x + 22},${p.y + 22} M${p.x + 22},${p.y - 22} L${p.x - 22},${p.y + 22}`} className="dead-cross" />
              )}
              {role && (
                <g className="role-stamp" transform={`translate(${p.x + 26} ${p.y - 34}) rotate(8)`}>
                  <rect x={-30} y={-9} width={60} height={16} style={{ fill: ROLE_COLOR[role] ?? "var(--seat)" }} />
                  <text x={0} y={3}>{ROLE_LABEL[role] ?? role}</text>
                </g>
              )}
              <rect x={p.x - nameWidth / 2} y={p.y + FACE / 2 + 6} width={nameWidth} height={18} className="seat-name-bg" />
              <text x={p.x} y={p.y + FACE / 2 + 19} className="seat-name">
                {name}
                {alive ? "" : " · out"}
              </text>
              {mostSuspected === id && (
                <text x={p.x} y={p.y + FACE / 2 + 36} className="most-suspected">
                  Most suspected
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <div className="legend">
        {beliefsMode ? (
          <>
            <span>
              Arrow A → B: how likely A <b>says</b> B is Mafia
              <span className="heat" aria-hidden="true">
                {[0, 0.33, 0.66, 1].map((p) => (
                  <i key={p} style={{ background: suspicionColor(p) }} />
                ))}
              </span>
              low → high
            </span>
            <span>
              <span className="glow-swatch" aria-hidden="true" />
              Red glow = how suspected a player is overall
            </span>
            <span>
              <span className="up">+</span> / <span className="down">−</span> = change since the last round
            </span>
            <span>Suspicions are reported when asked, not read from the model's mind.</span>
          </>
        ) : (
          <span>
            Arrow A → B: A voted for B in the most recent vote.
            {!spectator && " Turn on the spectator lamp to see roles and reported suspicions."}
          </span>
        )}
      </div>
    </div>
  );
}
