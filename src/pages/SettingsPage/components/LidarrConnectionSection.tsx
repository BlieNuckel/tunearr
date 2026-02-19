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
      <h2 className="text-xl font-bold text-gray-900">Lidarr Connection</h2>
      <div>
        <label className="block text-sm font-medium text-gray-600 mb-1">
          Lidarr URL
        </label>
        <input
          type="text"
          value={url}
          onChange={(e) => onUrlChange(e.target.value)}
          placeholder="http://localhost:8686"
          className="w-full px-3 py-2 bg-white border-2 border-black rounded-lg text-gray-900 placeholder-gray-200 focus:outline-none focus:border-amber-400 shadow-cartoon-md"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-600 mb-1">
          API Key
        </label>
        <input
          type="text"
          value={apiKey}
          onChange={(e) => onApiKeyChange(e.target.value)}
          placeholder="Enter API key"
          className="w-full px-3 py-2 bg-white border-2 border-black rounded-lg text-gray-900 placeholder-gray-200 focus:outline-none focus:border-amber-400 shadow-cartoon-md"
        />
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onTest}
          disabled={testing || !url || !apiKey}
          className="px-4 py-2 bg-amber-300 hover:bg-amber-200 disabled:opacity-50 text-black font-bold rounded-lg text-sm border-2 border-black shadow-cartoon-sm hover:translate-y-[-1px] hover:shadow-cartoon-md active:translate-y-[1px] active:shadow-cartoon-pressed transition-all"
        >
          {testing ? "Testing..." : "Test Connection"}
        </button>
      </div>
    </div>
  );
}
