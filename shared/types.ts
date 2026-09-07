// Shared types between server and client for the quiz game.

export interface Player {
  id: string; // socket id
  name: string;
  score: number;
}

/** A question as seen by players/spectators before the answer is revealed. */
export interface Question {
  id: string;
  text: string;
  options: string[];
}

export type GamePhase = "lobby" | "question" | "reveal" | "finished";

export interface RoomState {
  code: string;
  hostId: string;
  players: Player[];
  phase: GamePhase;
  currentQuestionIndex: number;
  totalQuestions: number;
  answeredCount: number;
}

export interface RevealPayload {
  index: number;
  correctIndex: number;
  players: Player[];
}

export interface QuestionPayload {
  index: number;
  total: number;
  question: Question;
}

export interface ClientToServerEvents {
  "host:create-room": (
    callback: (response: { ok: true; room: RoomState } | { ok: false; error: string }) => void
  ) => void;

  "player:join-room": (
    payload: { code: string; name: string },
    callback: (response: { ok: true; room: RoomState } | { ok: false; error: string }) => void
  ) => void;

  "spectator:join-room": (
    payload: { code: string },
    callback: (
      response:
        | {
          ok: true;
          room: RoomState;
          question: Question | null;
          correctIndex: number | null;
        }
        | { ok: false; error: string }
    ) => void
  ) => void;

  "host:start-game": (payload: { code: string }) => void;

  "host:reveal-answer": (payload: { code: string }) => void;

  "host:next-question": (payload: { code: string }) => void;

  "player:submit-answer": (
    payload: { code: string; optionIndex: number },
    callback: (response: { ok: true; correct: boolean } | { ok: false; error: string }) => void
  ) => void;

  "player:leave-room": (payload: { code: string }) => void;
}

export interface ServerToClientEvents {
  "room:update": (room: RoomState) => void;
  "game:question": (payload: QuestionPayload) => void;
  "game:reveal": (payload: RevealPayload) => void;
  "game:finished": (payload: { players: Player[] }) => void;
  "room:closed": (payload: { reason: string }) => void;
  "error-message": (payload: { message: string }) => void;
}

export interface InterServerEvents { }

export interface SocketData {
  roomCode?: string;
  playerName?: string;
  isHost?: boolean;
  isSpectator?: boolean;
}
