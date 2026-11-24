import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { GameState } from "../data/reducer";
import { displayName, meanSuspicion } from "../data/reducer";
import { ROLE_COLOR, ROLE_LABEL, seatColor } from "../data/colors";

/**
 * One small chart per player: the mean reported p(player is Mafia) across the other
 * living players, after each probe batch. Based on belief probes (model reports).
 */
export function SuspicionLines({ state, spectator }: { state: GameState; spectator: boolean }) {
  if (!spectator) return <p className="muted pad">Turn on spectator view to see reported beliefs over time.</p>;
  if (!state.probeSteps.length)
    return <p className="muted pad">No belief probes yet. Probes run only in showcase games, after each discussion round.</p>;

  const data = state.probeSteps.map((step, i) => {
    const row: Record<string, number | string | null> = { step: `${i + 1}`, label: step.label };
    for (const p of state.players) {
      const m = meanSuspicion(step.beliefs, p);
      row[p] = m === null ? null : Math.round(m * 100) / 100;
    }
    return row;
  });
  const current = data.length ? data[data.length - 1].step : undefined;

  return (
    <div className="lines">
      {state.players.map((p) => {
        const role = state.roles[p];
        const color = role ? ROLE_COLOR[role] : seatColor(state.players, p);
        return (
          <div key={p} className={"line-card" + (state.alive.has(p) ? "" : " dead")}>
            <div className="line-head">
              <strong>{displayName(p)}</strong>
              {role && <span className="role-chip">{ROLE_LABEL[role]}</span>}
              <span className="muted">avg p(Mafia) others report</span>
            </div>
            <ResponsiveContainer width="100%" height={110}>
              <LineChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: -24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--grid)" />
                <XAxis dataKey="step" tick={{ fontSize: 10 }} stroke="var(--muted)" />
                <YAxis domain={[0, 1]} ticks={[0, 0.5, 1]} tick={{ fontSize: 10 }} stroke="var(--muted)" />
                <ReferenceLine y={0.5} stroke="var(--muted)" strokeDasharray="2 4" />
                {current && <ReferenceLine x={current} stroke="var(--accent)" />}
                <Tooltip
                  formatter={(value) => [`${Math.round(Number(value) * 100)}%`, "avg p(Mafia)"]}
                  labelFormatter={(_, payload) => String(payload?.[0]?.payload?.label ?? "")}
                />
                <Line
                  type="monotone"
                  dataKey={p}
                  stroke={color}
                  strokeWidth={2.5}
                  dot={{ r: 2.5 }}
                  connectNulls
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        );
      })}
    </div>
  );
}
