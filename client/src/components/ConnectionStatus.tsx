import { useEffect, useState } from "react";
import { Alert } from "@mui/material";
import { socket } from "../lib/socket";

/** Keep reconnection feedback visible while a joined device wakes up. */
export default function ConnectionStatus({ active }: { active: boolean }) {
  const [disconnected, setDisconnected] = useState(!socket.connected);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    if (!active) return;
    setDisconnected(!socket.connected);
    const onDisconnect = () => setDisconnected(true);
    const onConnect = () => {
      setDisconnected(false);
      setExpired(!socket.recovered);
    };
    const onWake = () => {
      if (document.visibilityState === "visible" && !socket.connected) socket.connect();
    };
    socket.on("disconnect", onDisconnect);
    socket.on("connect", onConnect);
    window.addEventListener("online", onWake);
    document.addEventListener("visibilitychange", onWake);
    return () => {
      socket.off("disconnect", onDisconnect);
      socket.off("connect", onConnect);
      window.removeEventListener("online", onWake);
      document.removeEventListener("visibilitychange", onWake);
    };
  }, [active]);

  if (!active || (!disconnected && !expired)) return null;
  return (
    <Alert severity="warning" sx={{ position: "fixed", top: 8, left: 8, right: 8, zIndex: 1600 }}>
      {disconnected
        ? "Connection lost — reconnecting. Your score is preserved."
        : "Your connection could not be restored. Your score is preserved; please let the host know."}
    </Alert>
  );
}
