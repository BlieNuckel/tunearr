import { useState } from "react";
import PlaceSearchField from "@/components/PlaceSearchField";
import { describePlace } from "@/utils/describePlace";
import useCurrentPosition from "@/hooks/useCurrentPosition";
import useLivePreferences from "@/hooks/useLivePreferences";
import type { LiveLocation } from "@/types";

const BUTTON_CLASSES =
  "px-3 py-2 text-sm font-bold bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-2 border-black rounded-lg shadow-cartoon-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

const HINT_CLASSES = "text-gray-400 dark:text-gray-500 text-xs";

function describeLocation(location: LiveLocation): string {
  return (
    location.place ?? `${location.lat.toFixed(2)}, ${location.lon.toFixed(2)}`
  );
}

export default function LivePreferencesSection() {
  const { location, loaded, error, saveLocation } = useLivePreferences();
  const { locate, locating, error: locateError } = useCurrentPosition();
  const [saveError, setSaveError] = useState<string | null>(null);

  if (!loaded) return null;

  const save = async (next: LiveLocation | null) => {
    setSaveError(await saveLocation(next));
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
        Live dates
      </h2>

      {error && (
        <p className="text-rose-500 text-xs">Could not load your location</p>
      )}

      <div className="space-y-1">
        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
          My location
        </p>
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {location ? describeLocation(location) : "Not set"}
        </p>
        <p className={HINT_CLASSES}>
          {location
            ? "When an artist you follow tours, the date closest to here leads."
            : "Without a location, an artist's next date leads instead of the closest."}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
        <PlaceSearchField
          onPick={(place) =>
            void save({
              lat: place.latitude,
              lon: place.longitude,
              place: describePlace(place),
            })
          }
        />
        <button
          type="button"
          onClick={() =>
            locate((lat, lon) => void save({ lat, lon, place: null }))
          }
          disabled={locating}
          className={BUTTON_CLASSES}
        >
          {locating ? "Locating…" : "Use my location"}
        </button>
        {location && (
          <button
            type="button"
            onClick={() => void save(null)}
            className={BUTTON_CLASSES}
          >
            Clear
          </button>
        )}
      </div>

      {locateError && <p className="text-rose-500 text-xs">{locateError}</p>}
      {saveError && <p className="text-rose-500 text-xs">{saveError}</p>}
    </div>
  );
}
