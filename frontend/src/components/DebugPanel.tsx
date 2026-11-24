import type { InvalidEvent } from "../data/api";
import type { GameEvent } from "../types/events";

// Shows the raw event at the cursor, so you can tell whether a bug is in the UI or in the agents' output.
export function DebugPanel({ event, invalid }: { event?: GameEvent; invalid: InvalidEvent[] }) {
  return (
    <details className="debug">
      <summary>
        Debug: raw event at cursor
        {invalid.length > 0 && <span className="warn"> · {invalid.length} invalid event(s)</span>}
      </summary>
      <pre>{event ? JSON.stringify(event, null, 2) : "No event yet."}</pre>
      {invalid.length > 0 && (
        <>
          <h4>Events that failed validation</h4>
          {invalid.slice(-20).map((item, i) => (
            <pre key={i} className="warn">
              {item.error}
              {"\n"}
              {JSON.stringify(item.raw).slice(0, 600)}
            </pre>
          ))}
        </>
      )}
    </details>
  );
}
