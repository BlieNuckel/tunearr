import { useState, useEffect } from "react";
import useSettings from "../hooks/useSettings";

export default function SettingsPage() {
  const { settings, loading, saving, testing, testResult, error, save, testConnection } =
    useSettings();
  const [url, setUrl] = useState("");
  const [apiKey, setApiKey] = useState("");

  useEffect(() => {
    if (settings.lidarrUrl) setUrl(settings.lidarrUrl);
  }, [settings.lidarrUrl]);

  if (loading) {
    return <p className="text-gray-400">Loading settings...</p>;
  }

  const handleTest = (e) => {
    e.preventDefault();
    testConnection({ lidarrUrl: url, lidarrApiKey: apiKey });
  };

  const handleSave = (e) => {
    e.preventDefault();
    save({ lidarrUrl: url, lidarrApiKey: apiKey });
  };

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold text-white mb-6">Settings</h1>

      <form className="space-y-4" onSubmit={handleSave}>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Lidarr URL
          </label>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="http://192.168.1.50:8686"
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-gray-100 placeholder-gray-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            API Key
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={settings.lidarrApiKey || "Enter API key"}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-gray-100 placeholder-gray-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={handleTest}
            disabled={testing || !url || !apiKey}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white rounded-md text-sm transition-colors"
          >
            {testing ? "Testing..." : "Test Connection"}
          </button>
          <button
            type="submit"
            disabled={saving || !url || !apiKey}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-md text-sm transition-colors"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </form>

      {testResult && (
        <div
          className={`mt-4 p-3 rounded-md text-sm ${
            testResult.success
              ? "bg-green-900/30 text-green-400 border border-green-800"
              : "bg-red-900/30 text-red-400 border border-red-800"
          }`}
        >
          {testResult.success
            ? `Connected! Lidarr v${testResult.version}`
            : `Connection failed: ${testResult.error}`}
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 rounded-md text-sm bg-red-900/30 text-red-400 border border-red-800">
          {error}
        </div>
      )}
    </div>
  );
}
