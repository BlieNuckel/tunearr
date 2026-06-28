import type {
  PromotedAlbumSettings,
  LibraryPreference,
  TopArtistsRange,
} from "@/context/settingsContextDef";
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

interface PercentFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
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

const TOP_ARTISTS_RANGE_OPTIONS: {
  value: TopArtistsRange;
  label: string;
}[] = [
  { value: "4weeks", label: "4 Weeks" },
  { value: "6months", label: "6 Months" },
  { value: "12months", label: "12 Months" },
  { value: "all", label: "All Time" },
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
          if (!Number.isNaN(parsed))
            onChange(Math.max(min, Math.min(max, parsed)));
        }}
        min={min}
        max={max}
        step={step}
        className="w-full sm:w-xs px-3 py-2 bg-white dark:bg-gray-800 border-2 border-black rounded-lg text-gray-900 dark:text-gray-100 focus:outline-none focus:border-amber-400 shadow-cartoon-md text-[16px]"
      />
      {description && (
        <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
          {description}
        </p>
      )}
    </div>
  );
}

function PercentField({
  label,
  value,
  onChange,
  description,
}: PercentFieldProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">
          {label}
        </label>
        <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
          {Math.round(value * 100)}%
        </span>
      </div>
      <input
        type="range"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        min={0}
        max={1}
        step={0.05}
        className="w-full accent-amber-400"
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
        label="Taste Profile Lifetime (minutes)"
        value={config.profileTtlMinutes}
        onChange={(v) => update("profileTtlMinutes", v)}
        min={0}
        max={10080}
        step={60}
        description="How long your derived taste profile (genre vector) is reused before the expensive Plex + Last.fm rebuild runs again. Longer is cheaper; shorter tracks taste changes faster."
      />

      <div>
        <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
          Listening Window
        </label>
        <div className="flex rounded-lg border-2 border-black overflow-hidden shadow-cartoon-sm">
          {TOP_ARTISTS_RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => update("topArtistsRange", opt.value)}
              className={`flex-1 px-3 py-2 text-sm font-bold transition-colors ${
                config.topArtistsRange === opt.value
                  ? "bg-amber-300 text-black"
                  : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-amber-50 dark:hover:bg-gray-700"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
          How far back to look at your Plex listening when seeding
          recommendations. Shorter windows track your current taste; longer
          windows draw from a wider pool.
        </p>
      </div>

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
                  ? "bg-amber-300 text-black"
                  : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-amber-50 dark:hover:bg-gray-700"
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

      <div className="pt-2 border-t-2 border-dashed border-gray-200 dark:border-gray-700 space-y-4">
        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">
          Exploration
        </h3>

        <PercentField
          label="Exploration mix"
          value={config.explorationRate}
          onChange={(v) => update("explorationRate", v)}
          description="How often a recommendation breaks out of your usual genres (similar vibe, different genre) instead of staying within your taste. 0% never explores; 100% always tries."
        />

        <PercentField
          label="Genre difference threshold"
          value={config.genreOverlapThreshold}
          onChange={(v) => update("genreOverlapThreshold", v)}
          description="Maximum genre overlap a similar artist may share with the seed to still count as 'different genre'. Lower means stricter — more distant genres only."
        />

        <NumberField
          label="Candidates considered"
          value={config.exploreCandidateCount}
          onChange={(v) => update("exploreCandidateCount", v)}
          min={1}
          max={50}
          description="How many similar artists to evaluate per exploration before picking the most genre-distant one."
        />
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
