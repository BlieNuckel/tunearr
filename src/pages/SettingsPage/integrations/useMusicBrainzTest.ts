import { useCallback, useState } from "react";
import type { MusicBrainzSettings } from "@shared/musicbrainzServer";
import type { ConnectionTest } from "./context";

export type MusicBrainzTestResult = {
  success: boolean;
  serverUrl?: string;
  latencyMs?: number;
  error?: string;
};

async function postTest(
  settings: MusicBrainzSettings
): Promise<MusicBrainzTestResult> {
  const res = await fetch("/api/settings/test-musicbrainz", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(settings),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return {
      success: false,
      error: data.error ?? `Test failed (${res.status})`,
    };
  }
  return data as MusicBrainzTestResult;
}

/** Tests the server and pace as typed, so a test doesn't wait on the debounced save. */
export default function useMusicBrainzTest(
  settings: MusicBrainzSettings
): ConnectionTest<MusicBrainzTestResult> {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<MusicBrainzTestResult | null>(null);

  const run = useCallback(
    async (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      setTesting(true);
      setResult(null);

      try {
        setResult(await postTest(settings));
      } catch (err) {
        setResult({
          success: false,
          error: err instanceof Error ? err.message : "Test failed",
        });
      } finally {
        setTesting(false);
      }
    },
    [settings]
  );

  return { testing, result, run: (e) => void run(e) };
}
