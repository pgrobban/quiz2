/**
 * Scramble candidates for each of the 6 math-round tile positions, matching
 * the fixed grouping the server always generates in: 4 single-digit
 * numbers, then one "medium" number (10/15/20), then one "large" number
 * (25/50/75/100). Used so the reveal animation flickers through plausible
 * values for each slot instead of generic random digits.
 */
export const MATH_SCRAMBLE_PER_TILE: string[][] = [
  "123456789".split(""),
  "123456789".split(""),
  "123456789".split(""),
  "123456789".split(""),
  ["10", "15", "20"],
  ["25", "50", "75", "100"],
];

/**
 * Generates a handful of random 3-digit numbers to scramble through while
 * the target is revealing (targets are always 100-999). Should be memoized
 * per round (e.g. via useMemo keyed on the target value) so it doesn't
 * regenerate - and thus visually jump - on every unrelated re-render.
 */
export function generateTargetScrambleCandidates(): string[] {
  return Array.from({ length: 15 }, () => String(Math.floor(Math.random() * 900) + 100));
}
