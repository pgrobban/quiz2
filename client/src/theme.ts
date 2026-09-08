import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  palette: {
    mode: "dark",
    // Brighter, higher-contrast tones than the previous #9600b4/near-black
    // combo - dark saturated colors on a dark background are hard to read.
    primary: { main: "#c084fc", contrastText: "#1a0b2e" }, // violet-300
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
    fontFamily: `"Inter", "Roboto", "Helvetica", "Arial", sans-serif`,
    h1: { fontFamily: `"Caacupe One", "Inter", sans-serif` },
    h2: { fontFamily: `"Caacupe One", "Inter", sans-serif` },
    h3: { fontFamily: `"Caacupe One", "Inter", sans-serif`, fontWeight: 400 },
    h4: { fontFamily: `"Caacupe One", "Inter", sans-serif`, fontWeight: 400 },
    h5: { fontFamily: `"Caacupe One", "Inter", sans-serif` },
    h6: { fontFamily: `"Caacupe One", "Inter", sans-serif` },
  },
  components: {
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

