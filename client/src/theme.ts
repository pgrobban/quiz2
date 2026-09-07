import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#0066ff" },
    secondary: { main: "#00e5ff" },
    background: { default: "#101018", paper: "#181826" },
  },
  shape: {
    borderRadius: 12,
  },
  typography: {
    fontFamily: `"Inter", "Roboto", "Helvetica", "Arial", sans-serif`,
    h3: { fontWeight: 700 },
    h4: { fontWeight: 700 },
  },
});
