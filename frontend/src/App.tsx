import { useCallback, useEffect, useMemo, useState } from "react";
import { controlGame, listGames, startGame, useGameStream, type GameSummary, type StartOptions } from "./data/api";
import { deriveState } from "./data/reducer";
import { usePlayback } from "./data/usePlayback";
import { Header } from "./components/Header";
import { Timeline } from "./components/Timeline";
import { SuspicionGraph } from "./components/SuspicionGraph";
import { PlayerCard } from "./components/PlayerCards";
import { SidePanel } from "./components/SidePanel";
import { ErrorBoundary } from "./components/ErrorBoundary";

function readHash() {
  const id = location.hash.replace(/^#/, "");
  return /^[0-9a-f]{32}$/.test(id) ? id : undefined;
}

export function App() {
  const [games, setGames] = useState<GameSummary[]>([]);
  const [gameId, setGameId] = useState<string | undefined>(readHash);
  const [spectator, setSpectator] = useState(true);
  const [presentation, setPresentation] = useState(false);
  const [focus, setFocus] = useState<string | null>(null); // player clicked on the graph
  const [error, setError] = useState<string>();
  const { events, status, invalid } = useGameStream(gameId);
  const playback = usePlayback(events.length, status);

  const refresh = useCallback(() => {
    listGames()
      .then((g) => {
        setGames(g);
        setError(undefined);
      })
      .catch((e: Error) => setError(`Server: ${e.message}`));
  }, []);
  useEffect(refresh, [refresh]);

  // The selected game is kept in the URL, so a reload (or a shared link) reopens it.
  const { reset } = playback;
  const select = useCallback(
    (id: string | undefined, finished = false) => {
      setGameId(id);
      setFocus(null);
      reset(!!id, finished);
      history.replaceState(null, "", id ? `#${id}` : location.pathname);
    },
    [reset],
  );

  const start = async (options: StartOptions) => {
    try {
      select(await startGame(options));
      refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const state = useMemo(() => deriveState(events, playback.cursor, spectator), [events, playback.cursor, spectator]);
  const fullTranscript = useMemo(() => deriveState(events, events.length, spectator).transcript, [events, spectator]);

  const graph = (
    <section className="panel graph-panel">
      <ErrorBoundary name="Suspicion graph">
        <SuspicionGraph
          state={state}
          spectator={spectator}
          fresh={state.beliefsJustUpdated}
          focus={focus}
          onFocus={setFocus}
          presentation={presentation}
        />
      </ErrorBoundary>
    </section>
  );

  return (
    <div className="app">
      <Header
        games={games}
        gameId={gameId}
        status={status}
        spectator={spectator}
        phaseLabel={state.phaseLabel}
        winner={state.winner}
        defaulted={state.defaultedCount}
        claimsDropped={state.claimsDropped}
        onSelect={(id) => select(id, games.find((g) => g.game_id === id)?.done ?? false)}
        onRefresh={refresh}
        onStart={start}
        onSpectator={setSpectator}
        onControl={(c) => gameId && controlGame(gameId, c).catch((e: Error) => setError(e.message))}
        error={error}
        presentation={presentation}
        onPresentation={setPresentation}
      />

      {!gameId ? (
        <div className="empty-state">
          <h2>Start a game or choose a past one</h2>
          <p className="muted">
            Mock agents cost nothing and are good for trying the views. Showcase games include belief probes, so the
            suspicion graph has data.
          </p>
        </div>
      ) : (
        <>
          <Timeline
            events={events}
            cursor={playback.cursor}
            playing={playback.playing}
            live={playback.live}
            pace={playback.pace}
            spectator={spectator}
            running={status === "live" || status === "connecting"}
            onCursor={playback.setCursor}
            onPlaying={playback.setPlaying}
            onLive={playback.setLive}
            onPace={playback.setPace}
          />

          {presentation ? (
            <main className="stage presentation">{graph}</main>
          ) : (
            <main className="stage">
              <div className="stage-left">
                {graph}
                {focus && state.views[focus] && (
                  <section className="panel selected-card">
                    <ErrorBoundary name="Selected player">
                      <PlayerCard v={state.views[focus]} state={state} spectator={spectator} cursor={playback.cursor} />
                    </ErrorBoundary>
                  </section>
                )}
              </div>
              <SidePanel
                state={state}
                transcript={fullTranscript}
                cursor={playback.cursor}
                spectator={spectator}
                invalid={invalid}
                onJump={playback.jumpTo}
              />
            </main>
          )}
        </>
      )}
    </div>
  );
}
