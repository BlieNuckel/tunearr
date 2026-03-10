import StepDescription from "../components/StepDescription";
import PlexAuth from "@/components/PlexAuth";

interface PlexStepProps {
  url: string;
  onUrlChange: (url: string) => void;
}

export default function PlexStep({ url, onUrlChange }: PlexStepProps) {
  return (
    <div className="space-y-4">
      <StepDescription text="Connect Plex to show your most-played artists on the Discover page. You can skip this and add it later in Settings." />
      <PlexAuth serverUrl={url} onServerUrl={onUrlChange} />
    </div>
  );
}
