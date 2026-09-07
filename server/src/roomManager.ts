import { randomInt } from "node:crypto";
import type { Player, Question, RoomState } from "../../shared/types";
import { QUESTION_BANK, QuestionWithAnswer, toPublicQuestion } from "./questions";

interface InternalRoom {
  public: RoomState;
  questions: QuestionWithAnswer[];
  /** playerId -> whether their submitted answer for the *current* question was correct. Cleared each new question, applied to scores on reveal. */
  pendingAnswers: Map<string, boolean>;
}

export interface StartQuestionResult {
  room: RoomState;
  question: Question;
}

export interface AdvanceResult {
  room: RoomState;
  question?: Question;
  finished: boolean;
}

export interface RevealResult {
  room: RoomState;
  correctIndex: number;
}

export type SubmitAnswerResult =
  | { ok: true; correct: boolean }
  | { ok: false; error: string };

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
        phase: "lobby",
        currentQuestionIndex: -1,
        totalQuestions: QUESTION_BANK.length,
        answeredCount: 0,
      },
      questions: QUESTION_BANK,
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
    const q = internal.questions[currentQuestionIndex];
    return q ? toPublicQuestion(q) : null;
  }

  /** The correct answer index if the current question has already been revealed. */
  getCurrentCorrectIndex(code: string): number | null {
    const internal = this.rooms.get(code);
    if (!internal) return null;
    if (internal.public.phase !== "reveal") return null;
    const q = internal.questions[internal.public.currentQuestionIndex];
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

  startFirstQuestion(code: string): StartQuestionResult | undefined {
    const internal = this.rooms.get(code);
    if (!internal || internal.questions.length === 0) return undefined;

    internal.public.phase = "question";
    internal.public.currentQuestionIndex = 0;
    internal.public.answeredCount = 0;
    internal.pendingAnswers.clear();

    return {
      room: internal.public,
      question: toPublicQuestion(internal.questions[0]),
    };
  }

  advanceToNextQuestion(code: string): AdvanceResult | undefined {
    const internal = this.rooms.get(code);
    if (!internal) return undefined;

    const nextIndex = internal.public.currentQuestionIndex + 1;
    if (nextIndex >= internal.questions.length) {
      internal.public.phase = "finished";
      return { room: internal.public, finished: true };
    }

    internal.public.currentQuestionIndex = nextIndex;
    internal.public.phase = "question";
    internal.public.answeredCount = 0;
    internal.pendingAnswers.clear();

    return {
      room: internal.public,
      question: toPublicQuestion(internal.questions[nextIndex]),
      finished: false,
    };
  }

  revealAnswer(code: string): RevealResult | undefined {
    const internal = this.rooms.get(code);
    if (!internal) return undefined;

    const question = internal.questions[internal.public.currentQuestionIndex];
    if (!question) return undefined;

    internal.public.phase = "reveal";

    // Apply score changes now that the answer is revealed, so scoreboards
    // don't spoil the answer while a question is still active.
    const POINTS_PER_CORRECT_ANSWER = 100;
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

    const question = internal.questions[internal.public.currentQuestionIndex];
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
