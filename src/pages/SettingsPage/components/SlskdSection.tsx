type AutoSetupStatus = {
  indexerExists: boolean;
  downloadClientExists: boolean;
} | null;

interface SlskdSectionProps {
  url: string;
  apiKey: string;
  downloadPath: string;
  onUrlChange: (url: string) => void;
  onApiKeyChange: (apiKey: string) => void;
  onDownloadPathChange: (path: string) => void;
  isConnected: boolean;
  autoSetupStatus: AutoSetupStatus;
  autoSetupLoading: boolean;
  onAutoSetup: () => void;
}

function getButtonState(
  isConnected: boolean,
  status: AutoSetupStatus,
  loading: boolean
) {
  if (loading) return "loading" as const;
  if (!isConnected) return "disabled" as const;
  if (status?.indexerExists && status?.downloadClientExists)
    return "added" as const;
  return "ready" as const;
}

export default function SlskdSection({
  url,
  apiKey,
  downloadPath,
  onUrlChange,
  onApiKeyChange,
  onDownloadPathChange,
  isConnected,
  autoSetupStatus,
  autoSetupLoading,
  onAutoSetup,
}: SlskdSectionProps) {
  const buttonState = getButtonState(
    isConnected,
    autoSetupStatus,
    autoSetupLoading
  );

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
        slskd (Soulseek)
      </h2>
      <div>
        <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
          slskd URL
        </label>
        <input
          type="text"
          value={url}
          onChange={(e) => onUrlChange(e.target.value)}
          placeholder="http://slskd:5030"
          className="w-full px-3 py-2 bg-white dark:bg-gray-800 border-2 border-black rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-200 dark:placeholder-gray-600 focus:outline-none focus:border-amber-400 shadow-cartoon-md"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
          API Key
        </label>
        <input
          type="text"
          value={apiKey}
          onChange={(e) => onApiKeyChange(e.target.value)}
          placeholder="Enter slskd API key"
          className="w-full px-3 py-2 bg-white dark:bg-gray-800 border-2 border-black rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-200 dark:placeholder-gray-600 focus:outline-none focus:border-amber-400 shadow-cartoon-md"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
          Download Path
        </label>
        <input
          type="text"
          value={downloadPath}
          onChange={(e) => onDownloadPathChange(e.target.value)}
          placeholder="/downloads/slskd/complete"
          className="w-full px-3 py-2 bg-white dark:bg-gray-800 border-2 border-black rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-200 dark:placeholder-gray-600 focus:outline-none focus:border-amber-400 shadow-cartoon-md"
        />
        <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
          Path where Lidarr can access slskd&apos;s completed downloads (shared
          volume mount)
        </p>
      </div>
      <AutoSetupButton state={buttonState} onClick={onAutoSetup} />
    </div>
  );
}

function AutoSetupButton({
  state,
  onClick,
}: {
  state: "disabled" | "loading" | "added" | "ready";
  onClick: () => void;
}) {
  if (state === "added") {
    return (
      <button
        disabled
        className="w-full px-4 py-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-bold rounded-lg border-2 border-black shadow-cartoon-sm cursor-default"
      >
        ✓ Added to Lidarr
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      disabled={state === "disabled" || state === "loading"}
      className="w-full px-4 py-2 bg-amber-400 text-black font-bold rounded-lg border-2 border-black shadow-cartoon-sm hover:bg-amber-300 active:translate-y-0.5 active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed transition-all"
    >
      {state === "loading" ? "Checking…" : "Set Up in Lidarr"}
    </button>
  );
}
