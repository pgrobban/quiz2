export const TILE_BACKGROUND = "#F5F0E8";
export const TILE_TEXT = "#111827";

/** Pick readable ink for player colours and literal colour-match answers. */
export function inkOnColor(color: string): string {
  const hex = color.replace("#", "");
  const channels = [0, 2, 4].map((offset) => {
    const value = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  const luminance = channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  return luminance > 0.179 ? TILE_TEXT : "#FFFFFF";
}

export const tileSx = {
  bgcolor: TILE_BACKGROUND,
  color: TILE_TEXT,
  borderColor: "#d6cfc4",
  fontWeight: 700,
};

/** Answer buttons keep their text readable even after input is locked. */
export function answerTileSx(selected = false, background?: string, selectionColor = "#FDE68A") {
  const bg = background ?? (selected ? selectionColor : TILE_BACKGROUND);
  return {
    bgcolor: bg,
    color: inkOnColor(bg),
    border: "1px solid #d6cfc4",
    fontWeight: 700,
    "&:hover": { bgcolor: background ?? selectionColor, color: inkOnColor(background ?? selectionColor) },
    "&.Mui-disabled": { bgcolor: bg, color: inkOnColor(bg), borderColor: "#d6cfc4" },
  };
}
