import type { PurchaseContext } from "@/hooks/usePurchaseContext";
import { InformationCircleIcon, HeartIcon } from "@/components/icons";
import Spinner from "@/components/Spinner";

type ProgressEvent = {
  step: string;
  detail?: string;
};

interface PurchaseDecisionBannerProps {
  context: PurchaseContext | null;
  loading: boolean;
  progress: ProgressEvent | null;
}

function BannerLoading({ progress }: { progress: ProgressEvent | null }) {
  return (
    <div
      data-testid="purchase-banner-loading"
      className="rounded-xl border-2 border-gray-200 dark:border-gray-700 p-3"
    >
      <div className="flex items-center gap-2">
        <Spinner className="w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0" />
        <div className="min-w-0">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {progress?.step ?? "Loading…"}
          </p>
          {progress?.detail && (
            <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
              {progress.detail}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

const BANNER_STYLES = {
  request: {
    border: "border-blue-300 dark:border-blue-700",
    bg: "bg-blue-50 dark:bg-blue-900/20",
    heading: "text-blue-800 dark:text-blue-200",
    text: "text-blue-600 dark:text-blue-400",
    icon: "text-blue-500",
  },
  buy: {
    border: "border-emerald-300 dark:border-emerald-700",
    bg: "bg-emerald-50 dark:bg-emerald-900/20",
    heading: "text-emerald-800 dark:text-emerald-200",
    text: "text-emerald-600 dark:text-emerald-400",
    icon: "text-emerald-500",
  },
} as const;

export default function PurchaseDecisionBanner({
  context,
  loading,
  progress,
}: PurchaseDecisionBannerProps) {
  if (loading) {
    return <BannerLoading progress={progress} />;
  }

  if (!context || context.recommendation === "neutral") {
    return null;
  }

  const decidingSignal = [...context.signals]
    .reverse()
    .find((s) => s.recommendation === context.recommendation);
  if (!decidingSignal) return null;

  const style = BANNER_STYLES[context.recommendation];
  const Icon =
    context.recommendation === "request" ? InformationCircleIcon : HeartIcon;

  return (
    <div
      data-testid={`purchase-banner-${context.recommendation}`}
      className={`rounded-xl border-2 ${style.border} ${style.bg} p-3`}
    >
      <div className="flex items-start gap-2">
        <Icon className={`w-5 h-5 ${style.icon} shrink-0 mt-0.5`} />
        <div>
          <p className={`text-sm font-bold ${style.heading}`}>
            {context.recommendation === "request"
              ? "Consider requesting"
              : "Consider purchasing"}
          </p>
          <p className={`text-xs ${style.text} mt-0.5`}>
            {decidingSignal.reason}
          </p>
        </div>
      </div>
    </div>
  );
}
