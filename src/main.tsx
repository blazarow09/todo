/// <reference types="./vite-env" />
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./themes.css";

// Apply theme immediately before React renders to prevent flash
const THEME_KEY = "todo_theme";
const savedTheme = localStorage.getItem(THEME_KEY);
if (savedTheme === 'light' || savedTheme === 'dark') {
  document.documentElement.setAttribute('data-theme', savedTheme);
} else {
  document.documentElement.setAttribute('data-theme', 'light');
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);


