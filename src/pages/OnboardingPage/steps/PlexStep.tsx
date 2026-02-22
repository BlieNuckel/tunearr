import StepDescription from "../components/StepDescription";
import PlexAuth from "@/components/PlexAuth";

interface PlexStepProps {
  token: string;
  onUrlChange: (url: string) => void;
  onTokenChange: (token: string) => void;
}

export default function PlexStep({
  token,
  onUrlChange,
  onTokenChange,
}: PlexStepProps) {
  return (
    <div className="space-y-4">
      <StepDescription text="Connect Plex to show your most-played artists on the Discover page. You can skip this and add it later in Settings." />
      <PlexAuth
        token={token}
        onToken={onTokenChange}
        onServerUrl={onUrlChange}
      />
    </div>
  );
}
