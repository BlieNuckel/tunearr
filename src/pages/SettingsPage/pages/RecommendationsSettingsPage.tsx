import { useSettings } from "@/context/useSettings";
import { useAutoSave } from "@/hooks/useAutoSave";
import RecommendationsSection from "../sections/recommendations/RecommendationsSection";
import { DEFAULT_PROMOTED_ALBUM } from "@/context/promotedAlbumDefaults";
import Skeleton from "@/components/Skeleton";
import SaveStatusIndicator from "../shared/SaveStatusIndicator";

export default function RecommendationsSettingsPage() {
  const { settings, isLoading, savePartialSettings } = useSettings();
  const { fields, saveStatus, saveError, updateField } = useAutoSave(
    settings,
    savePartialSettings
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="space-y-4">
            <Skeleton className="h-6 w-48" />
            <div className="space-y-3">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <SaveStatusIndicator status={saveStatus} error={saveError} />
      </div>

      <RecommendationsSection
        config={fields.promotedAlbum ?? DEFAULT_PROMOTED_ALBUM}
        onConfigChange={(updated) => updateField("promotedAlbum", updated)}
      />
    </div>
  );
}
