import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/inter";
import "./index.css";
import App from "./App";
import { TooltipProvider } from "@/components/ui/tooltip";

createRoot(document.getElementById("app")!).render(
  <StrictMode>
    <TooltipProvider>
      <App />
    </TooltipProvider>
  </StrictMode>,
);
