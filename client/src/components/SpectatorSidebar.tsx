import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Box, Chip, List, Paper, Portal, Stack, Typography } from "@mui/material";
import type { Player } from "../../../shared/types";
import SpectatorScoreRow from "./SpectatorScoreRow";

export interface SpectatorResult {
  playerId: string;
  text: string;
  points: number;
}

export default function SpectatorSidebar({ players, results, resultKey }: {
  players: Player[];
  results: SpectatorResult[];
  resultKey: string;
}) {
  const root = useRef<HTMLDivElement>(null);
  const previousScores = useRef(new Map(players.map((p) => [p.id, p.score])));
  const [gains, setGains] = useState<SpectatorResult[]>([]);
  const [flights, setFlights] = useState<Array<{
    playerId: string; points: number; x: number; y: number; dx: number; dy: number;
  }>>([]);

  useEffect(() => {
    const awards = players.flatMap((p) => {
      const previous = previousScores.current.get(p.id);
      return previous !== undefined && p.score > previous
        ? [{ playerId: p.id, points: p.score - previous, text: `${p.name}: +${p.score - previous} points` }]
        : [];
    });
    previousScores.current = new Map(players.map((p) => [p.id, p.score]));
    if (awards.length) setGains(awards);
  }, [players]);

  useEffect(() => {
    setGains([]);
    setFlights([]);
  }, [resultKey]);

  const shownResults = results.length ? results : gains;

  useLayoutEffect(() => {
    if (!gains.length) return;
    // Measure after the result bubbles and newly sorted leaderboard have rendered.
    const frame = requestAnimationFrame(() => {
      const nodes = root.current;
      if (!nodes) return;
      setFlights(gains.flatMap((gain) => {
        const source = Array.from(nodes.querySelectorAll<HTMLElement>("[data-player-result]"))
          .find((el) => el.dataset.playerResult === gain.playerId);
        const target = Array.from(nodes.querySelectorAll<HTMLElement>("[data-player-score]"))
          .find((el) => el.dataset.playerScore === gain.playerId);
        if (!source || !target) return [];
        const a = source.getBoundingClientRect();
        const b = target.getBoundingClientRect();
        return [{ ...gain, x: a.right - 35, y: a.top + a.height / 2,
          dx: b.right - 35 - (a.right - 35), dy: b.top + b.height / 2 - (a.top + a.height / 2) }];
      }));
    });
    const timer = window.setTimeout(() => setFlights([]), 1600);
    return () => { cancelAnimationFrame(frame); clearTimeout(timer); };
  }, [gains, results]);

  return (
    <Stack ref={root} spacing={2}>
      <Paper sx={{ p: 2, borderRadius: 3 }}>
        <Typography variant="h6" sx={{ mb: 1 }}>Scoreboard</Typography>
        {!players.length ? <Typography color="text.secondary">No players yet.</Typography> : (
          <List dense>{players.map((p, index) => <SpectatorScoreRow key={p.id} player={p} rank={index + 1} />)}</List>
        )}
      </Paper>
      {shownResults.length > 0 && (
        <Paper sx={{ p: 2, borderRadius: 3 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>Player Results</Typography>
          <Stack spacing={1}>
            {shownResults.map((result) => (
              <Chip key={result.playerId} data-player-result={result.playerId}
                label={result.text}
                sx={{ bgcolor: "#000", color: "#4ade80", border: "2px solid #4ade80",
                  fontWeight: 700, fontSize: "1rem", height: "auto",
                  "& .MuiChip-label": { whiteSpace: "normal", py: 1 } }} />
            ))}
          </Stack>
        </Paper>
      )}
      <Portal>
      {flights.map((flight) => (
        <Box key={`${flight.playerId}-${flight.points}`} sx={{
          "--points-dx": `${flight.dx}px`, "--points-dy": `${flight.dy}px`,
          position: "fixed", left: flight.x, top: flight.y, zIndex: 1500, pointerEvents: "none",
          color: "#4ade80", bgcolor: "#000", border: "1px solid #4ade80", borderRadius: 5,
          px: 1, fontWeight: 700, animation: "pointsTransfer 1.2s ease-in-out forwards",
          "@keyframes pointsTransfer": {
            "0%": { opacity: 0, transform: "scale(0.8)" },
            "15%": { opacity: 1, transform: "scale(1.2)" },
            "85%": { opacity: 1, transform: "translate(var(--points-dx), var(--points-dy)) scale(1)" },
            "100%": { opacity: 0, transform: "translate(var(--points-dx), var(--points-dy)) scale(0.7)" },
          },
          "@media (prefers-reduced-motion: reduce)": { display: "none" },
        }}>+{flight.points}</Box>
      ))}
      </Portal>
    </Stack>
  );
}
