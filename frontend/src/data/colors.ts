// Shared colours. Role colours only appear in spectator view.
export const ROLE_COLOR: Record<string, string> = {
  mafia: "var(--mafia)",
  detective: "var(--detective)",
  villager: "var(--villager)",
};

export const ROLE_LABEL: Record<string, string> = {
  mafia: "Mafia",
  detective: "Detective",
  villager: "Villager",
};

// One stable colour per seat for line charts.
const SEAT_COLORS = ["#6366f1", "#0ea5e9", "#14b8a6", "#f59e0b", "#ec4899", "#8b5cf6", "#84cc16", "#f97316"];
export const seatColor = (players: string[], id: string) =>
  SEAT_COLORS[Math.max(0, players.indexOf(id)) % SEAT_COLORS.length];

/** Suspicion colour: amber at low p, red at high p. */
export function suspicionColor(p: number): string {
  const t = Math.max(0, Math.min(1, p));
  const from = [245, 158, 11];
  const to = [220, 38, 38];
  const mix = from.map((c, i) => Math.round(c + (to[i] - c) * t));
  return `rgb(${mix.join(",")})`;
}
