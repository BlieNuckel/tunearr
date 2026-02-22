import { Navigate } from "react-router-dom";
import { useLidarrContext } from "@/context/useLidarrContext";
import { useOnboarding } from "@/hooks/useOnboarding";
import WizardShell from "./components/WizardShell";
import WelcomeStep from "./steps/WelcomeStep";
import LidarrConnectionStep from "./steps/LidarrConnectionStep";
import LidarrOptionsStep from "./steps/LidarrOptionsStep";
import LastfmStep from "./steps/LastfmStep";
import PlexStep from "./steps/PlexStep";
import ImportStep from "./steps/ImportStep";
import CompleteStep from "./steps/CompleteStep";

export default function OnboardingPage() {
  const { settings, isLoading } = useLidarrContext();
  const wizard = useOnboarding();

  if (isLoading) return null;
  if (settings.lidarrUrl) return <Navigate to="/" replace />;

  const showNav =
    wizard.currentStep !== "welcome" && wizard.currentStep !== "complete";

  const getNextDisabled = () => {
    if (wizard.currentStep === "lidarrConnection") {
      return !wizard.testResult?.success;
    }
    if (wizard.currentStep === "lidarrOptions") {
      return !wizard.fields.rootFolderPath || !wizard.fields.qualityProfileId;
    }
    return false;
  };

  return (
    <WizardShell
      stepIndex={wizard.stepIndex}
      currentStep={wizard.currentStep}
      isOptional={wizard.isOptional}
      onBack={wizard.back}
      onNext={wizard.next}
      onSkip={wizard.isOptional ? wizard.skip : undefined}
      nextDisabled={getNextDisabled() || wizard.validating}
      nextLoading={wizard.validating}
      showNav={showNav}
    >
      {wizard.currentStep === "welcome" && (
        <WelcomeStep onGetStarted={wizard.next} />
      )}
      {wizard.currentStep === "lidarrConnection" && (
        <LidarrConnectionStep
          url={wizard.fields.lidarrUrl}
          apiKey={wizard.fields.lidarrApiKey}
          testing={wizard.testing}
          testResult={wizard.testResult}
          onUrlChange={(v) => wizard.updateField("lidarrUrl", v)}
          onApiKeyChange={(v) => wizard.updateField("lidarrApiKey", v)}
          onTest={wizard.handleTestConnection}
        />
      )}
      {wizard.currentStep === "lidarrOptions" && (
        <LidarrOptionsStep
          qualityProfiles={wizard.testResult?.qualityProfiles ?? []}
          qualityProfileId={wizard.fields.qualityProfileId}
          metadataProfiles={wizard.testResult?.metadataProfiles ?? []}
          metadataProfileId={wizard.fields.metadataProfileId}
          rootFolderPaths={wizard.testResult?.rootFolderPaths ?? []}
          rootFolderPath={wizard.fields.rootFolderPath}
          onQualityProfileChange={(v) =>
            wizard.updateField("qualityProfileId", v)
          }
          onMetadataProfileChange={(v) =>
            wizard.updateField("metadataProfileId", v)
          }
          onRootFolderChange={(v) => wizard.updateField("rootFolderPath", v)}
        />
      )}
      {wizard.currentStep === "lastfm" && (
        <LastfmStep
          apiKey={wizard.fields.lastfmApiKey}
          onApiKeyChange={(v) => wizard.updateField("lastfmApiKey", v)}
        />
      )}
      {wizard.currentStep === "plex" && (
        <PlexStep
          token={wizard.fields.plexToken}
          onUrlChange={(v) => wizard.updateField("plexUrl", v)}
          onTokenChange={(v) => wizard.updateField("plexToken", v)}
        />
      )}
      {wizard.currentStep === "import" && (
        <ImportStep
          importPath={wizard.fields.importPath}
          onImportPathChange={(v) => wizard.updateField("importPath", v)}
        />
      )}
      {wizard.currentStep === "complete" && (
        <CompleteStep saving={wizard.saving} onFinish={wizard.handleFinish} />
      )}
      {wizard.error && (
        <div className="mt-4 p-3 rounded-md text-sm bg-red-900/30 text-red-400 border border-red-800">
          {wizard.error}
        </div>
      )}
    </WizardShell>
  );
}
