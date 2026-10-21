/** Deep player backgrounds chosen for high contrast with white text. */
const PLAYER_COLORS = ["#1E40AF", "#991B1B"];

export function colorForPlayerIndex(index: number): string {
  return PLAYER_COLORS[index % PLAYER_COLORS.length];
}

/**
 * Looks up the color for a specific player id within an ordered list of
 * players (e.g. `associationsTurn.finalists`). Returns undefined if the
 * player isn't found (nothing to highlight).
 */
export function getPlayerColor(
  players: { id: string }[],
  playerId: string | null | undefined,
): string | undefined {
  if (!playerId) return undefined;
  const index = players.findIndex((p) => p.id === playerId);
  return index === -1 ? undefined : colorForPlayerIndex(index);
}
