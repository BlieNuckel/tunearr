import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App";
import { LidarrContextProvider } from "./context/LidarrContext";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element not found");

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <LidarrContextProvider>
        <App />
      </LidarrContextProvider>
    </BrowserRouter>
  </React.StrictMode>
);
