import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import RequireOnboarding from "./components/RequireOnboarding";
import SearchPage from "./pages/SearchPage/SearchPage";
import DiscoverPage from "./pages/DiscoverPage/DiscoverPage";
import ExplorationPage from "./pages/ExplorationPage/ExplorationPage";
import StatusPage from "./pages/StatusPage/StatusPage";
import SettingsPage from "./pages/SettingsPage/SettingsPage";
import OnboardingPage from "./pages/OnboardingPage/OnboardingPage";

function App() {
  return (
    <Routes>
      <Route path="/onboarding" element={<OnboardingPage />} />
      <Route element={<RequireOnboarding />}>
        <Route path="/explore" element={<ExplorationPage />} />
        <Route element={<Layout />}>
          <Route path="/" element={<DiscoverPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/status" element={<StatusPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default App;
