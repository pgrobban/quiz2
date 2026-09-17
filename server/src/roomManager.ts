import { randomInt } from "node:crypto";
import type {
  AssociationsBoard,
  AssociationsBoardBankItem,
  AssociationsGuessTarget,
  AssociationsTurnState,
  GameRound,
  LetterSubmission,
  MathChallenge,
  MathSubmission,
  MatchingBoard,
  MatchingBoardBankItem,
  MatchingGuess,
  MatchingPlayerResult,
  Player,
  Question,
  QuestionBankItem,
  RoomState,
} from "../../shared/types";
import {
  ASSOCIATIONS_BANK,
  MATCHING_BANK,
  QUESTION_BANK,
  ROUND_CATALOG,
  QuestionWithAnswer,
  getAssociationsClueText,
  toPublicAssociationsBoard,
  toPublicMatchingBoard,
  toPublicQuestion,
} from "./questions";
import {
  canFormWord,
  findTopWords,
  generateLettersWithLongestWordGuarantee,
  isDictionaryWord,
} from "./letters";
import {
  evaluateMathExpression,
  findClosestSolution,
  generateMathChallenge,
  MathSolution,
} from "./math";

interface InternalRoom {
  public: RoomState;
  /** Ordered subset of the round's question bank the host chose to play, with answers. */
  selectedQuestions: QuestionWithAnswer[];
  /** Ordered subset of the matching round's board bank the host chose to play, with answer keys. */
  selectedMatchingBoards: MatchingBoardBankItem[];
  /** Ordered subset of the associations round's board bank the host chose to play, with answer keys. */
  selectedAssociationsBoards: AssociationsBoardBankItem[];
  /** The 2 players competing in the associations round, fixed for the whole round (all its boards). */
  associationsFinalists: Player[] | null;
  /** playerId -> whether their submitted answer for the *current* question was correct. */
  pendingAnswers: Map<string, boolean>;
  /** playerId -> the word they've locked in for the current letters round. */
  letterSubmissions: Map<string, string>;
  /** playerId -> the pairs they've locked in so far for the current matching board. */
  matchingGuesses: Map<string, MatchingGuess[]>;
  /** playerId -> their locked-in expression + evaluated result for the current math round. */
  mathSubmissions: Map<string, { expression: string; value: number | null; distance: number | null }>;
}

export interface AdvanceResult {
  room: RoomState;
  question?: Question;
  matchingBoard?: MatchingBoard;
  letters?: string[];
  mathChallenge?: MathChallenge;
  roundEnded: boolean;
}

export interface RevealResult {
  room: RoomState;
  correctIndex: number;
}

export interface LettersRevealResult {
  room: RoomState;
  submissions: LetterSubmission[];
  topWords: string[];
}

export interface MatchingRevealResult {
  room: RoomState;
  correctPairs: { leftId: string; rightId: string }[];
  results: MatchingPlayerResult[];
}

export interface MathRevealResult {
  room: RoomState;
  target: number;
  submissions: MathSubmission[];
  closestSolution: MathSolution | null;
}

export type SubmitAnswerResult =
  | { ok: true; correct: boolean }
  | { ok: false; error: string };

export type SubmitWordResult = { ok: true } | { ok: false; error: string };

export type SubmitMatchingBoardResult = { ok: true } | { ok: false; error: string };

export type SubmitMathResult =
  | { ok: true; value: number; distance: number }
  | { ok: false; error: string };

export type OpenAssociationsFieldResult = { ok: true } | { ok: false; error: string };
export type PeekAssociationsAnswerResult =
  | { ok: true; answer: string }
  | { ok: false; error: string };
export type JudgeAssociationsGuessResult = { ok: true } | { ok: false; error: string };

/** Quiz is a fast, low-friction warmup round - most players tend to get most
 * questions right, so it's weighted lighter than the more skill-testing
 * rounds to avoid front-loading the game with points. */
const POINTS_PER_CORRECT_ANSWER = 1;
/** Points awarded per letter of a valid word in the letters round - doubled for longer (8+ letter) words. */
const POINTS_PER_LETTER = 1;
const LONG_WORD_LENGTH_THRESHOLD = 8;
const LONG_WORD_POINTS_MULTIPLIER = 2;
/** Points awarded per correctly-matched pair in the matching round, plus a bonus for a perfect board. */
const POINTS_PER_CORRECT_PAIR = 1;
const POINTS_FOR_PERFECT_MATCHING_BOARD = 2;
/** Points awarded for correctly solving a column / the final solution in the associations round. */
const POINTS_PER_ASSOCIATIONS_COLUMN = 5;
const POINTS_PER_ASSOCIATIONS_FINAL = 10;

/** How long players have to answer a standard multiple-choice question. */
const QUESTION_TIME_LIMIT_MS = 15_000;
/** How long players have to build and lock in a word for the letters round. */
const LETTERS_TIME_LIMIT_MS = 60_000;
/** How long players have to match as many pairs as they can in the matching round. */
const MATCHING_TIME_LIMIT_MS = 90_000;
/** How long players have to combine the numbers in the math round. */
const MATH_TIME_LIMIT_MS = 90_000;
/**
 * How long the client-side letter reveal animation takes (12 letters x 3s
 * each - see client/src/components/LetterReveal.tsx). The answer timer
 * shouldn't start ticking until all 12 letters have actually appeared.
 */
const LETTERS_REVEAL_ANIMATION_MS = 12 * 3000;
/** Same idea, but for the math round's reveal animation: the target settles first, then the 6 numbers (7 tiles total). */
const MATH_REVEAL_ANIMATION_MS = 7 * 3000;

export { LETTERS_REVEAL_ANIMATION_MS, MATH_REVEAL_ANIMATION_MS };

/** Scores a math submission by how close it got to the target (closer = more points). */
function pointsForDistance(distance: number): number {
  if (distance === 0) return 15;
  if (distance <= 5) return 10;
  if (distance <= 10) return 5;
  return 0;
}

/**
 * In-memory store of active rooms. Since this is a simple quiz-night app,
 * we don't need persistence - state lives for the lifetime of the process.
 */
export class RoomManager {
  private rooms = new Map<string, InternalRoom>();

  /** Generates a unique 4-digit room code that isn't already in use. */
  private generateRoomCode(): string {
    let code: string;
    do {
      code = String(randomInt(1000, 10000));
    } while (this.rooms.has(code));
    return code;
  }

  createRoom(hostId: string): RoomState {
    const code = this.generateRoomCode();
    const room: InternalRoom = {
      public: {
        code,
        hostId,
        players: [],
        round: null,
        roundInfo: null,
        phase: "lobby",
        currentQuestionIndex: -1,
        totalQuestions: 0,
        answeredCount: 0,
        activeLetters: null,
        activeMatchingBoard: null,
        activeMathChallenge: null,
        activeAssociationsBoard: null,
        associationsTurn: null,
        phaseDeadline: null,
      },
      selectedQuestions: [],
      selectedMatchingBoards: [],
      selectedAssociationsBoards: [],
      associationsFinalists: null,
      pendingAnswers: new Map(),
      letterSubmissions: new Map(),
      matchingGuesses: new Map(),
      mathSubmissions: new Map(),
    };
    this.rooms.set(code, room);
    return room.public;
  }

  getRoom(code: string): RoomState | undefined {
    return this.rooms.get(code)?.public;
  }

  /** The currently-active public question, if any (used to sync late-joining spectators). */
  getCurrentQuestion(code: string): Question | null {
    const internal = this.rooms.get(code);
    if (!internal) return null;
    const { currentQuestionIndex, phase } = internal.public;
    if (phase !== "question" && phase !== "reveal") return null;
    const q = internal.selectedQuestions[currentQuestionIndex];
    return q ? toPublicQuestion(q) : null;
  }

  /** The correct answer index if the current question has already been revealed. */
  getCurrentCorrectIndex(code: string): number | null {
    const internal = this.rooms.get(code);
    if (!internal) return null;
    if (internal.public.phase !== "reveal") return null;
    const q = internal.selectedQuestions[internal.public.currentQuestionIndex];
    return q ? q.correctIndex : null;
  }

  addPlayer(code: string, player: Player): RoomState | undefined {
    const internal = this.rooms.get(code);
    if (!internal) return undefined;
    internal.public.players.push(player);
    return internal.public;
  }

  removePlayer(code: string, playerId: string): RoomState | undefined {
    const internal = this.rooms.get(code);
    if (!internal) return undefined;
    internal.public.players = internal.public.players.filter((p) => p.id !== playerId);
    internal.pendingAnswers.delete(playerId);
    internal.letterSubmissions.delete(playerId);
    internal.matchingGuesses.delete(playerId);
    internal.mathSubmissions.delete(playerId);
    return internal.public;
  }

  isNameTaken(code: string, name: string): boolean {
    const internal = this.rooms.get(code);
    if (!internal) return false;
    return internal.public.players.some(
      (p) => p.name.toLowerCase() === name.toLowerCase()
    );
  }

  /** Host picks which round to play next; returns that round's full question/board bank to choose from. */
  selectRound(
    code: string,
    round: GameRound
  ):
    | {
        ok: true;
        room: RoomState;
        availableQuestions: QuestionBankItem[];
        availableMatchingBoards: MatchingBoardBankItem[];
        availableAssociationsBoards: AssociationsBoardBankItem[];
      }
    | { ok: false; error: string } {
    const internal = this.rooms.get(code);
    if (!internal) return { ok: false, error: "Room not found." };
    if (internal.public.phase !== "lobby") {
      return { ok: false, error: "Can't change rounds while a round is in progress." };
    }

    internal.public.round = round;
    internal.public.roundInfo = ROUND_CATALOG[round];
    internal.public.currentQuestionIndex = -1;
    internal.public.totalQuestions = 0;
    internal.public.activeLetters = null;
    internal.public.activeMatchingBoard = null;
    internal.public.activeMathChallenge = null;
    internal.public.activeAssociationsBoard = null;
    internal.public.associationsTurn = null;
    internal.selectedQuestions = [];
    internal.selectedMatchingBoards = [];
    internal.selectedAssociationsBoards = [];
    internal.associationsFinalists = null;
    internal.pendingAnswers.clear();
    internal.letterSubmissions.clear();
    internal.matchingGuesses.clear();
    internal.mathSubmissions.clear();

    if (round === "matching") {
      return {
        ok: true,
        room: internal.public,
        availableQuestions: [],
        availableMatchingBoards: MATCHING_BANK,
        availableAssociationsBoards: [],
      };
    }

    if (round === "associations") {
      return {
        ok: true,
        room: internal.public,
        availableQuestions: [],
        availableMatchingBoards: [],
        availableAssociationsBoards: ASSOCIATIONS_BANK,
      };
    }

    return {
      ok: true,
      room: internal.public,
      availableQuestions: QUESTION_BANK[round],
      availableMatchingBoards: [],
      availableAssociationsBoards: [],
    };
  }

  /** Host picks (and orders) which questions/boards from the selected round's bank to play, or (for letters/math) how many rounds to play. */
  selectQuestions(
    code: string,
    questionIds: string[]
  ): { ok: true; room: RoomState } | { ok: false; error: string } {
    const internal = this.rooms.get(code);
    if (!internal) return { ok: false, error: "Room not found." };
    if (internal.public.phase !== "lobby") {
      return { ok: false, error: "Can't change questions while a round is in progress." };
    }
    if (!internal.public.round) {
      return { ok: false, error: "Select a round first." };
    }
    if (questionIds.length === 0) {
      return { ok: false, error: "Select at least one question." };
    }

    if (internal.public.round === "letters" || internal.public.round === "math") {
      // These rounds are procedurally generated each time - there's no bank
      // to pick specific items from, just how many rounds to play in a row
      // before returning to the lobby (so the tutorial isn't repeated).
      const count = questionIds.length;
      if (count > 20) {
        return { ok: false, error: "Choose 20 rounds or fewer." };
      }
      internal.public.totalQuestions = count;
      return { ok: true, room: internal.public };
    }

    if (internal.public.round === "matching") {
      const bank = new Map(MATCHING_BANK.map((b) => [b.id, b]));
      const selected: MatchingBoardBankItem[] = [];
      for (const id of questionIds) {
        const board = bank.get(id);
        if (!board) return { ok: false, error: `Unknown board id: ${id}` };
        selected.push(board);
      }
      internal.selectedMatchingBoards = selected;
      internal.public.totalQuestions = selected.length;
      return { ok: true, room: internal.public };
    }

    if (internal.public.round === "associations") {
      const bank = new Map(ASSOCIATIONS_BANK.map((b) => [b.id, b]));
      const selected: AssociationsBoardBankItem[] = [];
      for (const id of questionIds) {
        const board = bank.get(id);
        if (!board) return { ok: false, error: `Unknown board id: ${id}` };
        selected.push(board);
      }
      internal.selectedAssociationsBoards = selected;
      internal.public.totalQuestions = selected.length;
      return { ok: true, room: internal.public };
    }

    const bank = QUESTION_BANK[internal.public.round];
    const byId = new Map(bank.map((q) => [q.id, q]));
    const selected: QuestionWithAnswer[] = [];
    for (const id of questionIds) {
      const q = byId.get(id);
      if (!q) return { ok: false, error: `Unknown question id: ${id}` };
      selected.push(q);
    }

    internal.selectedQuestions = selected;
    internal.public.totalQuestions = selected.length;

    return { ok: true, room: internal.public };
  }

  /** Moves the room into the "introduction" phase so everyone sees the round's tutorial. */
  showTutorial(code: string): { ok: true; room: RoomState } | { ok: false; error: string } {
    const internal = this.rooms.get(code);
    if (!internal) return { ok: false, error: "Room not found." };
    if (internal.public.phase !== "lobby") {
      return { ok: false, error: "Room isn't ready for a tutorial right now." };
    }
    if (!internal.public.round || internal.public.totalQuestions === 0) {
      return { ok: false, error: "Select a round and its questions first." };
    }

    internal.public.phase = "introduction";
    return { ok: true, room: internal.public };
  }

  /** Moves from the tutorial screen to the first question (or matching board) of the round. */
  startFirstQuestion(
    code: string
  ):
    | { ok: true; room: RoomState; question?: Question; matchingBoard?: MatchingBoard }
    | { ok: false; error: string } {
    const internal = this.rooms.get(code);
    if (!internal) return { ok: false, error: "Room not found." };
    if (internal.public.phase !== "introduction") {
      return { ok: false, error: "Show the tutorial before starting questions." };
    }

    internal.public.phase = "question";
    internal.public.currentQuestionIndex = 0;
    internal.public.answeredCount = 0;

    if (internal.public.round === "matching") {
      const board = toPublicMatchingBoard(internal.selectedMatchingBoards[0]);
      internal.public.activeMatchingBoard = board;
      internal.public.phaseDeadline = Date.now() + MATCHING_TIME_LIMIT_MS;
      internal.matchingGuesses.clear();
      return { ok: true, room: internal.public, matchingBoard: board };
    }

    if (internal.public.round === "associations") {
      const sortedByScore = [...internal.public.players].sort((a, b) => b.score - a.score);
      if (sortedByScore.length < 2) {
        // Revert - we already flipped to "question" phase above.
        internal.public.phase = "introduction";
        internal.public.currentQuestionIndex = -1;
        return { ok: false, error: "Need at least 2 players for the Associations round." };
      }

      const finalists = sortedByScore.slice(0, 2);
      internal.associationsFinalists = finalists;
      this.beginAssociationsBoard(internal, 0, finalists[0].id);
      return { ok: true, room: internal.public };
    }

    internal.public.phaseDeadline = Date.now() + QUESTION_TIME_LIMIT_MS;
    internal.pendingAnswers.clear();

    return {
      ok: true,
      room: internal.public,
      question: toPublicQuestion(internal.selectedQuestions[0]),
    };
  }

  /** Letters round: generates the 12 letters and moves from the tutorial screen into play. */
  startLettersRound(
    code: string
  ): { ok: true; room: RoomState; letters: string[] } | { ok: false; error: string } {
    const internal = this.rooms.get(code);
    if (!internal) return { ok: false, error: "Room not found." };
    if (internal.public.phase !== "introduction") {
      return { ok: false, error: "Show the tutorial before starting the round." };
    }

    const letters = generateLettersWithLongestWordGuarantee();
    internal.public.phase = "question";
    internal.public.currentQuestionIndex = 0;
    internal.public.answeredCount = 0;
    internal.public.activeLetters = letters;
    // The countdown starts once the reveal animation finishes, not now -
    // see activateLettersTimer(), scheduled by the caller.
    internal.public.phaseDeadline = null;
    internal.letterSubmissions.clear();

    return { ok: true, room: internal.public, letters };
  }

  /**
   * Starts the actual answer countdown for the letters round, once the
   * reveal animation has had time to finish on clients. No-ops if the round
   * has since moved on (host ended it early, etc).
   */
  activateLettersTimer(code: string): RoomState | undefined {
    const internal = this.rooms.get(code);
    if (!internal) return undefined;
    if (internal.public.phase !== "question" || internal.public.round !== "letters") {
      return undefined;
    }

    internal.public.phaseDeadline = Date.now() + LETTERS_TIME_LIMIT_MS;
    return internal.public;
  }

  /** Letters round: locks in a player's word (one submission per player per round). */
  submitWord(code: string, playerId: string, word: string): SubmitWordResult {
    const internal = this.rooms.get(code);
    if (!internal) return { ok: false, error: "Room not found." };
    if (internal.public.phase !== "question" || internal.public.round !== "letters") {
      return { ok: false, error: "Not accepting words right now." };
    }
    if (
      internal.public.phaseDeadline !== null &&
      Date.now() > internal.public.phaseDeadline
    ) {
      return { ok: false, error: "Time's up!" };
    }
    if (internal.letterSubmissions.has(playerId)) {
      return { ok: false, error: "You already locked in a word." };
    }

    const cleaned = word.trim().toUpperCase().replace(/[^A-Z]/g, "");
    if (!cleaned) {
      return { ok: false, error: "Enter a word first." };
    }

    internal.letterSubmissions.set(playerId, cleaned);
    internal.public.answeredCount = internal.letterSubmissions.size;

    return { ok: true };
  }

  /** Letters round: scores every locked-in word and finds the best possible words. */
  revealLetters(code: string): LettersRevealResult | undefined {
    const internal = this.rooms.get(code);
    if (!internal || !internal.public.activeLetters) return undefined;

    const letters = internal.public.activeLetters;
    const submissions: LetterSubmission[] = [];

    for (const player of internal.public.players) {
      const word = internal.letterSubmissions.get(player.id);
      if (!word) continue;

      const valid = word.length >= 3 && canFormWord(word, letters) && isDictionaryWord(word);
      const perLetterPoints =
        word.length >= LONG_WORD_LENGTH_THRESHOLD
          ? POINTS_PER_LETTER * LONG_WORD_POINTS_MULTIPLIER
          : POINTS_PER_LETTER;
      const points = valid ? word.length * perLetterPoints : 0;
      if (points > 0) player.score += points;

      submissions.push({
        playerId: player.id,
        playerName: player.name,
        word,
        valid,
        points,
      });
    }

    internal.public.phase = "reveal";
    internal.public.phaseDeadline = null;
    internal.letterSubmissions.clear();

    return {
      room: internal.public,
      submissions,
      topWords: findTopWords(letters),
    };
  }

  /** Math round: generates the target + 6 numbers and moves from the tutorial screen into play. */
  startMathRound(
    code: string
  ): { ok: true; room: RoomState; challenge: MathChallenge } | { ok: false; error: string } {
    const internal = this.rooms.get(code);
    if (!internal) return { ok: false, error: "Room not found." };
    if (internal.public.phase !== "introduction") {
      return { ok: false, error: "Show the tutorial before starting the round." };
    }

    const challenge = generateMathChallenge();
    internal.public.phase = "question";
    internal.public.currentQuestionIndex = 0;
    internal.public.answeredCount = 0;
    internal.public.activeMathChallenge = challenge;
    // The countdown starts once the reveal animation finishes, not now -
    // see activateMathTimer(), scheduled by the caller.
    internal.public.phaseDeadline = null;
    internal.mathSubmissions.clear();

    return { ok: true, room: internal.public, challenge };
  }

  /**
   * Starts the actual answer countdown for the math round, once the reveal
   * animation has had time to finish on clients. No-ops if the round has
   * since moved on (host ended it early, etc).
   */
  activateMathTimer(code: string): RoomState | undefined {
    const internal = this.rooms.get(code);
    if (!internal) return undefined;
    if (internal.public.phase !== "question" || internal.public.round !== "math") {
      return undefined;
    }

    internal.public.phaseDeadline = Date.now() + MATH_TIME_LIMIT_MS;
    return internal.public;
  }

  /** Math round: locks in a player's expression (one submission per player per round). */
  submitMath(code: string, playerId: string, expression: string): SubmitMathResult {
    const internal = this.rooms.get(code);
    if (!internal) return { ok: false, error: "Room not found." };
    if (internal.public.phase !== "question" || internal.public.round !== "math") {
      return { ok: false, error: "Not accepting answers right now." };
    }
    if (
      internal.public.phaseDeadline !== null &&
      Date.now() > internal.public.phaseDeadline
    ) {
      return { ok: false, error: "Time's up!" };
    }
    if (internal.mathSubmissions.has(playerId)) {
      return { ok: false, error: "You already locked in an answer." };
    }

    const challenge = internal.public.activeMathChallenge;
    if (!challenge) return { ok: false, error: "No active challenge." };

    const result = evaluateMathExpression(expression, challenge.numbers);
    if (!result.ok) {
      // Rejected outright (not locked in) - the player keeps their attempt
      // and can fix the expression and try again before time runs out.
      return { ok: false, error: result.error };
    }

    const distance = Math.abs(challenge.target - result.value);
    internal.mathSubmissions.set(playerId, {
      expression: expression.trim(),
      value: result.value,
      distance,
    });
    internal.public.answeredCount = internal.mathSubmissions.size;

    return { ok: true, value: result.value, distance };
  }

  /** Math round: scores every locked-in expression by how close it got to the target. */
  revealMath(code: string): MathRevealResult | undefined {
    const internal = this.rooms.get(code);
    if (!internal || !internal.public.activeMathChallenge) return undefined;

    const submissions: MathSubmission[] = [];
    for (const player of internal.public.players) {
      const submission = internal.mathSubmissions.get(player.id);
      if (!submission) continue;

      const points = submission.distance !== null ? pointsForDistance(submission.distance) : 0;
      if (points > 0) player.score += points;

      submissions.push({
        playerId: player.id,
        playerName: player.name,
        expression: submission.expression,
        value: submission.value,
        distance: submission.distance,
        points,
      });
    }

    internal.public.phase = "reveal";
    internal.public.phaseDeadline = null;
    internal.mathSubmissions.clear();

    const challenge = internal.public.activeMathChallenge;
    const closestSolution = findClosestSolution(challenge.numbers, challenge.target);

    return {
      room: internal.public,
      target: challenge.target,
      submissions,
      closestSolution,
    };
  }

  advanceToNextQuestion(code: string): AdvanceResult | undefined {
    const internal = this.rooms.get(code);
    if (!internal) return undefined;

    const round = internal.public.round;
    const isMatching = round === "matching";
    const isLetters = round === "letters";
    const isMath = round === "math";
    const isAssociations = round === "associations";

    const totalItems = isMatching
      ? internal.selectedMatchingBoards.length
      : isAssociations
        ? internal.selectedAssociationsBoards.length
        : isLetters || isMath
          ? internal.public.totalQuestions
          : internal.selectedQuestions.length;

    const nextIndex = internal.public.currentQuestionIndex + 1;
    if (nextIndex >= totalItems) {
      this.resetToLobby(internal);
      return { room: internal.public, roundEnded: true };
    }

    internal.public.currentQuestionIndex = nextIndex;
    internal.public.phase = "question";
    internal.public.answeredCount = 0;

    if (isMatching) {
      const board = toPublicMatchingBoard(internal.selectedMatchingBoards[nextIndex]);
      internal.public.activeMatchingBoard = board;
      internal.public.phaseDeadline = Date.now() + MATCHING_TIME_LIMIT_MS;
      internal.matchingGuesses.clear();
      return { room: internal.public, matchingBoard: board, roundEnded: false };
    }

    if (isLetters) {
      const letters = generateLettersWithLongestWordGuarantee();
      internal.public.activeLetters = letters;
      // Countdown starts once the reveal animation finishes, like the first
      // round - see activateLettersTimer(), scheduled by the caller.
      internal.public.phaseDeadline = null;
      internal.letterSubmissions.clear();
      return { room: internal.public, letters, roundEnded: false };
    }

    if (isMath) {
      const challenge = generateMathChallenge();
      internal.public.activeMathChallenge = challenge;
      internal.public.phaseDeadline = null;
      internal.mathSubmissions.clear();
      return { room: internal.public, mathChallenge: challenge, roundEnded: false };
    }

    if (isAssociations) {
      const finalists = internal.associationsFinalists ?? [];
      // Alternate who opens the first field of each subsequent board.
      const startingPlayerId = finalists[nextIndex % 2]?.id ?? finalists[0]?.id;
      this.beginAssociationsBoard(internal, nextIndex, startingPlayerId);
      return { room: internal.public, roundEnded: false };
    }

    internal.public.phaseDeadline = Date.now() + QUESTION_TIME_LIMIT_MS;
    internal.pendingAnswers.clear();

    return {
      room: internal.public,
      question: toPublicQuestion(internal.selectedQuestions[nextIndex]),
      roundEnded: false,
    };
  }

  /** Bails out of the current round early, returning to the lobby round-picker. */
  endRoundEarly(code: string): RoomState | undefined {
    const internal = this.rooms.get(code);
    if (!internal) return undefined;
    this.resetToLobby(internal);
    return internal.public;
  }

  private resetToLobby(internal: InternalRoom): void {
    internal.public.phase = "lobby";
    internal.public.round = null;
    internal.public.roundInfo = null;
    internal.public.currentQuestionIndex = -1;
    internal.public.totalQuestions = 0;
    internal.public.answeredCount = 0;
    internal.public.activeLetters = null;
    internal.public.activeMatchingBoard = null;
    internal.public.activeMathChallenge = null;
    internal.public.activeAssociationsBoard = null;
    internal.public.associationsTurn = null;
    internal.public.phaseDeadline = null;
    internal.selectedQuestions = [];
    internal.selectedMatchingBoards = [];
    internal.selectedAssociationsBoards = [];
    internal.associationsFinalists = null;
    internal.pendingAnswers.clear();
    internal.letterSubmissions.clear();
    internal.matchingGuesses.clear();
    internal.mathSubmissions.clear();
  }

  /** Sets up the board + turn state for a given associations board index, with the given starting player. */
  private beginAssociationsBoard(
    internal: InternalRoom,
    boardIndex: number,
    startingPlayerId: string
  ): void {
    const boardItem = internal.selectedAssociationsBoards[boardIndex];
    const board = toPublicAssociationsBoard(boardItem);
    internal.public.activeAssociationsBoard = board;
    internal.public.associationsTurn = {
      finalists: internal.associationsFinalists ?? [],
      activePlayerId: startingPlayerId,
      openerPlayerId: startingPlayerId,
      mode: "open-or-guess",
    };
  }

  /** Ends the whole game (all rounds) and freezes the final scoreboard. */
  finishGame(code: string): RoomState | undefined {
    const internal = this.rooms.get(code);
    if (!internal) return undefined;
    internal.public.phase = "finished";
    return internal.public;
  }

  revealAnswer(code: string): RevealResult | undefined {
    const internal = this.rooms.get(code);
    if (!internal) return undefined;

    const question = internal.selectedQuestions[internal.public.currentQuestionIndex];
    if (!question) return undefined;

    internal.public.phase = "reveal";
    internal.public.phaseDeadline = null;

    // Apply score changes now that the answer is revealed, so scoreboards
    // don't spoil the answer while a question is still active.
    for (const [playerId, wasCorrect] of internal.pendingAnswers) {
      if (!wasCorrect) continue;
      const player = internal.public.players.find((p) => p.id === playerId);
      if (player) player.score += POINTS_PER_CORRECT_ANSWER;
    }
    internal.pendingAnswers.clear();

    return { room: internal.public, correctIndex: question.correctIndex };
  }

  submitAnswer(code: string, playerId: string, optionIndex: number): SubmitAnswerResult {
    const internal = this.rooms.get(code);
    if (!internal) return { ok: false, error: "Room not found." };
    if (internal.public.phase !== "question") {
      return { ok: false, error: "Not accepting answers right now." };
    }
    if (
      internal.public.phaseDeadline !== null &&
      Date.now() > internal.public.phaseDeadline
    ) {
      return { ok: false, error: "Time's up!" };
    }
    if (internal.pendingAnswers.has(playerId)) {
      return { ok: false, error: "You already answered this question." };
    }

    const question = internal.selectedQuestions[internal.public.currentQuestionIndex];
    if (!question) return { ok: false, error: "No active question." };

    const correct = optionIndex === question.correctIndex;
    internal.pendingAnswers.set(playerId, correct);
    internal.public.answeredCount = internal.pendingAnswers.size;

    return { ok: true, correct };
  }

  /**
   * Matching round: submits a player's final set of left/right pairings in
   * one go (sent once, when their local timer runs out - see
   * client/src/pages/JoinPage.tsx). Players can freely change their minds
   * client-side beforehand since nothing is locked in until this call.
   * Gated on the round still being in its "question" phase rather than the
   * exact deadline timestamp, since this is inherently a "time's up" event
   * and we don't want a network-latency race to spuriously reject it.
   */
  submitMatchingBoard(
    code: string,
    playerId: string,
    pairs: { leftId: string; rightId: string }[]
  ): SubmitMatchingBoardResult {
    const internal = this.rooms.get(code);
    if (!internal) return { ok: false, error: "Room not found." };
    if (internal.public.phase !== "question" || internal.public.round !== "matching") {
      return { ok: false, error: "Not accepting answers right now." };
    }
    if (internal.matchingGuesses.has(playerId)) {
      return { ok: false, error: "You've already submitted your answers." };
    }

    const board = internal.selectedMatchingBoards[internal.public.currentQuestionIndex];
    if (!board) return { ok: false, error: "No active board." };

    const validLeftIds = new Set(board.pairs.map((p) => p.left.id));
    const validRightIds = new Set(board.pairs.map((p) => p.right.id));
    const seenLeft = new Set<string>();
    const seenRight = new Set<string>();

    const guesses: MatchingGuess[] = [];
    for (const { leftId, rightId } of pairs) {
      if (!validLeftIds.has(leftId) || !validRightIds.has(rightId)) continue;
      if (seenLeft.has(leftId) || seenRight.has(rightId)) continue;
      seenLeft.add(leftId);
      seenRight.add(rightId);

      const correct = board.pairs.some((p) => p.left.id === leftId && p.right.id === rightId);
      guesses.push({ leftId, rightId, correct });
    }

    internal.matchingGuesses.set(playerId, guesses);
    internal.public.answeredCount = internal.matchingGuesses.size;

    return { ok: true };
  }

  /** Matching round: scores every player's locked-in guesses for the current board. */
  revealMatching(code: string): MatchingRevealResult | undefined {
    const internal = this.rooms.get(code);
    if (!internal) return undefined;

    const board = internal.selectedMatchingBoards[internal.public.currentQuestionIndex];
    if (!board) return undefined;

    const results: MatchingPlayerResult[] = [];
    for (const player of internal.public.players) {
      const guesses = internal.matchingGuesses.get(player.id) ?? [];
      const correctCount = guesses.filter((g) => g.correct).length;
      const perfectBoard = correctCount === board.pairs.length;
      const points =
        correctCount * POINTS_PER_CORRECT_PAIR +
        (perfectBoard ? POINTS_FOR_PERFECT_MATCHING_BOARD : 0);
      if (points > 0) player.score += points;

      results.push({
        playerId: player.id,
        playerName: player.name,
        guesses,
        correctCount,
        points,
      });
    }

    internal.public.phase = "reveal";
    internal.public.phaseDeadline = null;
    internal.matchingGuesses.clear();

    return {
      room: internal.public,
      correctPairs: board.pairs.map((p) => ({ leftId: p.left.id, rightId: p.right.id })),
      results,
    };
  }

  /** Associations round: host opens a closed clue field for the active player to see. */
  openAssociationsField(code: string, field: string): OpenAssociationsFieldResult {
    const internal = this.rooms.get(code);
    if (!internal) return { ok: false, error: "Room not found." };
    if (internal.public.phase !== "question" || internal.public.round !== "associations") {
      return { ok: false, error: "Not accepting board actions right now." };
    }

    const board = internal.public.activeAssociationsBoard;
    const turn = internal.public.associationsTurn;
    const boardItem = internal.selectedAssociationsBoards[internal.public.currentQuestionIndex];
    if (!board || !turn || !boardItem) return { ok: false, error: "No active board." };
    if (turn.mode !== "open-or-guess") {
      return { ok: false, error: "This player can only attempt a guess right now." };
    }

    const label = field[0];
    const column = board.columns.find((c) => c.label === label);
    const slot = column?.clues.find((c) => c.field === field);
    if (!column || !slot) return { ok: false, error: "Unknown field." };
    if (column.solved) return { ok: false, error: "That column is already solved." };
    if (slot.text !== null) return { ok: false, error: "That field is already open." };

    const clueText = getAssociationsClueText(boardItem, field);
    if (clueText === null) return { ok: false, error: "Unknown field." };

    slot.text = clueText;
    return { ok: true };
  }

  /**
   * Associations round: privately reveals the real answer for a guess
   * target to the host only. Doesn't change any state - just a lookup so
   * the host can judge the contestant's spoken answer.
   */
  peekAssociationsAnswer(
    code: string,
    target: AssociationsGuessTarget
  ): PeekAssociationsAnswerResult {
    const internal = this.rooms.get(code);
    if (!internal) return { ok: false, error: "Room not found." };
    if (internal.public.phase !== "question" || internal.public.round !== "associations") {
      return { ok: false, error: "Not accepting board actions right now." };
    }

    const board = internal.public.activeAssociationsBoard;
    const boardItem = internal.selectedAssociationsBoards[internal.public.currentQuestionIndex];
    if (!board || !boardItem) return { ok: false, error: "No active board." };

    if (target.type === "final") {
      if (board.finalSolved) return { ok: false, error: "The final solution is already solved." };
      return { ok: true, answer: boardItem.finalSolution };
    }

    const column = boardItem.columns.find((c) => c.label === target.column);
    const publicColumn = board.columns.find((c) => c.label === target.column);
    if (!column || !publicColumn) return { ok: false, error: "Unknown column." };
    if (publicColumn.solved) return { ok: false, error: "That column is already solved." };

    return { ok: true, answer: column.solution };
  }

  /** Associations round: records whether the active player's spoken guess was correct, and updates whose turn it is. */
  judgeAssociationsGuess(
    code: string,
    target: AssociationsGuessTarget,
    correct: boolean
  ): JudgeAssociationsGuessResult {
    const internal = this.rooms.get(code);
    if (!internal) return { ok: false, error: "Room not found." };
    if (internal.public.phase !== "question" || internal.public.round !== "associations") {
      return { ok: false, error: "Not accepting board actions right now." };
    }

    const board = internal.public.activeAssociationsBoard;
    const turn = internal.public.associationsTurn;
    const boardItem = internal.selectedAssociationsBoards[internal.public.currentQuestionIndex];
    if (!board || !turn || !boardItem) return { ok: false, error: "No active board." };

    const activePlayer = internal.public.players.find((p) => p.id === turn.activePlayerId);

    if (correct) {
      if (target.type === "final") {
        board.finalSolved = true;
        board.finalSolution = boardItem.finalSolution;
        // Reveal every remaining column (clues + solution) now that the
        // board is fully solved.
        for (const column of board.columns) {
          const bankColumn = boardItem.columns.find((c) => c.label === column.label);
          if (!bankColumn) continue;
          column.solved = true;
          column.solution = bankColumn.solution;
          for (const slot of column.clues) {
            if (slot.text === null) {
              slot.text = getAssociationsClueText(boardItem, slot.field);
            }
          }
        }
        if (activePlayer) activePlayer.score += POINTS_PER_ASSOCIATIONS_FINAL;
      } else {
        const column = board.columns.find((c) => c.label === target.column);
        const bankColumn = boardItem.columns.find((c) => c.label === target.column);
        if (!column || !bankColumn) return { ok: false, error: "Unknown column." };
        column.solved = true;
        column.solution = bankColumn.solution;
        // Reveal any remaining closed clues in this column now that it's solved.
        for (const slot of column.clues) {
          if (slot.text === null) {
            slot.text = getAssociationsClueText(boardItem, slot.field);
          }
        }
        if (activePlayer) activePlayer.score += POINTS_PER_ASSOCIATIONS_COLUMN;
      }

      // Correct guess: this player keeps control and opens the next field.
      turn.openerPlayerId = turn.activePlayerId;
      turn.mode = "open-or-guess";
      return { ok: true };
    }

    // Incorrect (or declined) guess.
    if (turn.mode === "open-or-guess") {
      // The opener's guess attempt failed - hand a single guess-only chance
      // to the other finalist.
      const other = turn.finalists.find((p) => p.id !== turn.activePlayerId);
      turn.openerPlayerId = turn.activePlayerId;
      turn.activePlayerId = other ? other.id : turn.activePlayerId;
      turn.mode = "guess-only";
    } else {
      // The guess-only opponent also failed/passed - control reverts to the
      // original opener, who gets to open a new field.
      turn.activePlayerId = turn.openerPlayerId;
      turn.mode = "open-or-guess";
    }

    return { ok: true };
  }

  /** Associations round: force-reveals whatever wasn't solved (no points awarded) and ends live play for this board. */
  revealAssociations(code: string): RoomState | undefined {
    const internal = this.rooms.get(code);
    if (!internal) return undefined;

    const board = internal.public.activeAssociationsBoard;
    const boardItem = internal.selectedAssociationsBoards[internal.public.currentQuestionIndex];
    if (!board || !boardItem) return undefined;

    for (const column of board.columns) {
      if (column.solved) continue;
      const bankColumn = boardItem.columns.find((c) => c.label === column.label);
      if (bankColumn) {
        column.solved = true;
        column.solution = bankColumn.solution;
      }
      // Reveal all clues in unsolved columns too, for the summary view.
      for (const slot of column.clues) {
        if (slot.text === null) {
          slot.text = getAssociationsClueText(boardItem, slot.field);
        }
      }
    }
    if (!board.finalSolved) {
      board.finalSolved = true;
      board.finalSolution = boardItem.finalSolution;
    }

    internal.public.phase = "reveal";
    return internal.public;
  }

  closeRoom(code: string): void {
    this.rooms.delete(code);
  }
}
