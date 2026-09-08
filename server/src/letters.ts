import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

// ---- Weighted letter generation (loosely modeled on Scrabble-ish English
// letter frequency, split into vowel/consonant pools like a Countdown-style
// "letters round"). ----

const VOWEL_WEIGHTS: Record<string, number> = { A: 9, E: 12, I: 9, O: 8, U: 4 };
const CONSONANT_WEIGHTS: Record<string, number> = {
  B: 2,
  C: 3,
  D: 4,
  F: 2,
  G: 3,
  H: 2,
  J: 1,
  K: 1,
  L: 4,
  M: 2,
  N: 6,
  P: 2,
  Q: 1,
  R: 6,
  S: 6,
  T: 6,
  V: 1,
  W: 2,
  X: 1,
  Y: 2,
  Z: 1,
};

const TOTAL_LETTERS = 12;
const MIN_VOWELS = 4;
const MAX_VOWELS = 6;

function weightedPick(weights: Record<string, number>): string {
  const entries = Object.entries(weights);
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = Math.random() * total;
  for (const [letter, weight] of entries) {
    roll -= weight;
    if (roll <= 0) return letter;
  }
  return entries[entries.length - 1][0];
}

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** Generates 12 random letters, weighted toward realistic English letter frequency. */
export function generateLetters(): string[] {
  const vowelCount =
    MIN_VOWELS + Math.floor(Math.random() * (MAX_VOWELS - MIN_VOWELS + 1));
  const consonantCount = TOTAL_LETTERS - vowelCount;

  const letters: string[] = [];
  for (let i = 0; i < vowelCount; i++) letters.push(weightedPick(VOWEL_WEIGHTS));
  for (let i = 0; i < consonantCount; i++) letters.push(weightedPick(CONSONANT_WEIGHTS));

  return shuffle(letters);
}

// ---- Dictionary loading + word validation ----

let dictionary: string[] | null = null;

function loadDictionary(): string[] {
  if (dictionary) return dictionary;
  // In dev (tsx), __dirname is server/src. In the built output, __dirname is
  // server/dist/server/src (rootDir ".." mirrors the repo layout) - the
  // data folder only lives under the original server/src/, so fall back to
  // that location (and finally a cwd-relative guess) if not found alongside.
  const candidates = [
    join(__dirname, "data", "words.txt"),
    join(__dirname, "..", "..", "..", "src", "data", "words.txt"),
    join(process.cwd(), "server", "src", "data", "words.txt"),
    join(process.cwd(), "src", "data", "words.txt"),
  ];
  const path = candidates.find((candidate) => existsSync(candidate));
  if (!path) {
    throw new Error(`Could not locate words.txt dictionary (looked in: ${candidates.join(", ")})`);
  }
  const raw = readFileSync(path, "utf-8");
  dictionary = raw.split("\n").map((w) => w.trim()).filter(Boolean);
  return dictionary;
}

function letterCounts(letters: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const letter of letters) {
    counts.set(letter, (counts.get(letter) ?? 0) + 1);
  }
  return counts;
}

/** Whether `word` can be spelled using only the given letters (respecting how many of each are available). */
export function canFormWord(word: string, availableLetters: string[]): boolean {
  const available = letterCounts(availableLetters.map((l) => l.toUpperCase()));
  for (const char of word.toUpperCase()) {
    const remaining = available.get(char) ?? 0;
    if (remaining <= 0) return false;
    available.set(char, remaining - 1);
  }
  return true;
}

/** Whether `word` is a real dictionary word (case-insensitive). */
export function isDictionaryWord(word: string): boolean {
  const dict = loadDictionary();
  const normalized = word.toLowerCase();
  // Small dictionaries could use a Set for O(1) lookups; ours is ~300k
  // entries, so build a lazily-cached Set instead of re-scanning an array.
  return getDictionarySet().has(normalized);
}

let dictionarySet: Set<string> | null = null;
function getDictionarySet(): Set<string> {
  if (!dictionarySet) {
    dictionarySet = new Set(loadDictionary());
  }
  return dictionarySet;
}

/** Finds up to `limit` of the longest dictionary words constructible from the given letters. */
export function findTopWords(letters: string[], limit = 5): string[] {
  const dict = loadDictionary();
  const matches: string[] = [];
  for (const word of dict) {
    if (canFormWord(word, letters)) matches.push(word);
  }
  matches.sort((a, b) => b.length - a.length || a.localeCompare(b));
  return matches.slice(0, limit);
}
