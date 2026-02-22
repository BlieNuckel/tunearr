interface SlskdSectionProps {
  url: string;
  apiKey: string;
  downloadPath: string;
  onUrlChange: (url: string) => void;
  onApiKeyChange: (apiKey: string) => void;
  onDownloadPathChange: (path: string) => void;
}

export default function SlskdSection({
  url,
  apiKey,
  downloadPath,
  onUrlChange,
  onApiKeyChange,
  onDownloadPathChange,
}: SlskdSectionProps) {
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
    </div>
  );
}
