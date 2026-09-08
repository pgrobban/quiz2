import { useEffect, useState } from "react";
import { ButtonBase, Paper, Stack } from "@mui/material";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const SCRAMBLE_INTERVAL_MS = 80;
const SETTLE_DURATION_MS = 3000;

interface LetterRevealProps {
  letters: string[];
  onComplete?: () => void;
  tileSize?: number;
  /** If provided, settled tiles become tappable (used to build a word directly from the reveal). */
  onTileClick?: (index: number) => void;
  /** Indices already used/picked - shown dimmed and non-interactive. */
  usedIndices?: number[];
}

/**
 * Shows the given letters one at a time, each cycling through random
 * letters for ~3 seconds before "settling" on its real value, then moving
 * on to the next position - like a slot machine / Countdown-style reveal.
 * Once a tile has settled, it can optionally become tappable via onTileClick.
 */
export default function LetterReveal({
  letters,
  onComplete,
  tileSize = 52,
  onTileClick,
  usedIndices = [],
}: LetterRevealProps) {
  const [settledCount, setSettledCount] = useState(0);
  const [scrambleChar, setScrambleChar] = useState("");

  // Reset whenever a new letter set comes in (e.g. a fresh letters round).
  useEffect(() => {
    setSettledCount(0);
  }, [letters]);

  useEffect(() => {
    if (settledCount >= letters.length) {
      onComplete?.();
      return;
    }

    const scrambleTimer = setInterval(() => {
      setScrambleChar(ALPHABET[Math.floor(Math.random() * ALPHABET.length)]);
    }, SCRAMBLE_INTERVAL_MS);

    const settleTimer = setTimeout(() => {
      clearInterval(scrambleTimer);
      setSettledCount((count) => count + 1);
    }, SETTLE_DURATION_MS);

    return () => {
      clearInterval(scrambleTimer);
      clearTimeout(settleTimer);
    };
    // Re-run only when we advance to the next tile or get a new letter set.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settledCount, letters]);

  return (
    <Stack direction="row" spacing={1} flexWrap="wrap" justifyContent="center" useFlexGap>
      {letters.map((letter, index) => {
        const isSettled = index < settledCount;
        const isActive = index === settledCount;
        const display = isSettled ? letter : isActive ? scrambleChar || "•" : "";
        const isUsed = usedIndices.includes(index);
        const isInteractive = isSettled && !!onTileClick && !isUsed;

        const tile = (
          <Paper
            elevation={isSettled ? 4 : 0}
            variant={isSettled ? "elevation" : "outlined"}
            sx={{
              width: tileSize,
              height: tileSize * 1.15,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: tileSize * 0.4,
              fontWeight: 700,
              fontFamily: "monospace",
              bgcolor: isSettled ? "primary.main" : "rgba(244, 244, 246, 0.04)",
              color: isSettled ? "primary.contrastText" : "text.secondary",
              borderColor: "rgba(244, 244, 246, 0.16)",
              opacity: isUsed ? 0.3 : 1,
              transition: "background-color 0.15s ease, opacity 0.15s ease",
            }}
          >
            {display}
          </Paper>
        );

        if (!onTileClick) {
          return <div key={index}>{tile}</div>;
        }

        return (
          <ButtonBase
            key={index}
            disabled={!isInteractive}
            onClick={() => onTileClick(index)}
            sx={{ borderRadius: 1 }}
          >
            {tile}
          </ButtonBase>
        );
      })}
    </Stack>
  );
}
