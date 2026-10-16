import { createTheme } from "@mui/material/styles";
import { TILE_BACKGROUND, TILE_TEXT } from "./lib/tileStyles";

export const theme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: TILE_BACKGROUND, contrastText: TILE_TEXT },
    secondary: { main: "#38bdf8", contrastText: "#04121b" }, // sky-400
    success: { main: "#4ade80" }, // green-400
    error: { main: "#f87171" }, // red-400
    warning: { main: "#fbbf24" }, // amber-400
    background: { default: "#0b0e14", paper: "#161b26" },
    text: {
      primary: "#f4f4f6",
      secondary: "rgba(244, 244, 246, 0.72)",
    },
    divider: "rgba(244, 244, 246, 0.16)",
  },
  shape: {
    borderRadius: 12,
  },
  typography: {
    fontFamily: `"Optima", "Roboto", "Helvetica", "Arial", sans-serif`,
    button: {
      fontSize: "1rem",
      fontWeight: 700,
      lineHeight: 1.4,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        sizeSmall: { fontSize: "0.95rem" },
        sizeLarge: { fontSize: "1.15rem" },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        notchedOutline: {
          borderColor: "rgba(244, 244, 246, 0.28)",
        },
      },
    },
  },
});
