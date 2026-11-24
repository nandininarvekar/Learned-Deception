import type { GameState, Layer, PlayerView } from "../data/reducer";
import { displayName } from "../data/reducer";
import { ROLE_COLOR, ROLE_LABEL } from "../data/colors";

const LAYER_NOTE: Record<Layer, string> = {
  THINKS: "self-report: a note the agent wrote about its own strategy",
  NOTES: "private notebook the player wrote last night; it is fed into their decisions the next day",
  REASONS: "provider's summary of the model's hidden reasoning (not raw reasoning, not proof of intent)",
  BELIEVES: "reported belief",
  SAYS: "public",
  DOES: "action",
  WANTS: "model report",
  KNOWS: "ground truth",
};

function Row({ layer, children, fresh }: { layer: Layer; children: React.ReactNode; fresh?: boolean }) {
  return (
    <div className={"card-row" + (fresh ? " fresh" : "")}>
      <span className={`layer layer-${layer.toLowerCase()}`} title={LAYER_NOTE[layer]}>
        {layer}
      </span>
      <div className="card-value">{children}</div>
    </div>
  );
}

const Empty = () => <span className="muted">—</span>;

const RECENT = 8; // values produced within the last 8 events are highlighted

export function PlayerCard({ v, spectator, cursor }: { v: PlayerView; state: GameState; spectator: boolean; cursor: number }) {
  const recent = (index?: number) => index !== undefined && index >= cursor - RECENT;
  return (
    <article className={"card" + (v.alive ? "" : " dead")}>
      <header>
        <span className="dot" style={{ background: v.role ? ROLE_COLOR[v.role] : "var(--seat)" }} />
        <strong>{displayName(v.id)}</strong>
        {v.role && <span className="role-chip">{ROLE_LABEL[v.role] ?? v.role}</span>}
        <span className="status">{v.alive ? "alive" : "out"}</span>
      </header>

      {spectator && (
        <Row layer="THINKS" fresh={recent(v.thinks?.index)}>
          {v.thinks ? <em>“{v.thinks.text}”</em> : <Empty />}
        </Row>
      )}
      {spectator && v.reasons && (
        <Row layer="REASONS" fresh={recent(v.reasons.index)}>
          <details className="reasons">
            <summary>{v.reasons.text.slice(0, 140)}{v.reasons.text.length > 140 ? "…" : ""}</summary>
            {v.reasons.text.length > 140 && <p>{v.reasons.text}</p>}
          </details>
        </Row>
      )}
      {spectator && v.notes && (
        <Row layer="NOTES" fresh={recent(v.notes.index)}>
          <div className="notes">
            <div className="chips">
              {v.notes.trust.map((t) => (
                <span key={t.player} className={`chip chip-${t.stance}`} title={t.reason}>
                  {displayName(t.player)}
                  {t.was && t.was !== t.stance && <span className="changed"> (was {t.was})</span>}
                </span>
              ))}
            </div>
            <div><b>Plan:</b> {v.notes.plan}</div>
            <details>
              <summary>Night {v.notes.day} summary and reasons</summary>
              <p>{v.notes.summary}</p>
              <ul>
                {v.notes.trust.map((t) => (
                  <li key={t.player}>
                    <b>{displayName(t.player)}</b> ({t.stance}): {t.reason}
                  </li>
                ))}
              </ul>
            </details>
          </div>
        </Row>
      )}
      {spectator && (
        <Row layer="BELIEVES">
          {v.topSuspect ? (
            <>
              Most suspects <b>{displayName(v.topSuspect.target)}</b> ({Math.round(v.topSuspect.p * 100)}%)
            </>
          ) : (
            <Empty />
          )}
        </Row>
      )}
      <Row layer="SAYS" fresh={recent(v.says?.index)}>
        {v.says ? v.says.text : <Empty />}
      </Row>
      <Row layer="DOES" fresh={recent(v.does?.index)}>
        {v.does ? v.does.text : <Empty />}
      </Row>
      {spectator && v.wants && (
        <Row layer="WANTS" fresh={recent(v.wants.index)}>
          {v.wants.goal ? (
            <>
              Wants to {v.wants.goal.desired.startsWith("increase") ? "raise" : "lower"} suspicion of{" "}
              <b>{displayName(v.wants.goal.target)}</b>.{" "}
            </>
          ) : null}
          Predicts {displayName(v.wants.recipient)}:{" "}
          {v.wants.shifts
            .filter((s) => s.delta !== 0)
            .map((s) => `${displayName(s.target)} ${s.delta > 0 ? "+" : ""}${Math.round(s.delta * 100)} pts`)
            .join(", ") || "no change"}
        </Row>
      )}
      {spectator && v.knows.length > 0 && (
        <Row layer="KNOWS">
          {v.knows.map((k) => (
            <div key={k}>{k}</div>
          ))}
        </Row>
      )}
      {spectator &&
        v.claims
          .filter((c) => !c.true)
          .slice(-2)
          .map((c) => (
            <div key={c.index} className="flag" title="Checked exactly against the true roles and investigation results">
              ⚠ False claim: {c.text}. {c.knewFalse ? "They know this is false." : ""}
            </div>
          ))}
      {spectator && (v.silentTurns > 0 || v.defaulted > 0) && (
        <footer className="muted">
          {v.silentTurns > 0 && `${v.silentTurns} silent turn${v.silentTurns > 1 ? "s" : ""}`}
          {v.silentTurns > 0 && v.defaulted > 0 && " · "}
          {v.defaulted > 0 && <span className="warn">{v.defaulted} defaulted (model failure)</span>}
        </footer>
      )}
    </article>
  );
}

export function PlayerCards({ state, spectator, cursor }: { state: GameState; spectator: boolean; cursor: number }) {
  return (
    <div className="cards">
      {state.players.map((id) => (
        <PlayerCard key={id} v={state.views[id]} state={state} spectator={spectator} cursor={cursor} />
      ))}
    </div>
  );
}
