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
  /** The 12 generated letters for the "letters" round, while it's active/revealed. Null otherwise. */
  activeLetters: string[] | null;
  /** The active two-column board for the "matching" round, while active/revealed. Null otherwise. */
  activeMatchingBoard: MatchingBoard | null;
  /**
   * Epoch ms when the current question/letters round's answer window closes.
   * Null when there's no active countdown (lobby, introduction, reveal, finished).
   */
  phaseDeadline: number | null;
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

/** One player's submitted word for the letters round, with validity/score computed at reveal time. */
export interface LetterSubmission {
  playerId: string;
  playerName: string;
  word: string;
  valid: boolean;
  points: number;
}

export interface LettersRevealPayload {
  submissions: LetterSubmission[];
  /** A handful of the longest possible words found in the dictionary for these letters. */
  topWords: string[];
  players: Player[];
}

/** A single item shown in one column of a "matching" round board. */
export interface MatchingItem {
  id: string;
  text: string;
}

/** Two independently-shuffled columns of 10 items each, forming 10 true left/right pairs. */
export interface MatchingBoard {
  title: string;
  left: MatchingItem[];
  right: MatchingItem[];
}

/** Host-only view of a matching board: the 10 true pairs, before shuffling into columns. */
export interface MatchingBoardBankItem {
  id: string;
  title: string;
  pairs: { left: MatchingItem; right: MatchingItem }[];
  keepLeftOrder?: boolean;
}

export interface MatchingBoardPayload {
  index: number;
  total: number;
  board: MatchingBoard;
}

/** One guess a player locked in (tapped a left item, then a right item). */
export interface MatchingGuess {
  leftId: string;
  rightId: string;
  correct: boolean;
}

export interface MatchingPlayerResult {
  playerId: string;
  playerName: string;
  guesses: MatchingGuess[];
  correctCount: number;
  points: number;
}

export interface MatchingRevealPayload {
  index: number;
  /** The true answer key: which left id pairs with which right id. */
  correctPairs: { leftId: string; rightId: string }[];
  results: MatchingPlayerResult[];
  players: Player[];
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
        | {
          ok: true;
          room: RoomState;
          availableQuestions: QuestionBankItem[];
          /** Populated instead of availableQuestions when round === "matching". */
          availableMatchingBoards: MatchingBoardBankItem[];
        }
        | { ok: false; error: string }
    ) => void
  ) => void;

  /**
   * Host picks (and orders) which items to use for the selected round -
   * question ids for quiz-style rounds, or matching board ids for the
   * "matching" round.
   */
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

  /** Letters round: submit (and lock in) a word built from the active letters. */
  "player:submit-word": (
    payload: { code: string; word: string },
    callback: (response: { ok: true } | { ok: false; error: string }) => void
  ) => void;

  /** Matching round: submit the player's final set of left/right pairings (sent once, when time runs out). */
  "player:submit-matching-board": (
    payload: { code: string; pairs: { leftId: string; rightId: string }[] },
    callback: (response: { ok: true } | { ok: false; error: string }) => void
  ) => void;

  "player:leave-room": (payload: { code: string }) => void;
}

export interface ServerToClientEvents {
  "room:update": (room: RoomState) => void;
  "game:question": (payload: QuestionPayload) => void;
  "game:reveal": (payload: RevealPayload) => void;
  /** Letters round: the 12 letters have been generated and the round is now active. */
  "letters:started": (payload: { letters: string[] }) => void;
  /** Letters round: submitted words have been scored and the best possible words computed. */
  "letters:revealed": (payload: LettersRevealPayload) => void;
  /** Matching round: a new two-column board is active. */
  "matching:board": (payload: MatchingBoardPayload) => void;
  /** Matching round: the correct pair + everyone's guesses have been scored. */
  "matching:revealed": (payload: MatchingRevealPayload) => void;
  /** The current round's questions have all been played (or the host ended it early). */
  "game:round-ended": (payload: { players: Player[] }) => void;
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
