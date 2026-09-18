import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
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
  },
});

