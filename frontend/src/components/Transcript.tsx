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

  // Keep the current line visible by scrolling only the log's own box. (scrollIntoView would
  // also scroll the whole page, moving the table and tape away during playback.)
  useEffect(() => {
    const item = currentRef.current;
    const box = item?.closest(".tab-body");
    if (!item || !box) return;
    const outer = box.getBoundingClientRect();
    const inner = item.getBoundingClientRect();
    if (inner.top < outer.top) box.scrollTop += inner.top - outer.top - 8;
    else if (inner.bottom > outer.bottom) box.scrollTop += inner.bottom - outer.bottom + 8;
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
