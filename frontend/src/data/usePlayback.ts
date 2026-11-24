import { useCallback, useEffect, useState } from "react";
import type { Pace } from "./pacing";
import type { StreamStatus } from "./api";

/**
 * Playback state for one game: where the cursor is, whether it is playing, whether it
 * follows a running game live, and the speed. The actual step-by-step timing lives in
 * Timeline (see pacing.ts); this hook only owns the state and the rules around it.
 */
export function usePlayback(eventCount: number, status: StreamStatus) {
  const [cursor, setCursor] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [live, setLive] = useState(false); // keep playing at presentation pace as new events arrive
  const [pace, setPace] = useState<Pace>(1);
  const [jumpToEnd, setJumpToEnd] = useState(false);

  /** Call when a game is opened. A finished game opens at its end; a running one is followed live. */
  const reset = useCallback((hasGame: boolean, finished: boolean) => {
    setCursor(0);
    setPlaying(hasGame && !finished);
    setLive(hasGame && !finished);
    setJumpToEnd(finished);
  }, []);

  // A finished game: once all its events have arrived, show the end state.
  useEffect(() => {
    if (jumpToEnd && status === "done") {
      setCursor(eventCount);
      setJumpToEnd(false);
    }
  }, [jumpToEnd, status, eventCount]);

  // Live mode: restart the pacing loop whenever new events arrive.
  useEffect(() => {
    if (live && !playing && cursor < eventCount) setPlaying(true);
  }, [live, playing, cursor, eventCount]);

  /** Jump to a moment chosen by the user (slider, transcript click): stop playing there. */
  const jumpTo = useCallback((next: number) => {
    setPlaying(false);
    setLive(false);
    setCursor(next);
  }, []);

  return {
    cursor: Math.min(cursor, eventCount),
    playing,
    live,
    pace,
    setCursor,
    setPlaying,
    setLive,
    setPace,
    jumpTo,
    reset,
  };
}
