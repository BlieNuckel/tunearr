import { useState, useEffect } from "react";
import { useLidarrContext } from "../context/LidarrContext";

export default function SettingsPage() {
  const { options, settings, isLoading, saveSettings, testConnection, loadLidarrOptionValues } =
    useLidarrContext();
  const [qualityProfiles, setQualityProfiles] = useState<{ id: number; name: string }[]>([]);
  const [metadataProfiles, setMetadataProfiles] = useState<{ id: number; name: string }[]>([]);
  const [rootFolders, setRootFolders] = useState<{ id: number; path: string }[]>([]);
  const [url, setUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [qualityProfileId, setQualityProfileId] = useState(1);
  const [rootFolderPath, setRootFolderPath] = useState("");
  const [metadataProfileId, setMetadataProfileId] = useState(1);
  const [lastfmApiKey, setLastfmApiKey] = useState("");
  const [plexUrl, setPlexUrl] = useState("");
  const [plexToken, setPlexToken] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    version?: string;
    error?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadLidarrOptionValues();
  }, []);

  useEffect(() => {
    if (settings.lidarrUrl) setUrl(settings.lidarrUrl);
    if (settings.lidarrQualityProfileId)
      setQualityProfileId(settings.lidarrQualityProfileId);
    if (settings.lidarrRootFolderPath) setRootFolderPath(settings.lidarrRootFolderPath);
    if (settings.lidarrMetadataProfileId)
      setMetadataProfileId(settings.lidarrMetadataProfileId);
    if (settings.lidarrApiKey) setApiKey(settings.lidarrApiKey);
    if (settings.lastfmApiKey) setLastfmApiKey(settings.lastfmApiKey);
    if (settings.plexUrl) setPlexUrl(settings.plexUrl);
    if (settings.plexToken) setPlexToken(settings.plexToken);
  }, [settings.lidarrUrl]);

  useEffect(() => {
    if (options.qualityProfiles.length)
      setQualityProfiles(options.qualityProfiles || []);
    if (options.metadataProfiles.length)
      setMetadataProfiles(options.metadataProfiles || []);
    if (options.rootFolderPaths.length)
      setRootFolders(options.rootFolderPaths || []);
  }, [options.metadataProfiles.length, options.qualityProfiles.length, options.rootFolderPaths.length]);

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
        lidarrQualityProfileId: qualityProfileId,
        lidarrRootFolderPath: rootFolderPath,
        lidarrMetadataProfileId: metadataProfileId,
        lastfmApiKey,
        plexUrl,
        plexToken,
      });
      setTestResult(result);
      if (result.success) {
        await loadLidarrOptionValues();
      }

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
      await saveSettings({ lidarrUrl: url, lidarrApiKey: apiKey, lidarrQualityProfileId: qualityProfileId, lidarrRootFolderPath: rootFolderPath, lidarrMetadataProfileId: metadataProfileId, lastfmApiKey, plexUrl, plexToken });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-2xl font-bold text-white mb-6">Settings</h1>

      <form className="space-y-6" onSubmit={handleSave}>
        <div className="space-y-4">
          <h1 className="text-xl text-gray">Lidarr Connection</h1>
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
              type="text"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={
                "Enter API key"}
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
          </div>
        </div>

        <div className="space-y-4">
          <h1 className="text-xl text-gray mb-6"></h1>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Lidarr Root Path</label>
            <select
              key={rootFolders.length} // Force re-render when root folders change
              value={rootFolderPath}
              onChange={(e) => setRootFolderPath(e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-gray-100 placeholder-gray-500 focus:outline-none focus:border-indigo-500"
            >
              {rootFolders.map((folder) => (
                <option key={folder.id} value={folder.path}>
                  {folder.path}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Quality Profile</label>
            <select
              key={qualityProfiles.length} // Force re-render when quality profiles change
              value={qualityProfileId}
              onChange={(e) => setQualityProfileId(Number(e.target.value))}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-gray-100 placeholder-gray-500 focus:outline-none focus:border-indigo-500"
            >
              {qualityProfiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Metadata Profile</label>
            <select
              key={metadataProfiles.length} // Force re-render when metadata profiles change
              value={metadataProfileId}
              onChange={(e) => setMetadataProfileId(Number(e.target.value))}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-gray-100 placeholder-gray-500 focus:outline-none focus:border-indigo-500"
            >
              {metadataProfiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-4">
          <h1 className="text-xl text-gray">Last.fm</h1>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Last.fm API Key
            </label>
            <input
              type="text"
              value={lastfmApiKey}
              onChange={(e) => setLastfmApiKey(e.target.value)}
              placeholder="Enter Last.fm API key"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-gray-100 placeholder-gray-500 focus:outline-none focus:border-indigo-500"
            />
            <p className="text-gray-500 text-xs mt-1">
              Get a free API key at last.fm/api/account/create
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <h1 className="text-xl text-gray">Plex</h1>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Plex URL
            </label>
            <input
              type="text"
              value={plexUrl}
              onChange={(e) => setPlexUrl(e.target.value)}
              placeholder="http://localhost:32400"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-gray-100 placeholder-gray-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Plex Token
            </label>
            <input
              type="text"
              value={plexToken}
              onChange={(e) => setPlexToken(e.target.value)}
              placeholder="Enter Plex token"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-gray-100 placeholder-gray-500 focus:outline-none focus:border-indigo-500"
            />
            <p className="text-gray-500 text-xs mt-1">
              Used to show your most-played artists on the Discover page
            </p>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving || !url || !apiKey}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-md text-sm transition-colors"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </form>

      {testResult && (
        <div
          className={`mt-4 p-3 rounded-md text-sm ${testResult.success
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
