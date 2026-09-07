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

/** A question as seen by the host while picking which ones to use (answer included). */
export interface QuestionBankItem extends Question {
  correctIndex: number;
}

export type GameRound = "quiz" | "letters" | "matching" | "math" | "associations";

/**
 * Metadata + tutorial content for a round, shown to everyone (players &
 * spectators) during the "introduction" phase, before questions begin.
 */
export interface RoundInfo {
  id: GameRound;
  title: string;
  description: string;
  tutorial: {
    type: "image" | "video";
    url: string;
  };
}

export type GamePhase = "lobby" | "introduction" | "question" | "reveal" | "finished";

export interface RoomState {
  code: string;
  hostId: string;
  players: Player[];
  /** The round currently selected/being played, or null while the host is still choosing. */
  round: GameRound | null;
  /** Present once a round has been selected; drives the tutorial screen during "introduction". */
  roundInfo: RoundInfo | null;
  phase: GamePhase;
  /** -1 before the first question of the current round has been shown. */
  currentQuestionIndex: number;
  /** Number of questions the host selected for the current round. */
  totalQuestions: number;
  /** How many players have submitted an answer for the current question. */
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

  /** Host picks which round to play next. Returns the round's question bank so the host can pick questions. */
  "host:select-round": (
    payload: { code: string; round: GameRound },
    callback: (
      response:
        | { ok: true; room: RoomState; availableQuestions: QuestionBankItem[] }
        | { ok: false; error: string }
    ) => void
  ) => void;

  /** Host picks which questions (and in what order) to use for the selected round. */
  "host:select-question": (
    payload: { code: string; questionIds: string[] },
    callback: (response: { ok: true; room: RoomState } | { ok: false; error: string }) => void
  ) => void;

  /** Shows the round's tutorial (image/video) to the whole room before questions start. */
  "host:show-tutorial": (
    payload: { code: string },
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

  /** Moves from the tutorial screen to the first question of the round. */
  "host:start-question": (payload: { code: string }) => void;

  "host:reveal-answer": (payload: { code: string }) => void;

  /** Advances to the next question, or ends the round (back to lobby) if none remain. */
  "host:next-question": (payload: { code: string }) => void;

  /** Bails out of the current round early, returning to the lobby round-picker. */
  "host:end-round": (payload: { code: string }) => void;

  /** Ends the whole game (all rounds) and shows the final scoreboard. */
  "host:finish-game": (payload: { code: string }) => void;

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
  /** The current round's questions have all been played (or the host ended it early). */
  "game:round-ended": (payload: { players: Player[] }) => void;
  "game:finished": (payload: { players: Player[] }) => void;
  "room:closed": (payload: { reason: string }) => void;
  "error-message": (payload: { message: string }) => void;
}

export interface InterServerEvents {}

export interface SocketData {
  roomCode?: string;
  playerName?: string;
  isHost?: boolean;
  isSpectator?: boolean;
}
