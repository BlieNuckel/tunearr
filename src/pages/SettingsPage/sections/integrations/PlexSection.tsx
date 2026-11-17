import PlexAuth from "@/components/PlexAuth";

interface PlexSectionProps {
  url: string;
  onUrlChange: (url: string) => void;
  onSignOut: () => void;
  onLoginComplete: (serverUrl: string) => void;
  captureEnabled: boolean;
  onCaptureEnabledChange: (enabled: boolean) => void;
}

export default function PlexSection({
  url,
  onUrlChange,
  onSignOut,
  onLoginComplete,
  captureEnabled,
  onCaptureEnabledChange,
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
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={captureEnabled}
          onChange={(e) => onCaptureEnabledChange(e.target.checked)}
          className="w-4 h-4 border-2 border-black rounded"
        />
        <span className="text-sm text-gray-900 dark:text-gray-100">
          Record listening history
        </span>
      </label>
      <p className="text-gray-400 dark:text-gray-500 text-xs">
        Copies each user&apos;s Plex plays, ratings and listening sessions into
        Tunearr, so the history survives Plex purges and re-imports.
      </p>
    </div>
  );
}
