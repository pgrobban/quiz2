import { randomInt } from "node:crypto";
import type {
  GameRound,
  Player,
  Question,
  QuestionBankItem,
  RoomState,
} from "../../shared/types";
import { QUESTION_BANK, ROUND_CATALOG, QuestionWithAnswer, toPublicQuestion } from "./questions";

interface InternalRoom {
  public: RoomState;
  /** Ordered subset of the round's question bank the host chose to play, with answers. */
  selectedQuestions: QuestionWithAnswer[];
  /** playerId -> whether their submitted answer for the *current* question was correct. */
  pendingAnswers: Map<string, boolean>;
}

export interface AdvanceResult {
  room: RoomState;
  question?: Question;
  roundEnded: boolean;
}

export interface RevealResult {
  room: RoomState;
  correctIndex: number;
}

export type SubmitAnswerResult =
  | { ok: true; correct: boolean }
  | { ok: false; error: string };

const POINTS_PER_CORRECT_ANSWER = 100;

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
      },
      selectedQuestions: [],
      pendingAnswers: new Map(),
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
    return internal.public;
  }

  isNameTaken(code: string, name: string): boolean {
    const internal = this.rooms.get(code);
    if (!internal) return false;
    return internal.public.players.some(
      (p) => p.name.toLowerCase() === name.toLowerCase()
    );
  }

  /** Host picks which round to play next; returns that round's full question bank to choose from. */
  selectRound(
    code: string,
    round: GameRound
  ): { ok: true; room: RoomState; availableQuestions: QuestionBankItem[] } | { ok: false; error: string } {
    const internal = this.rooms.get(code);
    if (!internal) return { ok: false, error: "Room not found." };
    if (internal.public.phase !== "lobby") {
      return { ok: false, error: "Can't change rounds while a round is in progress." };
    }

    internal.public.round = round;
    internal.public.roundInfo = ROUND_CATALOG[round];
    internal.public.currentQuestionIndex = -1;
    internal.public.totalQuestions = 0;
    internal.selectedQuestions = [];
    internal.pendingAnswers.clear();

    return {
      ok: true,
      room: internal.public,
      availableQuestions: QUESTION_BANK[round],
    };
  }

  /** Host picks (and orders) which questions from the selected round's bank to play. */
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
    if (!internal.public.round || internal.selectedQuestions.length === 0) {
      return { ok: false, error: "Select a round and its questions first." };
    }

    internal.public.phase = "introduction";
    return { ok: true, room: internal.public };
  }

  /** Moves from the tutorial screen to the first question of the round. */
  startFirstQuestion(
    code: string
  ): { ok: true; room: RoomState; question: Question } | { ok: false; error: string } {
    const internal = this.rooms.get(code);
    if (!internal) return { ok: false, error: "Room not found." };
    if (internal.public.phase !== "introduction") {
      return { ok: false, error: "Show the tutorial before starting questions." };
    }

    internal.public.phase = "question";
    internal.public.currentQuestionIndex = 0;
    internal.public.answeredCount = 0;
    internal.pendingAnswers.clear();

    return {
      ok: true,
      room: internal.public,
      question: toPublicQuestion(internal.selectedQuestions[0]),
    };
  }

  advanceToNextQuestion(code: string): AdvanceResult | undefined {
    const internal = this.rooms.get(code);
    if (!internal) return undefined;

    const nextIndex = internal.public.currentQuestionIndex + 1;
    if (nextIndex >= internal.selectedQuestions.length) {
      this.resetToLobby(internal);
      return { room: internal.public, roundEnded: true };
    }

    internal.public.currentQuestionIndex = nextIndex;
    internal.public.phase = "question";
    internal.public.answeredCount = 0;
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
    internal.selectedQuestions = [];
    internal.pendingAnswers.clear();
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

  closeRoom(code: string): void {
    this.rooms.delete(code);
  }
}
