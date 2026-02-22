import StepDescription from "../components/StepDescription";
import PlexLoginButton from "@/components/PlexLoginButton";

interface PlexStepProps {
  url: string;
  token: string;
  onUrlChange: (url: string) => void;
  onTokenChange: (token: string) => void;
}

export default function PlexStep({
  url,
  token,
  onUrlChange,
  onTokenChange,
}: PlexStepProps) {
  return (
    <div className="space-y-4">
      <StepDescription text="Connect Plex to show your most-played artists on the Discover page. You can skip this and add it later in Settings." />
      <PlexLoginButton onToken={onTokenChange} onServerUrl={onUrlChange} />
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-gray-200" />
        <span className="text-xs text-gray-400">or enter manually</span>
        <div className="h-px flex-1 bg-gray-200" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-600 mb-1">
          Plex URL
        </label>
        <input
          type="text"
          value={url}
          onChange={(e) => onUrlChange(e.target.value)}
          placeholder="http://localhost:32400"
          className="w-full px-3 py-2 bg-white border-2 border-black rounded-lg text-gray-900 placeholder-gray-200 focus:outline-none focus:border-amber-400 shadow-cartoon-md"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-600 mb-1">
          Plex Token
        </label>
        <input
          type="text"
          value={token}
          onChange={(e) => onTokenChange(e.target.value)}
          placeholder="Enter Plex token"
          className="w-full px-3 py-2 bg-white border-2 border-black rounded-lg text-gray-900 placeholder-gray-200 focus:outline-none focus:border-amber-400 shadow-cartoon-md"
        />
      </div>
    </div>
  );
}
