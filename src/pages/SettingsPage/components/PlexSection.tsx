import PlexAuth from "@/components/PlexAuth";

interface PlexSectionProps {
  token: string;
  onUrlChange: (url: string) => void;
  onTokenChange: (token: string) => void;
}

export default function PlexSection({
  token,
  onUrlChange,
  onTokenChange,
}: PlexSectionProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
        Plex
      </h2>
      <PlexAuth
        token={token}
        onToken={onTokenChange}
        onServerUrl={onUrlChange}
      />
      <p className="text-gray-400 dark:text-gray-500 text-xs">
        Used to show your most-played artists on the Discover page
      </p>
    </div>
  );
}
