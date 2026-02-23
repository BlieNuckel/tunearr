import { useState, useRef, useCallback, useEffect } from "react";
import type { LidarrSettings } from "@/context/lidarrContextDef";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

type DebounceTimers = Partial<
  Record<keyof LidarrSettings, ReturnType<typeof setTimeout>>
>;

const TEXT_DEBOUNCE_MS = 800;

const IMMEDIATE_FIELDS: Set<keyof LidarrSettings> = new Set([
  "lidarrQualityProfileId",
  "lidarrRootFolderPath",
  "lidarrMetadataProfileId",
  "theme",
]);

function isImmediateField(key: keyof LidarrSettings): boolean {
  return IMMEDIATE_FIELDS.has(key);
}

export function useAutoSave(
  settings: LidarrSettings,
  savePartialSettings: (partial: Partial<LidarrSettings>) => Promise<void>
) {
  const [fields, setFields] = useState<LidarrSettings>(settings);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const timersRef = useRef<DebounceTimers>({});
  const savedTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    setFields(settings);
  }, [settings]);

  const performSave = useCallback(
    async (partial: Partial<LidarrSettings>) => {
      setSaveStatus("saving");
      setSaveError(null);
      try {
        await savePartialSettings(partial);
        setSaveStatus("saved");
        clearTimeout(savedTimerRef.current);
        savedTimerRef.current = setTimeout(() => setSaveStatus("idle"), 2000);
      } catch (err) {
        setSaveStatus("error");
        setSaveError(err instanceof Error ? err.message : "Save failed");
      }
    },
    [savePartialSettings]
  );

  const updateField = useCallback(
    <K extends keyof LidarrSettings>(key: K, value: LidarrSettings[K]) => {
      setFields((prev) => ({ ...prev, [key]: value }));

      const timer = timersRef.current[key];
      if (timer) clearTimeout(timer);

      if (isImmediateField(key)) {
        performSave({ [key]: value });
      } else {
        timersRef.current[key] = setTimeout(() => {
          performSave({ [key]: value });
        }, TEXT_DEBOUNCE_MS);
      }
    },
    [performSave]
  );

  const updateFields = useCallback(
    (partial: Partial<LidarrSettings>) => {
      setFields((prev) => ({ ...prev, ...partial }));
      performSave(partial);
    },
    [performSave]
  );

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      for (const key of Object.keys(timers) as (keyof LidarrSettings)[]) {
        clearTimeout(timers[key]);
      }
      clearTimeout(savedTimerRef.current);
    };
  }, []);

  return { fields, saveStatus, saveError, updateField, updateFields };
}
