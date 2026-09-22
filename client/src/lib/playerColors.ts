import { colorForPairIndex } from "./pairColors";

/**
 * Assigns each player a stable, visually distinct color based on their
 * position in a given ordered list (e.g. the associations round's 2
 * finalists) - reuses the same palette as the matching round's pair
 * highlighting for visual consistency across the app.
 */
export function colorForPlayerIndex(index: number): string {
  return colorForPairIndex(index);
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
