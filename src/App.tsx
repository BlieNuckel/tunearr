import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import RequireAuth from "./components/RequireAuth";
import RequireOnboarding from "./components/RequireOnboarding";
import SearchPage from "./pages/SearchPage/SearchPage";
import DiscoverPage from "./pages/DiscoverPage/DiscoverPage";
import ExplorationPage from "./pages/ExplorationPage/ExplorationPage";
import LibraryPage from "./pages/LibraryPage/LibraryPage";
import SettingsLayout from "./pages/SettingsPage/SettingsLayout";
import GeneralSettingsPage from "./pages/SettingsPage/pages/GeneralSettingsPage";
import IntegrationsSettingsPage from "./pages/SettingsPage/pages/IntegrationsSettingsPage";
import RecommendationsSettingsPage from "./pages/SettingsPage/pages/RecommendationsSettingsPage";
import UsersSettingsPage from "./pages/SettingsPage/pages/UsersSettingsPage";
import LogsSettingsPage from "./pages/SettingsPage/pages/LogsSettingsPage";
import NotificationsPage from "./pages/SettingsPage/notifications/NotificationsPage";
import EmailNotificationsPage from "./pages/SettingsPage/notifications/EmailNotificationsPage";
import WebhookNotificationsPage from "./pages/SettingsPage/notifications/WebhookNotificationsPage";
import OnboardingPage from "./pages/OnboardingPage/OnboardingPage";

function App() {
  return (
    <Routes>
      <Route element={<RequireAuth />}>
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route element={<RequireOnboarding />}>
          <Route path="/explore" element={<ExplorationPage />} />
          <Route element={<Layout />}>
            <Route path="/" element={<DiscoverPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/library" element={<LibraryPage />} />
            <Route path="/settings" element={<SettingsLayout />}>
              <Route
                index
                element={<Navigate to="/settings/general" replace />}
              />
              <Route path="general" element={<GeneralSettingsPage />} />
              <Route
                path="integrations"
                element={<IntegrationsSettingsPage />}
              />
              <Route
                path="recommendations"
                element={<RecommendationsSettingsPage />}
              />
              <Route path="users" element={<UsersSettingsPage />} />
              <Route path="logs" element={<LogsSettingsPage />} />
              <Route path="notifications" element={<NotificationsPage />}>
                <Route
                  index
                  element={
                    <Navigate to="/settings/notifications/email" replace />
                  }
                />
                <Route path="email" element={<EmailNotificationsPage />} />
                <Route path="webhook" element={<WebhookNotificationsPage />} />
              </Route>
            </Route>
          </Route>
        </Route>
      </Route>
    </Routes>
  );
}

export default App;
