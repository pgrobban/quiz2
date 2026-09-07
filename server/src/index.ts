import { createServer } from "node:http";
import express from "express";
import cors from "cors";
import { Server } from "socket.io";
import type {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
} from "../../shared/types";
import { RoomManager } from "./roomManager";

const PORT = Number(process.env.PORT) || 4000;

// In dev, Vite may fall back to a different port (5174, 5175, ...) if 5173
// is already taken by something else on your machine. Rather than hardcode
// one origin, allow any localhost/127.0.0.1 port, plus an optional explicit
// override via CLIENT_ORIGIN for production deployments.
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN;
const isLocalhostOrigin = (origin: string) =>
  /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);

const corsOriginCheck = (
  origin: string | undefined,
  callback: (err: Error | null, allow?: boolean) => void
) => {
  if (!origin) return callback(null, true); // same-origin / curl / server-to-server
  if (CLIENT_ORIGIN) return callback(null, origin === CLIENT_ORIGIN);
  if (isLocalhostOrigin(origin)) return callback(null, true);
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
      callback({ ok: false, error: "Room not found. Check the code and try again." });
      return;
    }
    if (room.phase !== "lobby") {
      callback({ ok: false, error: "A round is currently in progress. Try again shortly." });
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
      callback({ ok: false, error: "That name is already taken in this room." });
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
      callback({ ok: false, error: "Room not found. Check the code and try again." });
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

    const result = rooms.startFirstQuestion(code);
    if (!result.ok) return;

    io.to(code).emit("room:update", result.room);
    io.to(code).emit("game:question", {
      index: result.room.currentQuestionIndex,
      total: result.room.totalQuestions,
      question: result.question,
    });
  });

  socket.on("host:reveal-answer", ({ code }) => {
    const room = rooms.getRoom(code);
    if (!room || room.hostId !== socket.id) return;

    const result = rooms.revealAnswer(code);
    if (!result) return;

    io.to(code).emit("room:update", result.room);
    io.to(code).emit("game:reveal", {
      index: result.room.currentQuestionIndex,
      correctIndex: result.correctIndex,
      players: result.room.players,
    });
  });

  socket.on("host:next-question", ({ code }) => {
    const room = rooms.getRoom(code);
    if (!room || room.hostId !== socket.id) return;

    const result = rooms.advanceToNextQuestion(code);
    if (!result) return;

    io.to(code).emit("room:update", result.room);
    if (result.roundEnded) {
      io.to(code).emit("game:round-ended", { players: result.room.players });
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

httpServer.listen(PORT, () => {
  console.log(`Quiz game server listening on http://localhost:${PORT}`);
});
