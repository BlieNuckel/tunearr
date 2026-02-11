import { useState, useEffect } from "react";
import { useLidarrContext } from "../context/LidarrContext";

export default function SettingsPage() {
  const { settings, isLoading, saveSettings, testConnection } =
    useLidarrContext();
  const [url, setUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    version?: string;
    error?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (settings.lidarrUrl) setUrl(settings.lidarrUrl);
  }, [settings.lidarrUrl]);

  if (isLoading) {
    return <p className="text-gray-400">Loading settings...</p>;
  }

  const handleTest = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setTesting(true);
    setTestResult(null);
    setError(null);

    try {
      const result = await testConnection({
        lidarrUrl: url,
        lidarrApiKey: apiKey,
      });
      setTestResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Test failed");
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      await saveSettings({ lidarrUrl: url, lidarrApiKey: apiKey });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
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
            placeholder="http://localhost:8686"
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
