import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import "./styles/global.css";

/*
 * Impact UI (v3.7.20) injects its component styles at runtime via the bundled
 * CSS-in-JS / SCSS, and does NOT export a ThemeProvider. So no global provider
 * is required here — importing components from "impact-ui" is sufficient.
 * Our own design tokens live in styles/global.css.
 *
 * AuthProvider wraps the whole tree so every component can call useAuth()
 * to read the current user, log in, or log out.
 */
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);
