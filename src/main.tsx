import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/league-spartan/latin-900.css";
import "katex/dist/katex.min.css";
import "./styles.css";
import App from "./App";
import { AppErrorBoundary } from "./components/AppErrorBoundary";

createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </StrictMode>
);
