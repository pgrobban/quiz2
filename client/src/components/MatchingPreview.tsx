import { useEffect, useState } from "react";
import { Box, Typography } from "@mui/material";
import type { RoomState } from "../../../shared/types";
import { serverNow, subscribeServerClock } from "../lib/serverClock";

export function useMatchingPreview(room: RoomState | null): boolean {
  const deadline = room?.round === "matching" && room.phase === "question"
    ? room.activeMatchingBoard?.previewEndsAt ?? 0
    : 0;
  const [now, setNow] = useState(serverNow);

  useEffect(() => {
    if (!deadline) return;
    const refresh = () => setNow(serverNow());
    refresh();
    const unsubscribe = subscribeServerClock(refresh);
    const timer = window.setInterval(refresh, 100);
    return () => { window.clearInterval(timer); unsubscribe(); };
  }, [deadline]);

  return deadline > now;
}

export default function MatchingPreview({ title }: { title: string }) {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: 4,
        textAlign: "center",
      }}
    >
      <Typography variant="h2" sx={{ fontSize: { xs: "2rem", md: "3.75rem" } }}>
        {title}
      </Typography>
    </Box>
  );
}
