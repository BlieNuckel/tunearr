import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App";
import { LidarrContextProvider } from "./context/LidarrContext";
import { ThemeProvider } from "./context/ThemeContext";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element not found");

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        <LidarrContextProvider>
          <App />
        </LidarrContextProvider>
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>
);
