import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import SearchPage from "./pages/SearchPage/SearchPage";
import DiscoverPage from "./pages/DiscoverPage/DiscoverPage";
import StatusPage from "./pages/StatusPage/StatusPage";
import SettingsPage from "./pages/SettingsPage/SettingsPage";

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<DiscoverPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/status" element={<StatusPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}

export default App;
