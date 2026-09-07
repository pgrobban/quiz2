import { io, Socket } from "socket.io-client";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "../../../shared/types";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:4000";

/**
 * Single shared socket instance for the whole app. Connection is initiated
 * lazily so the app can render before the handshake completes.
 */
export const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(
  SERVER_URL,
  {
    autoConnect: false,
  }
);
