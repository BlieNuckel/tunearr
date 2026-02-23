import { useState, useCallback, useEffect } from "react";
import { useLidarrContext } from "@/context/useLidarrContext";
import { useAutoSave } from "@/hooks/useAutoSave";
import LidarrConnectionSection from "./components/LidarrConnectionSection";
import LidarrOptionsSection from "./components/LidarrOptionsSection";
import LastfmSection from "./components/LastfmSection";
import PlexSection from "./components/PlexSection";
import SlskdSection from "./components/SlskdSection";
import ImportSection from "./components/ImportSection";
import ThemeToggle from "@/components/ThemeToggle";
import Skeleton from "@/components/Skeleton";
import SettingsTabs from "./components/SettingsTabs";
import type { SettingsTab } from "./components/SettingsTabs";
import SettingsSearch from "./components/SettingsSearch";
import SaveStatusIndicator from "./components/SaveStatusIndicator";
import {
  filterSections,
  SECTION_META,
  type SettingsSection,
} from "./settingsSearchConfig";

type TestResult = {
  success: boolean;
  version?: string;
  error?: string;
};

function SectionBadge({ section }: { section: SettingsSection }) {
  const meta = SECTION_META[section];
  return (
    <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
      {meta.tab === "general" ? "General" : "Integrations"}
    </span>
  );
}

function isSectionVisible(
  section: SettingsSection,
  activeTab: SettingsTab,
  searchQuery: string,
  matchingSections: SettingsSection[]
): boolean {
  if (searchQuery) return matchingSections.includes(section);
  return SECTION_META[section].tab === activeTab;
}

export default function SettingsPage() {
  const {
    options,
    settings,
    isLoading,
    savePartialSettings,
    testConnection,
    loadLidarrOptionValues,
  } = useLidarrContext();

  const { fields, saveStatus, saveError, updateField, updateFields } =
    useAutoSave(settings, savePartialSettings);

  const [activeTab, setActiveTab] = useState<SettingsTab>("general");
  const [searchQuery, setSearchQuery] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  const matchingSections = searchQuery ? filterSections(searchQuery) : [];
  const isSearching = searchQuery.length > 0;

  useEffect(() => {
    loadLidarrOptionValues();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTest = useCallback(
    async (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      setTesting(true);
      setTestResult(null);

      try {
        const result = await testConnection({
          ...fields,
          lidarrUrl: fields.lidarrUrl,
          lidarrApiKey: fields.lidarrApiKey,
        });
        setTestResult(result);
        if (result.success) {
          await loadLidarrOptionValues();
        }
      } catch (err) {
        setTestResult({
          success: false,
          error: err instanceof Error ? err.message : "Test failed",
        });
      } finally {
        setTesting(false);
      }
    },
    [fields, testConnection, loadLidarrOptionValues]
  );

  const handlePlexLoginComplete = useCallback(
    (token: string, serverUrl: string) => {
      updateFields({ plexUrl: serverUrl, plexToken: token });
    },
    [updateFields]
  );

  const handlePlexSignOut = useCallback(() => {
    updateFields({ plexUrl: "", plexToken: "" });
  }, [updateFields]);

  if (isLoading) {
    return (
      <div className="max-w-lg space-y-6">
        <Skeleton className="h-8 w-32" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="space-y-4">
            <Skeleton className="h-6 w-48" />
            <div className="space-y-3">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
            <div className="space-y-3">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const visible = (section: SettingsSection) =>
    isSectionVisible(section, activeTab, searchQuery, matchingSections);

  return (
    <div className="max-w-lg space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Settings
        </h1>
        <SaveStatusIndicator status={saveStatus} error={saveError} />
      </div>

      <SettingsSearch query={searchQuery} onQueryChange={setSearchQuery} />

      {!isSearching && (
        <SettingsTabs activeTab={activeTab} onTabChange={setActiveTab} />
      )}

      <div className="space-y-6">
        {visible("theme") && (
          <div>
            {isSearching && <SectionBadge section="theme" />}
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Theme
              </h2>
              <ThemeToggle />
            </div>
          </div>
        )}

        {visible("import") && (
          <div>
            {isSearching && <SectionBadge section="import" />}
            <ImportSection
              importPath={fields.importPath}
              onImportPathChange={(v) => updateField("importPath", v)}
            />
          </div>
        )}

        {visible("lidarrConnection") && (
          <div>
            {isSearching && <SectionBadge section="lidarrConnection" />}
            <LidarrConnectionSection
              url={fields.lidarrUrl}
              apiKey={fields.lidarrApiKey}
              testing={testing}
              onUrlChange={(v) => updateField("lidarrUrl", v)}
              onApiKeyChange={(v) => updateField("lidarrApiKey", v)}
              onTest={handleTest}
            />
          </div>
        )}

        {visible("lidarrOptions") && (
          <div>
            {isSearching && <SectionBadge section="lidarrOptions" />}
            <LidarrOptionsSection
              rootFolders={options.rootFolderPaths}
              rootFolderPath={fields.lidarrRootFolderPath}
              qualityProfiles={options.qualityProfiles}
              qualityProfileId={fields.lidarrQualityProfileId}
              metadataProfiles={options.metadataProfiles}
              metadataProfileId={fields.lidarrMetadataProfileId}
              onRootFolderChange={(v) => updateField("lidarrRootFolderPath", v)}
              onQualityProfileChange={(v) =>
                updateField("lidarrQualityProfileId", v)
              }
              onMetadataProfileChange={(v) =>
                updateField("lidarrMetadataProfileId", v)
              }
            />
          </div>
        )}

        {visible("lastfm") && (
          <div>
            {isSearching && <SectionBadge section="lastfm" />}
            <LastfmSection
              apiKey={fields.lastfmApiKey}
              onApiKeyChange={(v) => updateField("lastfmApiKey", v)}
            />
          </div>
        )}

        {visible("plex") && (
          <div>
            {isSearching && <SectionBadge section="plex" />}
            <PlexSection
              token={fields.plexToken}
              onUrlChange={(v) => updateField("plexUrl", v)}
              onTokenChange={(v) => updateField("plexToken", v)}
              onSignOut={handlePlexSignOut}
              onLoginComplete={handlePlexLoginComplete}
            />
          </div>
        )}

        {visible("slskd") && (
          <div>
            {isSearching && <SectionBadge section="slskd" />}
            <SlskdSection
              url={fields.slskdUrl}
              apiKey={fields.slskdApiKey}
              downloadPath={fields.slskdDownloadPath}
              onUrlChange={(v) => updateField("slskdUrl", v)}
              onApiKeyChange={(v) => updateField("slskdApiKey", v)}
              onDownloadPathChange={(v) => updateField("slskdDownloadPath", v)}
            />
          </div>
        )}
      </div>

      {testResult && (
        <div
          className={`mt-4 p-3 rounded-xl text-sm font-medium border-2 border-black shadow-cartoon-sm animate-slide-up ${
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
    </div>
  );
}
