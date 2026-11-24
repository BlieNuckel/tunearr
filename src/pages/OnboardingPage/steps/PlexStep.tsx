import StepDescription from "../components/StepDescription";
import PlexAuth from "@/components/PlexAuth";
import usePlexConnection from "@/hooks/usePlexConnection";

export default function PlexStep() {
  const plex = usePlexConnection();

  return (
    <div className="space-y-4">
      <StepDescription text="Connect the Plex server Tunearr reads your listening from. You can skip this and add it later in Settings." />
      <PlexAuth plex={plex} />
    </div>
  );
}
