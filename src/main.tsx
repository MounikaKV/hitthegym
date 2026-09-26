import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from "react-router-dom";
import {
  ensureDemoHistorySeeded,
  ensureDemoProfileSeeded,
} from "./services/entryStorage";
import './index.css'
import App from './App.tsx'

ensureDemoHistorySeeded();
ensureDemoProfileSeeded();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
