import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import SearchPage from "./pages/SearchPage";
import DiscoverPage from "./pages/DiscoverPage";
import StatusPage from "./pages/StatusPage";
import SettingsPage from "./pages/SettingsPage";

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<SearchPage />} />
        <Route path="/discover" element={<DiscoverPage />} />
        <Route path="/status" element={<StatusPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}

export default App;
