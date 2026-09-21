import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// When tunneling (localtunnel/ngrok/etc), tell Vite the public hostname so
// its injected HMR client connects back to *that* host over wss instead of
// falling back to a hardcoded "localhost:<port>" URL, which means nothing
// to a remote device. Left unset, Vite auto-detects everything correctly
// for plain local dev. Set this before running `npm run dev:client`, e.g.:
//   $env:TUNNEL_HOST="arqg.loca.lt"; npm run dev:client
const TUNNEL_HOST = process.env.TUNNEL_HOST?.trim() || undefined;

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    // Lets the dev server accept requests coming through a tunnel (e.g.
    // localtunnel/ngrok) whose hostname isn't localhost. Fine for a local
    // dev tool like this; don't do this for a real public deployment.
    allowedHosts: true,
    proxy: {
      // Forward Socket.IO traffic (including the websocket upgrade) to the
      // local game server, so the client can talk to it through the *same*
      // origin/tunnel URL instead of needing a second tunnel + CORS setup
      // for port 4000.
      "/socket.io": {
        target: "http://localhost:4000",
        ws: true,
      },
    },
    ...(TUNNEL_HOST && {
      hmr: {
        host: TUNNEL_HOST,
        protocol: "wss",
        clientPort: 443,
      },
    }),
  },
  preview: {
    host: "0.0.0.0",
    port: 4173,
  },
});

