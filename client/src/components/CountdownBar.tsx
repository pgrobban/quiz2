import { useEffect, useState } from "react";
import { Box, LinearProgress, Typography } from "@mui/material";

interface CountdownBarProps {
  /** Epoch ms when the countdown ends. */
  deadline: number;
  totalSeconds: number;
  onExpire?: () => void;
}

/**
 * A progress bar that fills up as a deadline approaches (rather than
 * draining down), plus a "Xs" label. Recomputes from the absolute deadline
 * on every tick, so it stays accurate regardless of when it mounted or
 * minor client/server clock drift.
 */
export default function CountdownBar({
  deadline,
  totalSeconds,
  onExpire,
}: CountdownBarProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 150);
    return () => clearInterval(interval);
  }, [deadline]);

  const totalMs = totalSeconds * 1000;
  const remainingMs = Math.max(0, deadline - now);
  const elapsedRatio = totalMs > 0 ? Math.min(1, 1 - remainingMs / totalMs) : 1;
  const secondsLeft = Math.ceil(remainingMs / 1000);
  const expired = remainingMs <= 0;

  useEffect(() => {
    if (expired) onExpire?.();
    // Only fire once, right when it flips from not-expired to expired.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expired]);

  return (
    <Box sx={{ width: "100%" }}>
      <LinearProgress
        variant="determinate"
        value={elapsedRatio * 100}
        color={secondsLeft <= 5 && !expired ? "error" : "primary"}
        sx={{ height: 10, borderRadius: 5 }}
      />
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: "block", textAlign: "right", mt: 0.5 }}
      >
        {expired ? "Time's up!" : `${secondsLeft}s`}
      </Typography>
    </Box>
  );
}
