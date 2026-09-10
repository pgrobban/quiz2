import { randomInt } from "node:crypto";
import type {
  GameRound,
  LetterSubmission,
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
  MATCHING_BANK,
  QUESTION_BANK,
  ROUND_CATALOG,
  QuestionWithAnswer,
  toPublicMatchingBoard,
  toPublicQuestion,
} from "./questions";
import { canFormWord, findTopWords, generateLetters, isDictionaryWord } from "./letters";

interface InternalRoom {
  public: RoomState;
  /** Ordered subset of the round's question bank the host chose to play, with answers. */
  selectedQuestions: QuestionWithAnswer[];
  /** Ordered subset of the matching round's board bank the host chose to play, with answer keys. */
  selectedMatchingBoards: MatchingBoardBankItem[];
  /** playerId -> whether their submitted answer for the *current* question was correct. */
  pendingAnswers: Map<string, boolean>;
  /** playerId -> the word they've locked in for the current letters round. */
  letterSubmissions: Map<string, string>;
  /** playerId -> the pairs they've locked in so far for the current matching board. */
  matchingGuesses: Map<string, MatchingGuess[]>;
}

export interface AdvanceResult {
  room: RoomState;
  question?: Question;
  matchingBoard?: MatchingBoard;
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

export type SubmitAnswerResult =
  | { ok: true; correct: boolean }
  | { ok: false; error: string };

export type SubmitWordResult = { ok: true } | { ok: false; error: string };

export type SubmitMatchingBoardResult = { ok: true } | { ok: false; error: string };

const POINTS_PER_CORRECT_ANSWER = 100;
/** Points awarded per letter of a valid word in the letters round (an 8-letter word = 80pts). */
const POINTS_PER_LETTER = 10;
/** Points awarded per correctly-matched pair in the matching round. */
const POINTS_PER_CORRECT_PAIR = 100;

/** How long players have to answer a standard multiple-choice question. */
const QUESTION_TIME_LIMIT_MS = 15_000;
/** How long players have to build and lock in a word for the letters round. */
const LETTERS_TIME_LIMIT_MS = 60_000;
/** How long players have to match as many pairs as they can in the matching round. */
const MATCHING_TIME_LIMIT_MS = 90_000;
/**
 * How long the client-side letter reveal animation takes (12 letters x 3s
 * each - see client/src/components/LetterReveal.tsx). The answer timer
 * shouldn't start ticking until all 12 letters have actually appeared.
 */
const LETTERS_REVEAL_ANIMATION_MS = 12 * 3000;

export { LETTERS_REVEAL_ANIMATION_MS };

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
        phaseDeadline: null,
      },
      selectedQuestions: [],
      selectedMatchingBoards: [],
      pendingAnswers: new Map(),
      letterSubmissions: new Map(),
      matchingGuesses: new Map(),
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
    internal.selectedQuestions = [];
    internal.selectedMatchingBoards = [];
    internal.pendingAnswers.clear();
    internal.letterSubmissions.clear();
    internal.matchingGuesses.clear();

    if (round === "letters") {
      // The letters round is procedurally generated - there's no bank of
      // questions for the host to pick from, so it's immediately "ready".
      internal.public.totalQuestions = 1;
      return { ok: true, room: internal.public, availableQuestions: [], availableMatchingBoards: [] };
    }

    if (round === "matching") {
      return {
        ok: true,
        room: internal.public,
        availableQuestions: [],
        availableMatchingBoards: MATCHING_BANK,
      };
    }

    return {
      ok: true,
      room: internal.public,
      availableQuestions: QUESTION_BANK[round],
      availableMatchingBoards: [],
    };
  }

  /** Host picks (and orders) which questions/boards from the selected round's bank to play. */
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

    const letters = generateLetters();
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
      const points = valid ? word.length * POINTS_PER_LETTER : 0;
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

  advanceToNextQuestion(code: string): AdvanceResult | undefined {
    const internal = this.rooms.get(code);
    if (!internal) return undefined;

    const isMatching = internal.public.round === "matching";
    const totalItems = isMatching
      ? internal.selectedMatchingBoards.length
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
    internal.public.phaseDeadline = null;
    internal.selectedQuestions = [];
    internal.selectedMatchingBoards = [];
    internal.pendingAnswers.clear();
    internal.letterSubmissions.clear();
    internal.matchingGuesses.clear();
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
      const points = correctCount * POINTS_PER_CORRECT_PAIR;
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

  closeRoom(code: string): void {
    this.rooms.delete(code);
  }
}
