import { Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "./components/AppLayout";
import EntryPage from "./pages/EntryPage";
import Landing from "./pages/Landing";
import LandingPage from "./pages/LandingPage";
import Result from "./pages/Result";
import SettingsPage from "./pages/SettingsPage";
import StatsPage from "./pages/StatsPage";
import { PITCH_ONLY } from "./config";

function App() {
  // Hosted pitch site (Vercel): only the pitch page; the rest of the app runs locally.
  if (PITCH_ONLY) {
    return (
      <Routes>
        <Route path="*" element={<Landing />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/entry" element={<EntryPage />} />
        <Route path="/stats" element={<StatsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      {/* Pitch site and output page: full-screen, outside the app shell. */}
      <Route path="/pitch" element={<Landing />} />
      <Route path="/result" element={<Result />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
