import { useEffect, useRef } from "react";
import type { TranscriptItem } from "../data/reducer";

interface Props {
  items: TranscriptItem[]; // all items in the game (future ones are faded)
  cursor: number;
  onJump: (cursor: number) => void;
}

export function Transcript({ items, cursor, onJump }: Props) {
  const currentRef = useRef<HTMLButtonElement>(null);
  const current = items.filter((i) => i.index < cursor).at(-1);

  useEffect(() => {
    currentRef.current?.scrollIntoView({ block: "nearest" });
  }, [current?.index]);

  if (!items.length) return <p className="muted pad">Public discussion and game events will appear here.</p>;

  return (
    <div className="transcript">
      {items.map((item) => {
        const future = item.index >= cursor;
        const isCurrent = item === current;
        return (
          <button
            key={item.index}
            ref={isCurrent ? currentRef : undefined}
            className={`t-item t-${item.kind}` + (future ? " future" : "") + (isCurrent ? " current" : "")}
            onClick={() => onJump(item.index + 1)}
            title="Jump the timeline to this moment"
          >
            <span className="t-title">
              {item.title}
              {item.privileged && <span className="tag small">private</span>}
            </span>
            <span className="t-text">{item.text}</span>
          </button>
        );
      })}
    </div>
  );
}
