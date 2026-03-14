import type { MonitorState } from "@/types";

/** Maps the internal useLidarr state to the display-facing MonitorState */
export function getMonitorState(
  lidarrState: string,
  inLibrary: boolean
): MonitorState {
  if (inLibrary) return "already_monitored";
  if (lidarrState === "requesting") return "adding";
  if (lidarrState === "pending") return "success";
  if (
    lidarrState === "idle" ||
    lidarrState === "success" ||
    lidarrState === "already_monitored" ||
    lidarrState === "error"
  )
    return lidarrState as MonitorState;
  return "idle";
}
