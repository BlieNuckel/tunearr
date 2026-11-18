import { DEFAULT_MUSICBRAINZ } from "@shared/musicbrainzServer";
import MusicBrainzSection from "../sections/integrations/MusicBrainzSection";
import ConnectionResultBanner from "./ConnectionResultBanner";
import { useIntegrations } from "./context";
import useMusicBrainzTest, {
  type MusicBrainzTestResult,
} from "./useMusicBrainzTest";

function bannerText(result: MusicBrainzTestResult): string {
  if (!result.success) return `Connection failed: ${result.error}`;
  return `Connected! ${result.serverUrl} answered in ${result.latencyMs} ms`;
}

export default function MusicBrainzIntegrationPage() {
  const { fields, updateFields } = useIntegrations();
  const settings = fields.musicbrainz ?? DEFAULT_MUSICBRAINZ;
  const test = useMusicBrainzTest(settings);

  return (
    <div className="space-y-6">
      <MusicBrainzSection
        settings={settings}
        onChange={(patch) =>
          updateFields({ musicbrainz: { ...settings, ...patch } })
        }
        testing={test.testing}
        onTest={test.run}
      />

      {test.result && (
        <ConnectionResultBanner
          tone={test.result.success ? "success" : "error"}
        >
          {bannerText(test.result)}
        </ConnectionResultBanner>
      )}
    </div>
  );
}
