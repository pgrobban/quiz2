# Quiz Night

A simple real-time quiz game: a **host** (technician) controls the game from
a dashboard, and **players** join from their own devices using a 4-digit room
code. Built with TypeScript, Socket.IO, React, and Material UI.

## Project structure

```
shared/    Shared TypeScript types for Socket.IO events (used by both server and client)
server/    Express + Socket.IO server (TypeScript)
client/    React + Vite + MUI client (TypeScript)
```

## Getting started

Install all dependencies from the repo root (npm workspaces):

```bash
npm install
```

Run the server (default port 4000):

```bash
npm run dev:server
```

Run the client (default port 5173):

```bash
npm run dev:client
```

Open two browser windows:
- `http://localhost:5173` -> click **Host a Game** to get a room code
- `http://localhost:5173` -> click **Join a Game** on another device/tab and
  enter the room code + a name

## How it works

- The host connects and emits `host:create-room`, receiving a unique 4-digit
  room code back from the server.
- Players connect and emit `player:join-room` with the code + their name.
  The server validates the room exists, is still in the lobby, and the name
  isn't taken.
- All players/host in a room receive `room:update` broadcasts whenever the
  player list changes (join/leave).
- The host can emit `host:start-game` once there's at least one player,
  which broadcasts `game:started` to the room.
- If the host disconnects, the room is closed and players are notified via
  `room:closed`.

This is intentionally a minimal skeleton — the actual quiz questions/scoring
flow is stubbed out (`game:started` currently just flips the room to
"in-progress") so you can plug in your own question/answer logic next.

## Environment variables

- `server`: `PORT` (default 4000), `CLIENT_ORIGIN` (default
  `http://localhost:5173`) for CORS.
- `client`: `VITE_SERVER_URL` (default `http://localhost:4000`) — see
  `client/.env`.

## Type-checking & building

```bash
npm run typecheck   # both server and client
npm run build        # both server and client
```
