interface LastfmSectionProps {
  apiKey: string;
  onApiKeyChange: (key: string) => void;
}

export default function LastfmSection({
  apiKey,
  onApiKeyChange,
}: LastfmSectionProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-900">Last.fm</h2>
      <div>
        <label className="block text-sm font-medium text-gray-600 mb-1">
          Last.fm API Key
        </label>
        <input
          type="text"
          value={apiKey}
          onChange={(e) => onApiKeyChange(e.target.value)}
          placeholder="Enter Last.fm API key"
          className="w-full px-3 py-2 bg-white border-2 border-black rounded-lg text-gray-900 placeholder-gray-200 focus:outline-none focus:border-amber-400 shadow-cartoon-md"
        />
        <p className="text-gray-400 text-xs mt-1">
          Get a free API key at last.fm/api/account/create
        </p>
      </div>
    </div>
  );
}
