interface LidarrConnectionSectionProps {
  url: string;
  apiKey: string;
  testing: boolean;
  onUrlChange: (url: string) => void;
  onApiKeyChange: (apiKey: string) => void;
  onTest: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

export default function LidarrConnectionSection({
  url,
  apiKey,
  testing,
  onUrlChange,
  onApiKeyChange,
  onTest,
}: LidarrConnectionSectionProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl text-gray">Lidarr Connection</h2>
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Lidarr URL
        </label>
        <input
          type="text"
          value={url}
          onChange={(e) => onUrlChange(e.target.value)}
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
          onChange={(e) => onApiKeyChange(e.target.value)}
          placeholder="Enter API key"
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-gray-100 placeholder-gray-500 focus:outline-none focus:border-indigo-500"
        />
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onTest}
          disabled={testing || !url || !apiKey}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white rounded-md text-sm transition-colors"
        >
          {testing ? "Testing..." : "Test Connection"}
        </button>
      </div>
    </div>
  );
}
