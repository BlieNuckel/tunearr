import type { ReactNode } from "react";
import type { StepId } from "@/hooks/useOnboarding";
import { STEPS } from "@/hooks/useOnboarding";

interface WizardShellProps {
  stepIndex: number;
  currentStep: StepId;
  isOptional: boolean;
  children: ReactNode;
  onBack: () => void;
  onNext: () => void;
  onSkip?: () => void;
  nextDisabled?: boolean;
  nextLabel?: string;
  nextLoading?: boolean;
  showNav?: boolean;
}

const STEP_LABELS: Record<StepId, string> = {
  welcome: "Welcome",
  lidarrConnection: "Lidarr Connection",
  lidarrOptions: "Lidarr Options",
  lastfm: "Last.fm",
  plex: "Plex",
  import: "Import Path",
  complete: "Complete",
};

export default function WizardShell({
  stepIndex,
  currentStep,
  isOptional,
  children,
  onBack,
  onNext,
  onSkip,
  nextDisabled = false,
  nextLabel = "Next",
  nextLoading = false,
  showNav = true,
}: WizardShellProps) {
  return (
    <div className="min-h-screen bg-amber-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="flex gap-1 mb-8">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-2 flex-1 rounded-full border-2 border-black ${
                i <= stepIndex ? "bg-amber-300" : "bg-white"
              }`}
            />
          ))}
        </div>

        <div className="bg-white rounded-xl p-6 border-2 border-black shadow-cartoon-lg">
          <p className="text-sm text-gray-500 mb-1">
            Step {stepIndex + 1} of {STEPS.length}
            {isOptional && " (Optional)"}
          </p>
          <h2 className="text-xl font-bold text-gray-900 mb-6">
            {STEP_LABELS[currentStep]}
          </h2>

          {children}

          {showNav && (
            <div className="flex justify-between mt-6">
              <button
                type="button"
                onClick={onBack}
                disabled={stepIndex === 0}
                className="px-4 py-2 text-sm text-gray-400 hover:text-gray-900 disabled:opacity-30 transition-colors"
              >
                Back
              </button>
              <div className="flex gap-2">
                {isOptional && onSkip && (
                  <button
                    type="button"
                    onClick={onSkip}
                    className="px-4 py-2 text-sm text-gray-400 hover:text-gray-900 transition-colors"
                  >
                    Skip
                  </button>
                )}
                <button
                  type="button"
                  onClick={onNext}
                  disabled={nextDisabled || nextLoading}
                  className="px-4 py-2 bg-amber-300 hover:bg-amber-200 disabled:opacity-50 text-black font-bold rounded-lg text-sm border-2 border-black shadow-cartoon-sm hover:translate-y-[-1px] hover:shadow-cartoon-md active:translate-y-[1px] active:shadow-cartoon-pressed transition-all"
                >
                  {nextLoading ? "Checking..." : nextLabel}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
