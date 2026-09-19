import { createServer } from "node:http";
import express from "express";
import cors from "cors";
import { Server } from "socket.io";
import type {
  ClientToServerEvents,
  GameRound,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
} from "../../shared/types";
import {
  LETTERS_REVEAL_ANIMATION_MS,
  MATH_REVEAL_ANIMATION_MS,
  RoomManager,
} from "./roomManager";

const PORT = Number(process.env.PORT) || 4000;
const HOST = process.env.HOST || "0.0.0.0";

/**
 * Rounds where players lock in their answer once (letters/matching/math)
 * rely on the client's own countdown reaching zero to auto-submit (or, for
 * letters/math, on the player manually locking in beforehand). If the host
 * reveals the answer early - before that client-side timer naturally
 * expires - those submissions would never arrive. So we give clients a
 * short grace window to submit whatever they have before actually scoring.
 */
const REVEAL_GRACE_PERIOD_MS = 400;
/** Room codes currently in that grace window, to ignore a double reveal-answer click. */
const revealsInProgress = new Set<string>();

// In dev, Vite may fall back to a different port (5174, 5175, ...) if 5173
// is already taken by something else on your machine. Rather than hardcode
// one origin, allow any localhost/127.0.0.1 port, plus an optional explicit
// override via CLIENT_ORIGIN for production deployments.
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN;
const isLocalNetworkOrigin = (origin: string) =>
  /^https?:\/\/((localhost|127\.0\.0\.1|0\.0\.0\.0)|(?:10(?:\.\d+){3}|192\.168(?:\.\d+){2}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d+){2}))(:\d+)?$/.test(
    origin,
  );
// Tunnel tools (localtunnel, ngrok) hand out a random subdomain each run,
// so there's no fixed origin to allow-list. Since this is a local dev tool
// (not a real multi-tenant public deployment), it's fine to trust these
// well-known tunnel domains rather than requiring CLIENT_ORIGIN to be set
// (and updated) every time a new tunnel URL is generated.
const isTunnelOrigin = (origin: string) =>
  /^https:\/\/[\w-]+\.(loca\.lt|ngrok-free\.app|ngrok\.io|ngrok\.app|trycloudflare\.com)$/.test(
    origin,
  );

const corsOriginCheck = (
  origin: string | undefined,
  callback: (err: Error | null, allow?: boolean) => void,
) => {
  if (!origin) return callback(null, true); // same-origin / curl / server-to-server
  if (CLIENT_ORIGIN) return callback(null, origin === CLIENT_ORIGIN);
  if (isLocalNetworkOrigin(origin) || isTunnelOrigin(origin))
    return callback(null, true);
  callback(new Error(`Origin ${origin} not allowed by CORS`));
};

const app = express();
app.use(cors({ origin: corsOriginCheck }));
app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

const httpServer = createServer(app);

const io = new Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>(httpServer, {
  cors: {
    origin: corsOriginCheck,
    methods: ["GET", "POST"],
  },
});

const rooms = new RoomManager();

/** Max simultaneous *playing* participants per room; spectators are unlimited. */
const MAX_PLAYERS_PER_ROOM = 4;

io.on("connection", (socket) => {
  console.log(`socket connected: ${socket.id}`);

  socket.on("host:create-room", (callback) => {
    const room = rooms.createRoom(socket.id);
    socket.data.roomCode = room.code;
    socket.data.isHost = true;
    socket.join(room.code);
    callback({ ok: true, room });
  });

  socket.on("host:select-round", ({ code, round }, callback) => {
    const room = rooms.getRoom(code);
    if (!room || room.hostId !== socket.id) {
      callback({ ok: false, error: "Not authorized." });
      return;
    }

    const result = rooms.selectRound(code, round);
    callback(result);
    if (result.ok) {
      io.to(code).emit("room:update", result.room);
    }
  });

  socket.on("host:select-question", ({ code, questionIds }, callback) => {
    const room = rooms.getRoom(code);
    if (!room || room.hostId !== socket.id) {
      callback({ ok: false, error: "Not authorized." });
      return;
    }

    const result = rooms.selectQuestions(code, questionIds);
    callback(result);
    if (result.ok) {
      io.to(code).emit("room:update", result.room);
    }
  });

  socket.on("host:show-tutorial", ({ code }, callback) => {
    const room = rooms.getRoom(code);
    if (!room || room.hostId !== socket.id) {
      callback({ ok: false, error: "Not authorized." });
      return;
    }

    const result = rooms.showTutorial(code);
    callback(result);
    if (result.ok) {
      io.to(code).emit("room:update", result.room);
    }
  });

  socket.on("player:join-room", ({ code, name }, callback) => {
    const trimmedName = name.trim();
    const room = rooms.getRoom(code);

    if (!room) {
      callback({
        ok: false,
        error: "Room not found. Check the code and try again.",
      });
      return;
    }
    if (room.phase !== "lobby") {
      callback({
        ok: false,
        error: "A round is currently in progress. Try again shortly.",
      });
      return;
    }
    if (room.players.length >= MAX_PLAYERS_PER_ROOM) {
      callback({
        ok: false,
        error: `This room is full (max ${MAX_PLAYERS_PER_ROOM} players). Spectate instead!`,
      });
      return;
    }
    if (!trimmedName) {
      callback({ ok: false, error: "Please enter a name." });
      return;
    }
    if (rooms.isNameTaken(code, trimmedName)) {
      callback({
        ok: false,
        error: "That name is already taken in this room.",
      });
      return;
    }

    const updatedRoom = rooms.addPlayer(code, {
      id: socket.id,
      name: trimmedName,
      score: 0,
    });
    if (!updatedRoom) {
      callback({ ok: false, error: "Unable to join room." });
      return;
    }

    socket.data.roomCode = code;
    socket.data.playerName = trimmedName;
    socket.join(code);

    callback({ ok: true, room: updatedRoom });
    io.to(code).emit("room:update", updatedRoom);
  });

  socket.on("spectator:join-room", ({ code }, callback) => {
    const room = rooms.getRoom(code);
    if (!room) {
      callback({
        ok: false,
        error: "Room not found. Check the code and try again.",
      });
      return;
    }

    socket.data.roomCode = code;
    socket.data.isSpectator = true;
    socket.join(code);

    callback({
      ok: true,
      room,
      question: rooms.getCurrentQuestion(code),
      correctIndex: rooms.getCurrentCorrectIndex(code),
    });
  });

  socket.on("host:start-question", ({ code }) => {
    const room = rooms.getRoom(code);
    if (!room || room.hostId !== socket.id) return;

    if (room.round === "letters") {
      const result = rooms.startLettersRound(code);
      if (!result.ok) return;
      io.to(code).emit("room:update", result.room);
      io.to(code).emit("letters:started", { letters: result.letters });

      // Give clients time to finish the letter-reveal animation before the
      // answer countdown actually starts ticking.
      setTimeout(() => {
        const updatedRoom = rooms.activateLettersTimer(code);
        if (updatedRoom) io.to(code).emit("room:update", updatedRoom);
      }, LETTERS_REVEAL_ANIMATION_MS);
      return;
    }

    if (room.round === "math") {
      const result = rooms.startMathRound(code);
      if (!result.ok) return;
      io.to(code).emit("room:update", result.room);
      io.to(code).emit("math:started", result.challenge);

      // Same idea as the letters round: don't start the countdown until
      // the reveal animation has actually finished on clients.
      setTimeout(() => {
        const updatedRoom = rooms.activateMathTimer(code);
        if (updatedRoom) io.to(code).emit("room:update", updatedRoom);
      }, MATH_REVEAL_ANIMATION_MS);
      return;
    }

    const result = rooms.startFirstQuestion(code);
    if (!result.ok) return;

    io.to(code).emit("room:update", result.room);
    if (result.matchingBoard) {
      io.to(code).emit("matching:board", {
        index: result.room.currentQuestionIndex,
        total: result.room.totalQuestions,
        board: result.matchingBoard,
      });
    } else if (result.question) {
      io.to(code).emit("game:question", {
        index: result.room.currentQuestionIndex,
        total: result.room.totalQuestions,
        question: result.question,
      });
    }
  });

  socket.on("host:reveal-answer", ({ code }) => {
    const room = rooms.getRoom(code);
    if (!room || room.hostId !== socket.id) return;

    if (
      room.round === "letters" ||
      room.round === "matching" ||
      room.round === "math"
    ) {
      if (room.phase !== "question" || revealsInProgress.has(code)) return;
      revealsInProgress.add(code);
      // Tell clients time's up right now, so anyone relying on their own
      // countdown (or who hasn't locked in yet) submits immediately -
      // then wait a beat for those submissions to actually arrive before
      // scoring, instead of scoring whatever happened to already be in.
      io.to(code).emit("game:time-up");
      setTimeout(() => {
        revealsInProgress.delete(code);
        performReveal(code, room.round!);
      }, REVEAL_GRACE_PERIOD_MS);
      return;
    }

    performReveal(code, room.round);
  });

  function performReveal(code: string, round: GameRound | null) {
    if (round === "letters") {
      const result = rooms.revealLetters(code);
      if (!result) return;
      io.to(code).emit("room:update", result.room);
      io.to(code).emit("letters:revealed", {
        submissions: result.submissions,
        topWords: result.topWords,
        players: result.room.players,
      });
      return;
    }

    if (round === "matching") {
      const result = rooms.revealMatching(code);
      if (!result) return;
      io.to(code).emit("room:update", result.room);
      io.to(code).emit("matching:revealed", {
        index: result.room.currentQuestionIndex,
        correctPairs: result.correctPairs,
        results: result.results,
        players: result.room.players,
      });
      return;
    }

    if (round === "math") {
      const result = rooms.revealMath(code);
      if (!result) return;
      io.to(code).emit("room:update", result.room);
      io.to(code).emit("math:revealed", {
        target: result.target,
        submissions: result.submissions,
        players: result.room.players,
        closestSolution: result.closestSolution,
      });
      return;
    }

    if (round === "associations") {
      const updatedRoom = rooms.revealAssociations(code);
      if (!updatedRoom) return;
      io.to(code).emit("room:update", updatedRoom);
      return;
    }

    const result = rooms.revealAnswer(code);
    if (!result) return;

    io.to(code).emit("room:update", result.room);
    io.to(code).emit("game:reveal", {
      index: result.room.currentQuestionIndex,
      correctIndex: result.correctIndex,
      players: result.room.players,
    });
  }

  socket.on("host:next-question", ({ code }) => {
    const room = rooms.getRoom(code);
    if (!room || room.hostId !== socket.id) return;

    const result = rooms.advanceToNextQuestion(code);
    if (!result) return;

    io.to(code).emit("room:update", result.room);
    if (result.roundEnded) {
      io.to(code).emit("game:round-ended", { players: result.room.players });
    } else if (result.letters) {
      io.to(code).emit("letters:started", { letters: result.letters });
      setTimeout(() => {
        const updatedRoom = rooms.activateLettersTimer(code);
        if (updatedRoom) io.to(code).emit("room:update", updatedRoom);
      }, LETTERS_REVEAL_ANIMATION_MS);
    } else if (result.mathChallenge) {
      io.to(code).emit("math:started", result.mathChallenge);
      setTimeout(() => {
        const updatedRoom = rooms.activateMathTimer(code);
        if (updatedRoom) io.to(code).emit("room:update", updatedRoom);
      }, MATH_REVEAL_ANIMATION_MS);
    } else if (result.matchingBoard) {
      io.to(code).emit("matching:board", {
        index: result.room.currentQuestionIndex,
        total: result.room.totalQuestions,
        board: result.matchingBoard,
      });
    } else if (result.question) {
      io.to(code).emit("game:question", {
        index: result.room.currentQuestionIndex,
        total: result.room.totalQuestions,
        question: result.question,
      });
    }
  });

  socket.on("host:end-round", ({ code }) => {
    const room = rooms.getRoom(code);
    if (!room || room.hostId !== socket.id) return;

    const updatedRoom = rooms.endRoundEarly(code);
    if (!updatedRoom) return;

    io.to(code).emit("room:update", updatedRoom);
    io.to(code).emit("game:round-ended", { players: updatedRoom.players });
  });

  socket.on("host:finish-game", ({ code }) => {
    const room = rooms.getRoom(code);
    if (!room || room.hostId !== socket.id) return;

    const updatedRoom = rooms.finishGame(code);
    if (!updatedRoom) return;

    io.to(code).emit("room:update", updatedRoom);
    io.to(code).emit("game:finished", { players: updatedRoom.players });
  });

  socket.on("player:submit-answer", ({ code, optionIndex }, callback) => {
    const result = rooms.submitAnswer(code, socket.id, optionIndex);
    callback(result);

    if (result.ok) {
      const room = rooms.getRoom(code);
      if (room) io.to(code).emit("room:update", room);
    }
  });

  socket.on("player:submit-word", ({ code, word }, callback) => {
    const result = rooms.submitWord(code, socket.id, word);
    callback(result);

    if (result.ok) {
      const room = rooms.getRoom(code);
      if (room) io.to(code).emit("room:update", room);
    }
  });

  socket.on("player:submit-matching-board", ({ code, pairs }, callback) => {
    const result = rooms.submitMatchingBoard(code, socket.id, pairs);
    callback(result);

    if (result.ok) {
      const room = rooms.getRoom(code);
      if (room) io.to(code).emit("room:update", room);
    }
  });

  socket.on("player:submit-math", ({ code, expression }, callback) => {
    const result = rooms.submitMath(code, socket.id, expression);
    callback(result);

    if (result.ok) {
      const room = rooms.getRoom(code);
      if (room) io.to(code).emit("room:update", room);
    }
  });

  socket.on("host:open-associations-field", ({ code, field }, callback) => {
    const room = rooms.getRoom(code);
    if (!room || room.hostId !== socket.id) {
      callback({ ok: false, error: "Not authorized." });
      return;
    }

    const result = rooms.openAssociationsField(code, field);
    callback(result);
    if (result.ok) {
      const updatedRoom = rooms.getRoom(code);
      if (updatedRoom) io.to(code).emit("room:update", updatedRoom);
    }
  });

  socket.on("host:peek-associations-answer", ({ code, target }, callback) => {
    const room = rooms.getRoom(code);
    if (!room || room.hostId !== socket.id) {
      callback({ ok: false, error: "Not authorized." });
      return;
    }

    // Host-only lookup - deliberately not broadcast to anyone.
    callback(rooms.peekAssociationsAnswer(code, target));
  });

  socket.on(
    "host:judge-associations-guess",
    ({ code, target, correct }, callback) => {
      const room = rooms.getRoom(code);
      if (!room || room.hostId !== socket.id) {
        callback({ ok: false, error: "Not authorized." });
        return;
      }

      const result = rooms.judgeAssociationsGuess(code, target, correct);
      callback(result);
      if (result.ok) {
        const updatedRoom = rooms.getRoom(code);
        if (updatedRoom) io.to(code).emit("room:update", updatedRoom);
      }
    },
  );

  socket.on("player:leave-room", ({ code }) => {
    handlePlayerLeave(socket.id, code);
  });

  socket.on("disconnect", () => {
    const code = socket.data.roomCode;
    if (!code) return;

    if (socket.data.isHost) {
      io.to(code).emit("room:closed", { reason: "The host has disconnected." });
      rooms.closeRoom(code);
    } else if (!socket.data.isSpectator) {
      handlePlayerLeave(socket.id, code);
    }
  });

  function handlePlayerLeave(playerId: string, code: string) {
    const updatedRoom = rooms.removePlayer(code, playerId);
    if (updatedRoom) {
      io.to(code).emit("room:update", updatedRoom);
    }
  }
});

httpServer.listen(PORT, HOST, () => {
  console.log(`Quiz game server listening on http://0.0.0.0:${PORT}`);
  console.log(`LAN access example: http://192.168.1.50:${PORT}`);
});
