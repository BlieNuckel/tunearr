import { useEffect } from "react";
import type { SectionStatus } from "./types";

/** Raw data lifecycle flags from a section's data hook. */
export type SectionDataState = {
  loading: boolean;
  error: boolean;
  empty: boolean;
};

export function deriveSectionStatus(state: SectionDataState): SectionStatus {
  if (state.loading) return "loading";
  if (state.error) return "error";
  if (state.empty) return "empty";
  return "ready";
}

/**
 * Report a section's data lifecycle to its grid slot. Call once per section
 * component with the flags from its data hook.
 */
export default function useReportSectionStatus(
  onStatusChange: (status: SectionStatus) => void,
  state: SectionDataState
): void {
  const status = deriveSectionStatus(state);

  useEffect(() => {
    onStatusChange(status);
  }, [onStatusChange, status]);
}
