// Where we are in the current day, as steps: the night, the talk rounds, then the vote
// (each day starts with a night).
// Built only from the phase, round and day the reducer already tracks (the same data
// as the phase label), so it never shows anything the game did not report.

const steps = (rounds: number) => ["Night", ...Array.from({ length: rounds }, (_, i) => `Talk ${i + 1}/${rounds}`), "Vote"];

function currentStep(phase: string, round: number | null, rounds: number): number | null {
  if (phase === "night_action" || phase === "night_notebook") return 0;
  if (phase === "day_discussion") return Math.min(Math.max(round ?? 1, 1), rounds);
  if (phase === "day_vote" || phase === "day_runoff") return rounds + 1;
  return null; // setup, game over, memory update: show the plain label instead
}

interface Props {
  day: number;
  phase: string;
  round: number | null;
  label: string; // the reducer's phase label, used when there is no step to highlight
  finished: boolean;
  rounds: number; // discussion rounds per day
}

export function PhaseSteps({ day, phase, round, label, finished, rounds }: Props) {
  const now = finished ? null : currentStep(phase, round, rounds);
  if (now === null || day < 1) return <span className="phase">{label}</span>;
  return (
    <div className="steps" aria-label={label}>
      <span className="day">Day {day}</span>
      {steps(rounds).map((step, i) => (
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
