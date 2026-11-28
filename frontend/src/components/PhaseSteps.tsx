// Where we are in the current day, as steps: three talk rounds, the vote, then night.
// Built only from the phase, round and day the reducer already tracks (the same data
// as the phase label), so it never shows anything the game did not report.

const STEPS = ["Talk 1/3", "Talk 2/3", "Talk 3/3", "Vote", "Night"];

function currentStep(phase: string, round: number | null): number | null {
  if (phase === "day_discussion") return Math.min(Math.max(round ?? 1, 1), 3) - 1;
  if (phase === "day_vote") return 3;
  if (phase === "night_action" || phase === "night_notebook") return 4;
  return null; // setup, game over, memory update: show the plain label instead
}

interface Props {
  day: number;
  phase: string;
  round: number | null;
  label: string; // the reducer's phase label, used when there is no step to highlight
  finished: boolean;
}

export function PhaseSteps({ day, phase, round, label, finished }: Props) {
  const now = finished ? null : currentStep(phase, round);
  if (now === null || day < 1) return <span className="phase">{label}</span>;
  return (
    <div className="steps" aria-label={label}>
      <span className="day">Day {day}</span>
      {STEPS.map((step, i) => (
        <span key={step} className="inline">
          {i > 0 && <span className="step-arrow" aria-hidden="true">▸</span>}
          <span className={"step" + (i < now ? " done" : i === now ? " now" : "")} aria-current={i === now ? "step" : undefined}>
            {i < now ? "✓ " : i === now ? "● " : ""}
            {step}
          </span>
        </span>
      ))}
    </div>
  );
}
