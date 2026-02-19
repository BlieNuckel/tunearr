import StepDescription from "../components/StepDescription";

interface LastfmStepProps {
  apiKey: string;
  onApiKeyChange: (key: string) => void;
}

export default function LastfmStep({
  apiKey,
  onApiKeyChange,
}: LastfmStepProps) {
  return (
    <div className="space-y-4">
      <StepDescription text="Last.fm powers the Discover page with similar artist recommendations and popular albums. You can skip this and add it later in Settings." />
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
