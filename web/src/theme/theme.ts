import { createTheme } from "@mui/material/styles";

// Severity status colors -- used consistently across chips, bars, and
// result cards. Never the only signal (always paired with text/label per
// the accessibility requirement), but kept semantically consistent.
export const severityColors: Record<string, string> = {
  "No DR": "#1E7A46",
  Mild: "#C99A1E",
  Moderate: "#D97B1F",
  Severe: "#C24A3A",
  "Proliferative DR": "#9A2E2E",
};

const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#12305C", light: "#2E4C7A", dark: "#0B2140" },
    secondary: { main: "#4C7FB8" },
    success: { main: "#1E7A46" },
    warning: { main: "#C99A1E" },
    error: { main: "#C24A3A" },
    background: { default: "#F7F8FA", paper: "#FFFFFF" },
    text: { primary: "#1B2430", secondary: "#5B6472" },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontWeight: 700 },
    h2: { fontWeight: 700 },
    h3: { fontWeight: 600 },
    h4: { fontWeight: 600 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    button: { textTransform: "none", fontWeight: 600 },
  },
  shape: { borderRadius: 10 },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: "0 1px 3px rgba(16,24,40,0.06), 0 1px 2px rgba(16,24,40,0.04)",
          border: "1px solid #E5E8EC",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 8 },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: { boxShadow: "none", borderBottom: "1px solid #E5E8EC" },
      },
    },
  },
});

export default theme;
