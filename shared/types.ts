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
  /** The active target + numbers for the "math" round, while active/revealed. Null otherwise. */
  activeMathChallenge: MathChallenge | null;
  /** The active board + turn state for the "associations" round, while active/revealed. Null otherwise. */
  activeAssociationsBoard: AssociationsBoard | null;
  associationsTurn: AssociationsTurnState | null;
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

/** The target number + 6 numbers to combine for the "math" round. */
export interface MathChallenge {
  target: number;
  numbers: number[];
}

/** One player's submitted expression for the math round, scored at reveal time. */
export interface MathSubmission {
  playerId: string;
  playerName: string;
  expression: string;
  /** Null if the expression was invalid (bad syntax, wrong numbers used, non-integer result, etc). */
  value: number | null;
  /** |target - value|, or null if invalid. */
  distance: number | null;
  points: number;
}

export interface MathRevealPayload {
  target: number;
  submissions: MathSubmission[];
  players: Player[];
  /** The closest value the server could find to the target using the given numbers (null only if truly no combination is possible). */
  closestSolution: { value: number; expression: string; distance: number } | null;
}

// ---- Associations round ("wall"-style, final round for the top 2 players) ----

export type AssociationsColumnLabel = "A" | "B" | "C" | "D";

/** One clue slot in a column - text is null until the host opens it. */
export interface AssociationsClueSlot {
  field: string; // e.g. "A1", "B3"
  text: string | null;
}

export interface AssociationsColumnState {
  label: AssociationsColumnLabel;
  clues: AssociationsClueSlot[]; // always 4
  solved: boolean;
  /** Revealed only once solved (or force-revealed at round end). */
  solution: string | null;
}

/** The public board: clue text hidden until opened, solutions hidden until solved. */
export interface AssociationsBoard {
  title: string;
  columns: AssociationsColumnState[]; // always 4, labeled A-D
  finalSolved: boolean;
  finalSolution: string | null;
}

/** Host-only bank definition: the real clues/solutions before anything is hidden. */
export interface AssociationsBoardBankItem {
  id: string;
  /**
   * A short descriptive label shown only to the host when picking boards
   * (e.g. "Classic Sets of Four"). The board's public title, shown to
   * everyone once the round is live, is always the generic "What connects
   * them all?" - the real "title" is the final solution, which stays
   * secret until it's solved (or the round ends).
   */
  title: string;
  columns: {
    label: AssociationsColumnLabel;
    clues: [string, string, string, string];
    solution: string;
  }[]; // always 4
  finalSolution: string;
}

export type AssociationsGuessTarget =
  | { type: "column"; column: AssociationsColumnLabel }
  | { type: "final" };

export interface AssociationsTurnState {
  /** The two players competing in this round (chosen by current score when it started). */
  finalists: Player[];
  /** Whose turn it is right now. */
  activePlayerId: string;
  /** If a guess-only attempt fails/passes, control reverts to this player to open a new field. */
  openerPlayerId: string;
  /** "open-or-guess": may open a new field and/or attempt a guess. "guess-only": may only attempt a guess. */
  mode: "open-or-guess" | "guess-only";
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
          /** Populated instead of availableQuestions when round === "associations". */
          availableAssociationsBoards: AssociationsBoardBankItem[];
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

  /** Math round: submit (and lock in) an expression combining the given numbers. Invalid expressions are rejected, not locked in. */
  "player:submit-math": (
    payload: { code: string; expression: string },
    callback: (
      response:
        | { ok: true; value: number; distance: number }
        | { ok: false; error: string }
    ) => void
  ) => void;

  /** Associations round: host opens a closed clue field for the active player. */
  "host:open-associations-field": (
    payload: { code: string; field: string },
    callback: (response: { ok: true } | { ok: false; error: string }) => void
  ) => void;

  /**
   * Associations round: privately reveals the real answer for a guess target
   * to the host only (so they can judge the contestant's spoken answer) -
   * does not change any game state or broadcast anything.
   */
  "host:peek-associations-answer": (
    payload: { code: string; target: AssociationsGuessTarget },
    callback: (response: { ok: true; answer: string } | { ok: false; error: string }) => void
  ) => void;

  /** Associations round: host records whether the active player's spoken guess was correct. */
  "host:judge-associations-guess": (
    payload: { code: string; target: AssociationsGuessTarget; correct: boolean },
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
  /** Math round: the target + 6 numbers have been generated and the round is now active. */
  "math:started": (payload: MathChallenge) => void;
  /** Math round: submitted expressions have been scored. */
  "math:revealed": (payload: MathRevealPayload) => void;
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
