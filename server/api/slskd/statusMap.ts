import type { SlskdTransfer } from "./types";

type SabnzbdStatus = "Downloading" | "Queued" | "Paused" | "Completed" | "Failed";

export function mapTransferState(stateFlags: string): SabnzbdStatus {
  const flags = stateFlags.split(", ").map((s) => s.trim());

  if (flags.some((f) => f === "Completed" && flags.includes("Succeeded"))) {
    return "Completed";
  }
  if (flags.includes("Completed")) {
    if (flags.includes("Cancelled") || flags.includes("TimedOut") || flags.includes("Errored") || flags.includes("Rejected")) {
      return "Failed";
    }
    return "Completed";
  }
  if (flags.includes("InProgress")) return "Downloading";
  if (flags.includes("Queued") || flags.includes("Initializing")) return "Queued";

  return "Queued";
}

export function aggregateStatus(transfers: SlskdTransfer[]): SabnzbdStatus {
  if (transfers.length === 0) return "Queued";

  const statuses = transfers.map((t) => mapTransferState(t.state));

  if (statuses.every((s) => s === "Completed")) return "Completed";
  if (statuses.some((s) => s === "Failed")) return "Failed";
  if (statuses.some((s) => s === "Downloading")) return "Downloading";
  if (statuses.some((s) => s === "Queued")) return "Queued";

  return "Completed";
}
