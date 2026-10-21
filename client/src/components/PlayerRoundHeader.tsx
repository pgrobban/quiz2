import { Chip, Stack, Typography } from "@mui/material";

export default function PlayerRoundHeader({ index, total, score }: {
  index: number; total: number; score: number;
}) {
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
        Round {index + 1}/{total}
      </Typography>
      <Chip label={`${score} pts`} sx={{
        bgcolor: "#000", color: "#4ade80", border: "2px solid #4ade80",
        fontSize: "1.2rem", fontWeight: 800, height: 44, flexShrink: 0,
        fontVariantNumeric: "tabular-nums",
      }} />
    </Stack>
  );
}
