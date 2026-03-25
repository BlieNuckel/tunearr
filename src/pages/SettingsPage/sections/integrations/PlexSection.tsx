import PlexAuth from "@/components/PlexAuth";

interface PlexSectionProps {
  url: string;
  onUrlChange: (url: string) => void;
  onSignOut: () => void;
  onLoginComplete: (serverUrl: string) => void;
}

export default function PlexSection({
  url,
  onUrlChange,
  onSignOut,
  onLoginComplete,
}: PlexSectionProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
        Plex
      </h2>
      <PlexAuth
        serverUrl={url}
        onServerUrl={onUrlChange}
        onSignOut={onSignOut}
        onLoginComplete={onLoginComplete}
      />
      <p className="text-gray-400 dark:text-gray-500 text-xs">
        Used to show your most-played artists on the Discover page
      </p>
    </div>
  );
}
