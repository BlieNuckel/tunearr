import { useCallback } from "react";
import useAsyncData from "./useAsyncData";
import type { FetchContext } from "./useAsyncData";
import type { SpendingSettings } from "@shared/currency";

async function fetchSpendingSettings({
  signal,
}: FetchContext): Promise<SpendingSettings> {
  const res = await fetch("/api/purchases/spending", { signal });
  if (!res.ok) throw new Error("Failed to load spending settings");
  return res.json();
}

async function patchSpendingSettings(
  patch: Partial<SpendingSettings>
): Promise<{ saved: SpendingSettings } | { error: string }> {
  try {
    const res = await fetch("/api/purchases/spending", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { error: (body as { error?: string }).error ?? "Could not save" };
    }
    return { saved: body as SpendingSettings };
  } catch {
    return { error: "Could not save" };
  }
}

/**
 * The signed-in user's currency and monthly limit. Pass `enabled: false` to
 * hold off the request, e.g. while a modal that needs it is closed.
 */
export default function useSpendingSettings(enabled = true) {
  const { data, loading, error, setData, refresh } =
    useAsyncData<SpendingSettings>(
      enabled ? "spending-settings" : null,
      fetchSpendingSettings
    );

  /** Applies the change at once and reloads the stored value if the server refuses. Resolves to the error, or null. */
  const save = useCallback(
    async (patch: Partial<SpendingSettings>): Promise<string | null> => {
      setData((prev) => ({ ...prev, ...patch }));

      const result = await patchSpendingSettings(patch);
      if ("error" in result) {
        await refresh();
        return result.error;
      }

      setData(() => result.saved);
      return null;
    },
    [setData, refresh]
  );

  return { spending: data, loading, error, save };
}
