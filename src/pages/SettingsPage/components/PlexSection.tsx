interface PlexSectionProps {
  url: string;
  token: string;
  onUrlChange: (url: string) => void;
  onTokenChange: (token: string) => void;
}

export default function PlexSection({
  url,
  token,
  onUrlChange,
  onTokenChange,
}: PlexSectionProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-900">Plex</h2>
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
        <p className="text-gray-400 text-xs mt-1">
          Used to show your most-played artists on the Discover page
        </p>
      </div>
    </div>
  );
}
