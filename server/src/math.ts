import type { MathChallenge } from "../../shared/types";

const SMALL_MIN = 1;
const SMALL_MAX = 9;
const MEDIUM_NUMBERS = [10, 15, 20];
const LARGE_NUMBERS = [25, 50, 75, 100];

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

/**
 * Generates a 3-digit target and 6 numbers to combine: 4 single-digit
 * numbers, one "medium" number (10/15/20), and one "large" number
 * (25/50/75/100) - a Countdown-numbers-round-style challenge. The numbers
 * are always returned in this grouped order (digits, then medium, then
 * large) rather than shuffled together, so the reveal animation and layout
 * can consistently reflect which "kind" of number each position holds.
 */
export function generateMathChallenge(): MathChallenge {
  const target = randomInt(100, 999);
  const numbers: number[] = [];
  for (let i = 0; i < 4; i++) numbers.push(randomInt(SMALL_MIN, SMALL_MAX));
  numbers.push(pick(MEDIUM_NUMBERS));
  numbers.push(pick(LARGE_NUMBERS));
  return { target, numbers };
}

// ---- Expression parsing & evaluation ----

type TokenType = "NUMBER" | "PLUS" | "MINUS" | "STAR" | "SLASH" | "LPAREN" | "RPAREN";
interface Token {
  type: TokenType;
  value?: number;
}

class ExpressionError extends Error {}

function tokenize(expression: string): Token[] | null {
  const tokens: Token[] = [];
  let i = 0;
  while (i < expression.length) {
    const ch = expression[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if (/[0-9]/.test(ch)) {
      let j = i;
      while (j < expression.length && /[0-9]/.test(expression[j])) j++;
      tokens.push({ type: "NUMBER", value: parseInt(expression.slice(i, j), 10) });
      i = j;
      continue;
    }
    switch (ch) {
      case "+":
        tokens.push({ type: "PLUS" });
        i++;
        break;
      case "-":
        tokens.push({ type: "MINUS" });
        i++;
        break;
      case "*":
      case "x":
      case "X":
      case "×":
        tokens.push({ type: "STAR" });
        i++;
        break;
      case "/":
      case "÷":
        tokens.push({ type: "SLASH" });
        i++;
        break;
      case "(":
        tokens.push({ type: "LPAREN" });
        i++;
        break;
      case ")":
        tokens.push({ type: "RPAREN" });
        i++;
        break;
      default:
        return null;
    }
  }
  return tokens;
}

/**
 * Recursive-descent parse + evaluate in one pass. Enforces the classic
 * "numbers round" constraint that every intermediate result must be a
 * positive integer (no fractions, no negatives/zero along the way) and
 * that division must be exact.
 */
function parseAndEvaluate(tokens: Token[]): { value: number; usedNumbers: number[] } {
  let pos = 0;
  const usedNumbers: number[] = [];

  const peek = () => tokens[pos];
  const consume = (type: TokenType): Token => {
    const t = tokens[pos];
    if (!t || t.type !== type) throw new ExpressionError("Couldn't understand that expression.");
    pos++;
    return t;
  };

  function parseExpr(): number {
    let value = parseTerm();
    while (peek()?.type === "PLUS" || peek()?.type === "MINUS") {
      const op = consume(peek()!.type);
      const rhs = parseTerm();
      if (op.type === "PLUS") {
        value += rhs;
      } else {
        value -= rhs;
        if (value <= 0) {
          throw new ExpressionError("Every step must stay a positive whole number.");
        }
      }
    }
    return value;
  }

  function parseTerm(): number {
    let value = parseFactor();
    while (peek()?.type === "STAR" || peek()?.type === "SLASH") {
      const op = consume(peek()!.type);
      const rhs = parseFactor();
      if (op.type === "STAR") {
        value *= rhs;
      } else {
        if (rhs === 0 || value % rhs !== 0) {
          throw new ExpressionError("Division must come out even.");
        }
        value /= rhs;
      }
    }
    return value;
  }

  function parseFactor(): number {
    const t = peek();
    if (!t) throw new ExpressionError("Couldn't understand that expression.");
    if (t.type === "NUMBER") {
      consume("NUMBER");
      usedNumbers.push(t.value!);
      return t.value!;
    }
    if (t.type === "LPAREN") {
      consume("LPAREN");
      const value = parseExpr();
      consume("RPAREN");
      return value;
    }
    throw new ExpressionError("Couldn't understand that expression.");
  }

  const value = parseExpr();
  if (pos !== tokens.length) {
    throw new ExpressionError("Couldn't understand that expression.");
  }
  return { value, usedNumbers };
}

export type EvaluateMathResult =
  | { ok: true; value: number }
  | { ok: false; error: string };

/**
 * Validates + evaluates a player's expression: only +, -, *, /, parentheses
 * and the given numbers are allowed (each usable only as many times as it
 * appears), every intermediate step must be a positive integer, and the
 * final result must be a whole number.
 */
export function evaluateMathExpression(
  expression: string,
  availableNumbers: number[]
): EvaluateMathResult {
  const trimmed = expression.trim();
  if (!trimmed) {
    return { ok: false, error: "Enter an expression first." };
  }

  const tokens = tokenize(trimmed);
  if (!tokens || tokens.length === 0) {
    return { ok: false, error: "Only numbers, + - * / and ( ) are allowed." };
  }

  try {
    const { value, usedNumbers } = parseAndEvaluate(tokens);

    const pool = [...availableNumbers];
    for (const n of usedNumbers) {
      const idx = pool.indexOf(n);
      if (idx === -1) {
        return { ok: false, error: `You can only use the given numbers (extra ${n}).` };
      }
      pool.splice(idx, 1);
    }

    if (!Number.isInteger(value) || value <= 0) {
      return { ok: false, error: "Result must be a positive whole number." };
    }

    return { ok: true, value };
  } catch (err) {
    const message = err instanceof ExpressionError ? err.message : "Invalid expression.";
    return { ok: false, error: message };
  }
}

// ---- Closest-possible-answer solver ----

export interface MathSolution {
  value: number;
  expression: string;
  distance: number;
}

interface SolverNode {
  value: number;
  expr: string;
  leaf: boolean;
  /** How many of the original numbers contributed to this value - used to prefer simpler solutions. */
  count: number;
}

/** Wraps a node's expression in parentheses unless it's a bare number. */
function wrapNode(node: SolverNode): string {
  return node.leaf ? node.expr : `(${node.expr})`;
}

interface BestSolution extends MathSolution {
  count: number;
}

/**
 * Finds the closest value to `target` reachable by combining any subset of
 * `numbers` with +, -, *, / (each intermediate result kept a positive
 * integer, same rules as evaluateMathExpression). This is the classic
 * "Countdown numbers round" brute-force solver: repeatedly combine any two
 * remaining values into one, recursing until a single value is left, while
 * tracking every intermediate value along the way (since players don't have
 * to use every number). Among equally-close answers, prefers the one using
 * the fewest numbers (e.g. "100 * 5 - 5" over an equivalent 6-number
 * expression), since a shorter solution is more useful to show players.
 */
export function findClosestSolution(numbers: number[], target: number): MathSolution | null {
  const state: { best: BestSolution | null } = { best: null };

  function consider(node: SolverNode) {
    const distance = Math.abs(target - node.value);
    const best = state.best;
    if (
      !best ||
      distance < best.distance ||
      (distance === best.distance && node.count < best.count)
    ) {
      state.best = { value: node.value, expression: node.expr, distance, count: node.count };
    }
  }

  function recurse(nodes: SolverNode[]) {
    for (const n of nodes) consider(n);
    if (nodes.length <= 1) return;

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        const rest = nodes.filter((_, idx) => idx !== i && idx !== j);
        const count = a.count + b.count;

        const candidates: SolverNode[] = [
          { value: a.value + b.value, expr: `${wrapNode(a)} + ${wrapNode(b)}`, leaf: false, count },
          { value: a.value * b.value, expr: `${wrapNode(a)} * ${wrapNode(b)}`, leaf: false, count },
        ];
        if (a.value > b.value) {
          candidates.push({
            value: a.value - b.value,
            expr: `${wrapNode(a)} - ${wrapNode(b)}`,
            leaf: false,
            count,
          });
        } else if (b.value > a.value) {
          candidates.push({
            value: b.value - a.value,
            expr: `${wrapNode(b)} - ${wrapNode(a)}`,
            leaf: false,
            count,
          });
        }
        if (b.value !== 0 && a.value % b.value === 0) {
          candidates.push({
            value: a.value / b.value,
            expr: `${wrapNode(a)} / ${wrapNode(b)}`,
            leaf: false,
            count,
          });
        }
        if (a.value !== 0 && b.value % a.value === 0) {
          candidates.push({
            value: b.value / a.value,
            expr: `${wrapNode(b)} / ${wrapNode(a)}`,
            leaf: false,
            count,
          });
        }

        for (const candidate of candidates) {
          recurse([...rest, candidate]);
        }
      }
    }
  }

  recurse(numbers.map((n) => ({ value: n, expr: String(n), leaf: true, count: 1 })));

  const best = state.best;
  return best ? { value: best.value, expression: best.expression, distance: best.distance } : null;
}
