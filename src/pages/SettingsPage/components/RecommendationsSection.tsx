import type {
  PromotedAlbumSettings,
  LibraryPreference,
} from "@/context/lidarrContextDef";
import { DEFAULT_PROMOTED_ALBUM } from "@/context/promotedAlbumDefaults";
import TagListEditor from "./TagListEditor";

interface RecommendationsSectionProps {
  config: PromotedAlbumSettings;
  onConfigChange: (config: PromotedAlbumSettings) => void;
}

interface NumberFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  description?: string;
}

const LIBRARY_PREFERENCE_OPTIONS: {
  value: LibraryPreference;
  label: string;
}[] = [
  { value: "prefer_new", label: "Prefer New" },
  { value: "prefer_library", label: "Prefer Library" },
  { value: "no_preference", label: "No Preference" },
];

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  description,
}: NumberFieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
        {label}
      </label>
      <input
        type="number"
        value={value}
        onChange={(e) => {
          const parsed = Number(e.target.value);
          if (!Number.isNaN(parsed)) onChange(Math.max(min, Math.min(max, parsed)));
        }}
        min={min}
        max={max}
        step={step}
        className="w-full px-3 py-2 bg-white dark:bg-gray-800 border-2 border-black rounded-lg text-gray-900 dark:text-gray-100 focus:outline-none focus:border-amber-400 shadow-cartoon-md text-[16px]"
      />
      {description && (
        <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
          {description}
        </p>
      )}
    </div>
  );
}

export default function RecommendationsSection({
  config,
  onConfigChange,
}: RecommendationsSectionProps) {
  const update = <K extends keyof PromotedAlbumSettings>(
    key: K,
    value: PromotedAlbumSettings[K]
  ) => {
    onConfigChange({ ...config, [key]: value });
  };

  const handleReset = () => {
    onConfigChange({ ...DEFAULT_PROMOTED_ALBUM });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
          Recommendations
        </h2>
        <button
          type="button"
          onClick={handleReset}
          className="px-3 py-1.5 text-xs font-bold bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-2 border-black rounded-lg shadow-cartoon-sm hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
        >
          Reset to Defaults
        </button>
      </div>

      <NumberField
        label="Cache Duration (minutes)"
        value={config.cacheDurationMinutes}
        onChange={(v) => update("cacheDurationMinutes", v)}
        min={0}
        max={120}
        step={5}
        description="How long to cache a promoted album before picking a new one. Set to 0 to disable caching."
      />

      <NumberField
        label="Top Artists Count"
        value={config.topArtistsCount}
        onChange={(v) => update("topArtistsCount", v)}
        min={1}
        max={50}
        description="Number of top artists to fetch from Plex for tag analysis."
      />

      <NumberField
        label="Picked Artists Count"
        value={config.pickedArtistsCount}
        onChange={(v) => update("pickedArtistsCount", v)}
        min={1}
        max={config.topArtistsCount}
        description="Number of artists randomly selected (weighted by play count) for tag extraction."
      />

      <NumberField
        label="Tags per Artist"
        value={config.tagsPerArtist}
        onChange={(v) => update("tagsPerArtist", v)}
        min={1}
        max={20}
        description="Maximum number of tags to use per artist after filtering generic tags."
      />

      <div className="grid grid-cols-2 gap-3">
        <NumberField
          label="Deep Page Min"
          value={config.deepPageMin}
          onChange={(v) => {
            const updated = { ...config, deepPageMin: v };
            if (v > config.deepPageMax) updated.deepPageMax = v;
            onConfigChange(updated);
          }}
          min={1}
          max={50}
        />
        <NumberField
          label="Deep Page Max"
          value={config.deepPageMax}
          onChange={(v) => {
            const updated = { ...config, deepPageMax: v };
            if (v < config.deepPageMin) updated.deepPageMin = v;
            onConfigChange(updated);
          }}
          min={1}
          max={50}
        />
      </div>
      <p className="text-gray-400 dark:text-gray-500 text-xs -mt-2">
        Range of Last.fm tag album pages to sample from for variety.
      </p>

      <div>
        <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
          Library Preference
        </label>
        <div className="flex rounded-lg border-2 border-black overflow-hidden shadow-cartoon-sm">
          {LIBRARY_PREFERENCE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => update("libraryPreference", opt.value)}
              className={`flex-1 px-3 py-2 text-sm font-bold transition-colors ${
                config.libraryPreference === opt.value
                  ? "bg-pink-400 text-black"
                  : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-pink-50 dark:hover:bg-gray-700"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
          Whether to prefer albums from new artists, artists already in your
          library, or no preference.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
          Generic Tags (filtered out)
        </label>
        <TagListEditor
          tags={config.genericTags}
          onTagsChange={(tags) => update("genericTags", tags)}
        />
        <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
          Tags that are too generic to be useful for recommendations. These are
          filtered out during tag analysis.
        </p>
      </div>
    </div>
  );
}
