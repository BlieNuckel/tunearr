import { useState } from "react";
import {
  effectiveMbRequestsPerSecond,
  isPublicMbHost,
  maxMbRequestsPerSecond,
  mbServerUrlError,
  OFFICIAL_MB_ROOT,
  type MusicBrainzSettings,
} from "@shared/musicbrainzServer";

interface MusicBrainzSectionProps {
  settings: MusicBrainzSettings;
  onChange: (patch: Partial<MusicBrainzSettings>) => void;
  testing: boolean;
  onTest: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

const INPUT_CLASSES =
  "w-full sm:w-sm px-3 py-2 bg-white dark:bg-gray-800 border-2 border-black rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-300 dark:placeholder-gray-600 focus:outline-none focus:border-amber-400 shadow-cartoon-md disabled:opacity-60 disabled:cursor-not-allowed";

/**
 * The pace field keeps its own text so it can be cleared while typing; only a
 * number within range is passed up and saved.
 */
function PaceField({
  settings,
  onChange,
}: {
  settings: MusicBrainzSettings;
  onChange: (rps: number) => void;
}) {
  const isPublic = isPublicMbHost(settings.serverUrl);
  const effective = effectiveMbRequestsPerSecond(settings);
  const max = maxMbRequestsPerSecond(settings.serverUrl);
  const [draft, setDraft] = useState(String(effective));
  const [syncedTo, setSyncedTo] = useState(effective);

  if (syncedTo !== effective) {
    setSyncedTo(effective);
    setDraft(String(effective));
  }

  const handleChange = (value: string) => {
    setDraft(value);
    const parsed = Number(value);
    if (value.trim() !== "" && Number.isFinite(parsed) && parsed >= 0) {
      onChange(Math.min(parsed, max));
    }
  };

  return (
    <div>
      <label
        htmlFor="musicbrainz-rps"
        className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1"
      >
        Requests per second
      </label>
      <input
        id="musicbrainz-rps"
        type="number"
        min={0}
        max={max}
        step={0.1}
        value={isPublic ? String(effective) : draft}
        disabled={isPublic}
        onChange={(e) => handleChange(e.target.value)}
        className={INPUT_CLASSES}
      />
      <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
        {isPublic
          ? "The public MusicBrainz server allows 1 request per second. That is MusicBrainz's rule, so it can't be raised."
          : "0 means unpaced. A self-hosted mirror usually has no limit; a shared one may ask you to stay under one."}
      </p>
    </div>
  );
}

export default function MusicBrainzSection({
  settings,
  onChange,
  testing,
  onTest,
}: MusicBrainzSectionProps) {
  const urlError = mbServerUrlError(settings.serverUrl);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
        MusicBrainz
      </h2>
      <div>
        <label
          htmlFor="musicbrainz-url"
          className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1"
        >
          Server URL
        </label>
        <input
          id="musicbrainz-url"
          type="text"
          value={settings.serverUrl}
          onChange={(e) => onChange({ serverUrl: e.target.value })}
          placeholder={OFFICIAL_MB_ROOT}
          aria-invalid={urlError !== null}
          className={INPUT_CLASSES}
        />
        {urlError ? (
          <p role="alert" className="text-rose-500 text-xs mt-1">
            {urlError}
          </p>
        ) : (
          <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
            Leave blank for the public MusicBrainz server. For a mirror, enter
            its root, e.g. http://musicbrainz:5000; /ws/2 is added for you.
            Tunearr never switches servers on its own.
          </p>
        )}
      </div>
      <PaceField
        settings={settings}
        onChange={(requestsPerSecond) => onChange({ requestsPerSecond })}
      />
      <div className="flex flex-wrap gap-3 pt-2">
        <button
          type="button"
          onClick={onTest}
          disabled={testing || urlError !== null}
          className="px-4 py-2 bg-amber-300 hover:bg-amber-200 disabled:opacity-50 text-black font-bold rounded-lg text-sm border-2 border-black shadow-cartoon-sm hover:translate-y-[-1px] hover:shadow-cartoon-md active:translate-y-[1px] active:shadow-cartoon-pressed transition-all"
        >
          {testing ? "Testing..." : "Test Connection"}
        </button>
      </div>
    </div>
  );
}
