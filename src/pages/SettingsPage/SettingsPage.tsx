import { useState, useEffect } from "react";
import { useLidarrContext } from "@/context/useLidarrContext";
import LidarrConnectionSection from "./components/LidarrConnectionSection";
import LidarrOptionsSection from "./components/LidarrOptionsSection";
import LastfmSection from "./components/LastfmSection";
import PlexSection from "./components/PlexSection";
import ImportSection from "./components/ImportSection";
import ThemeToggle from "@/components/ThemeToggle";

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
    return <p className="text-gray-500 dark:text-gray-400">Loading settings...</p>;
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
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">Settings</h1>

      <div className="space-y-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Theme</h2>
        <ThemeToggle />
      </div>

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
          className="px-4 py-2 bg-amber-300 hover:bg-amber-200 disabled:opacity-50 text-black font-bold rounded-lg text-sm border-2 border-black shadow-cartoon-md hover:translate-y-[-1px] hover:shadow-cartoon-lg active:translate-y-[1px] active:shadow-cartoon-pressed transition-all"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </form>

      {testResult && (
        <div
          className={`mt-4 p-3 rounded-xl text-sm font-medium border-2 border-black shadow-cartoon-sm ${
            testResult.success
              ? "bg-emerald-400 text-black"
              : "bg-rose-400 text-white"
          }`}
        >
          {testResult.success
            ? `Connected! Lidarr v${testResult.version}`
            : `Connection failed: ${testResult.error}`}
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 rounded-xl text-sm font-medium bg-rose-400 text-white border-2 border-black shadow-cartoon-sm">
          {error}
        </div>
      )}
    </div>
  );
}
