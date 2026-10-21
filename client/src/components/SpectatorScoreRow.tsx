import { useEffect, useRef, useState } from "react";
import { Avatar, Chip, ListItem, ListItemAvatar, ListItemText } from "@mui/material";
import type { Player } from "../../../shared/types";

export default function SpectatorScoreRow({ player, rank }: { player: Player; rank: number }) {
  const previousScore = useRef(player.score);
  const [gain, setGain] = useState(0);

  useEffect(() => {
    const difference = player.score - previousScore.current;
    previousScore.current = player.score;
    if (difference <= 0) return;
    setGain(difference);
    const timer = window.setTimeout(() => setGain(0), 2400);
    return () => window.clearTimeout(timer);
  }, [player.score]);

  return (
    <ListItem
      data-player-score={player.id}
      sx={{
        borderRadius: 2,
        bgcolor: gain > 0 ? "rgba(74, 222, 128, 0.15)" : "transparent",
        transition: "background-color 0.4s ease",
        gap: 1,
      }}
    >
      <ListItemAvatar>
        <Avatar sx={{ bgcolor: rank === 1 ? "warning.main" : undefined }}>{rank}</Avatar>
      </ListItemAvatar>
      <ListItemText primary={player.name} secondary={`${player.score} pts`} />
      {gain > 0 && (
        <Chip
          key={player.score}
          label={`+${gain}`}
          size="small"
          sx={{
            bgcolor: "#000",
            color: "#4ade80",
            border: "1px solid #4ade80",
            fontWeight: 700,
            animation: "scoreGain 0.5s ease-out",
            "@keyframes scoreGain": {
              from: { opacity: 0, transform: "translateY(10px) scale(0.8)" },
              to: { opacity: 1, transform: "translateY(0) scale(1)" },
            },
            "@media (prefers-reduced-motion: reduce)": { animation: "none" },
          }}
        />
      )}
    </ListItem>
  );
}
