/**
 * A palette of visually distinct colors used to highlight matching-round
 * pairs (each correct left/right pair shares one color) during the reveal.
 * Chosen for reasonable contrast against the app's dark theme.
 */
export const PAIR_COLORS = [
  "#f87171", // red
  "#fb923c", // orange
  "#facc15", // yellow
  "#4ade80", // green
  "#34d399", // teal
  "#22d3ee", // cyan
  "#60a5fa", // blue
  "#a78bfa", // violet
  "#f472b6", // pink
  "#fbbf24", // amber
];

export function colorForPairIndex(index: number): string {
  return PAIR_COLORS[index % PAIR_COLORS.length];
}

/**
 * Common color names mapped to real CSS colors. Used for matching boards
 * whose right-column answers *are* color names (e.g. "which line is which
 * color") - we can highlight those pairs with their actual color instead of
 * an arbitrary palette entry.
 */
const NAMED_COLORS: Record<string, string> = {
  white: "#f5f5f5",
  black: "#3a3a3a",
  gray: "#9ca3af",
  grey: "#9ca3af",
  red: "#ef4444",
  pink: "#ec4899",
  orange: "#f97316",
  yellow: "#eab308",
  brown: "#92400e",
  green: "#22c55e",
  "dark green": "#15803d",
  "light green": "#86efac",
  blue: "#3b82f6",
  "dark blue": "#1d4ed8",
  "light blue": "#7dd3fc",
  purple: "#a855f7",
  violet: "#8b5cf6",
  teal: "#14b8a6",
  cyan: "#22d3ee",
  gold: "#eab308",
  silver: "#cbd5e1",
  maroon: "#7f1d1d",
  navy: "#1e3a8a",
  turquoise: "#2dd4bf",
  beige: "#e7d8b1",
};

/** Looks up a real color for `text` if it's a recognized color name (case-insensitive). */
export function namedColor(text: string): string | null {
  return NAMED_COLORS[text.trim().toLowerCase()] ?? null;
}

/**
 * Resolves the highlight color for a matching-round pair: uses the actual
 * named color if the right-column answer is a recognizable color (e.g.
 * "Red", "Dark blue"), otherwise falls back to the generic palette.
 */
export function resolvePairColor(index: number, rightText: string | undefined): string {
  const named = rightText ? namedColor(rightText) : null;
  return named ?? colorForPairIndex(index);
}
