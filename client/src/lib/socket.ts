import { io, Socket } from "socket.io-client";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "../../../shared/types";

// If VITE_SERVER_URL is explicitly set (e.g. pointing at a deployed
// backend), use that. Otherwise default to the page's own origin - in dev
// this relies on the Vite proxy (see vite.config.ts) forwarding /socket.io
// to the local server on :4000, which lets everything (including access
// through a tunnel like localtunnel/ngrok) work through a single URL
// instead of needing a second tunnel + CORS setup for the server's port.
const SERVER_URL =
  import.meta.env.VITE_SERVER_URL ||
  (typeof window !== "undefined"
    ? window.location.origin
    : "http://0.0.0.0:4000");

/**
 * Single shared socket instance for the whole app. Connection is initiated
 * lazily so the app can render before the handshake completes.
 */
export const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(
  SERVER_URL,
  {
    autoConnect: false,
    // Free tunnel services (localtunnel, etc.) and some mobile carrier
    // networks are known to flakily half-support WebSocket upgrades - the
    // initial polling handshake succeeds, but the upgrade attempt hangs or
    // silently drops instead of cleanly falling back. Since this app only
    // needs to push small, infrequent updates (scores, questions), staying
    // on plain HTTP long-polling is a totally fine trade-off for much more
    // reliable connections over sketchy networks/tunnels.
    transports: ["polling"],
    upgrade: false,
  },
);

