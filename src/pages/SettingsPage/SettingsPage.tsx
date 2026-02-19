import { useState, useEffect } from "react";
import { useLidarrContext } from "@/context/useLidarrContext";
import LidarrConnectionSection from "./components/LidarrConnectionSection";
import LidarrOptionsSection from "./components/LidarrOptionsSection";
import LastfmSection from "./components/LastfmSection";
import PlexSection from "./components/PlexSection";
import ImportSection from "./components/ImportSection";

export default function SettingsPage() {
  const {
    options,
    settings,
    isLoading,
    saveSettings,
    testConnection,
    loadLidarrOptionValues,
  } = useLidarrContext();
  const [qualityProfiles, setQualityProfiles] = useState<
    { id: number; name: string }[]
  >([]);
  const [metadataProfiles, setMetadataProfiles] = useState<
    { id: number; name: string }[]
  >([]);
  const [rootFolders, setRootFolders] = useState<
    { id: number; path: string }[]
  >([]);
  const [url, setUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [qualityProfileId, setQualityProfileId] = useState(1);
  const [rootFolderPath, setRootFolderPath] = useState("");
  const [metadataProfileId, setMetadataProfileId] = useState(1);
  const [lastfmApiKey, setLastfmApiKey] = useState("");
  const [plexUrl, setPlexUrl] = useState("");
  const [plexToken, setPlexToken] = useState("");
  const [importPath, setImportPath] = useState("");
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (settings.lidarrUrl) setUrl(settings.lidarrUrl);
    if (settings.lidarrQualityProfileId)
      setQualityProfileId(settings.lidarrQualityProfileId);
    if (settings.lidarrRootFolderPath)
      setRootFolderPath(settings.lidarrRootFolderPath);
    if (settings.lidarrMetadataProfileId)
      setMetadataProfileId(settings.lidarrMetadataProfileId);
    if (settings.lidarrApiKey) setApiKey(settings.lidarrApiKey);
    if (settings.lastfmApiKey) setLastfmApiKey(settings.lastfmApiKey);
    if (settings.plexUrl) setPlexUrl(settings.plexUrl);
    if (settings.plexToken) setPlexToken(settings.plexToken);
    if (settings.importPath) setImportPath(settings.importPath);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.lidarrUrl]);

  useEffect(() => {
    if (options.qualityProfiles.length)
      setQualityProfiles(options.qualityProfiles || []);
    if (options.metadataProfiles.length)
      setMetadataProfiles(options.metadataProfiles || []);
    if (options.rootFolderPaths.length)
      setRootFolders(options.rootFolderPaths || []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    options.metadataProfiles.length,
    options.qualityProfiles.length,
    options.rootFolderPaths.length,
  ]);

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
        importPath,
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
      await saveSettings({
        lidarrUrl: url,
        lidarrApiKey: apiKey,
        lidarrQualityProfileId: qualityProfileId,
        lidarrRootFolderPath: rootFolderPath,
        lidarrMetadataProfileId: metadataProfileId,
        lastfmApiKey,
        plexUrl,
        plexToken,
        importPath,
      });
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
        <LidarrConnectionSection
          url={url}
          apiKey={apiKey}
          testing={testing}
          onUrlChange={setUrl}
          onApiKeyChange={setApiKey}
          onTest={handleTest}
        />

        <LidarrOptionsSection
          rootFolders={rootFolders}
          rootFolderPath={rootFolderPath}
          qualityProfiles={qualityProfiles}
          qualityProfileId={qualityProfileId}
          metadataProfiles={metadataProfiles}
          metadataProfileId={metadataProfileId}
          onRootFolderChange={setRootFolderPath}
          onQualityProfileChange={setQualityProfileId}
          onMetadataProfileChange={setMetadataProfileId}
        />

        <LastfmSection apiKey={lastfmApiKey} onApiKeyChange={setLastfmApiKey} />

        <PlexSection
          url={plexUrl}
          token={plexToken}
          onUrlChange={setPlexUrl}
          onTokenChange={setPlexToken}
        />

        <ImportSection
          importPath={importPath}
          onImportPathChange={setImportPath}
        />

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
