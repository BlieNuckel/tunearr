import type { TestResult } from "@/hooks/useOnboarding";

interface LidarrConnectionStepProps {
  url: string;
  apiKey: string;
  testing: boolean;
  testResult: TestResult | null;
  onUrlChange: (url: string) => void;
  onApiKeyChange: (key: string) => void;
  onTest: () => void;
}

export default function LidarrConnectionStep({
  url,
  apiKey,
  testing,
  testResult,
  onUrlChange,
  onApiKeyChange,
  onTest,
}: LidarrConnectionStepProps) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500 mb-4">
        Connect to your Lidarr instance. You can find your API key in Lidarr
        under Settings &gt; General.
      </p>
      <div>
        <label className="block text-sm font-medium text-gray-600 mb-1">
          Lidarr URL
        </label>
        <input
          data-testid="lidarr-url-input"
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
          data-testid="lidarr-apikey-input"
          type="text"
          value={apiKey}
          onChange={(e) => onApiKeyChange(e.target.value)}
          placeholder="Enter API key"
          className="w-full px-3 py-2 bg-white border-2 border-black rounded-lg text-gray-900 placeholder-gray-200 focus:outline-none focus:border-amber-400 shadow-cartoon-md"
        />
      </div>
      <button
        type="button"
        onClick={onTest}
        disabled={testing || !url || !apiKey}
        className="px-4 py-2 bg-amber-300 hover:bg-amber-200 disabled:opacity-50 text-black font-bold rounded-lg text-sm border-2 border-black shadow-cartoon-sm hover:translate-y-[-1px] hover:shadow-cartoon-md active:translate-y-[1px] active:shadow-cartoon-pressed transition-all"
      >
        {testing ? "Testing..." : "Test Connection"}
      </button>
      {testResult && (
        <div
          className={`p-3 rounded-xl text-sm font-medium border-2 border-black shadow-cartoon-sm ${
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
