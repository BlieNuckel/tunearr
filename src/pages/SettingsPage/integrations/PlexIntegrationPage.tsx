import PlexSection from "../sections/integrations/PlexSection";
import { useIntegrations } from "./context";
import usePlexConnection from "@/hooks/usePlexConnection";

export default function PlexIntegrationPage() {
  const { fields, updateField } = useIntegrations();
  const plex = usePlexConnection();

  return (
    <PlexSection
      plex={plex}
      captureEnabled={fields.listeningCaptureEnabled ?? true}
      onCaptureEnabledChange={(enabled) =>
        updateField("listeningCaptureEnabled", enabled)
      }
    />
  );
}
