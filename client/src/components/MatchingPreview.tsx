import { useEffect, useState } from "react";
import { Box, Typography } from "@mui/material";
import type { RoomState } from "../../../shared/types";

export function useMatchingPreview(room: RoomState | null): boolean {
  const deadline = room?.round === "matching" && room.phase === "question"
    ? room.activeMatchingBoard?.previewEndsAt ?? 0
    : 0;
  const [finishedDeadline, setFinishedDeadline] = useState(0);

  useEffect(() => {
    if (!deadline) return;
    const timer = window.setTimeout(
      () => setFinishedDeadline(deadline),
      Math.max(0, deadline - Date.now()),
    );
    return () => window.clearTimeout(timer);
  }, [deadline]);

  return deadline > Date.now() && finishedDeadline !== deadline;
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
