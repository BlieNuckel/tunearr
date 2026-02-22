import { describe, it, expect } from "vitest";
import type { SlskdTransfer } from "./types";
import { mapTransferState, aggregateStatus } from "./statusMap";

function transfer(state: string): SlskdTransfer {
  return { state } as SlskdTransfer;
}

describe("mapTransferState", () => {
  it("maps 'Completed, Succeeded' to Completed", () => {
    expect(mapTransferState("Completed, Succeeded")).toBe("Completed");
  });

  it("maps 'Completed' alone to Completed", () => {
    expect(mapTransferState("Completed")).toBe("Completed");
  });

  it("maps 'Completed, Cancelled' to Failed", () => {
    expect(mapTransferState("Completed, Cancelled")).toBe("Failed");
  });

  it("maps 'Completed, TimedOut' to Failed", () => {
    expect(mapTransferState("Completed, TimedOut")).toBe("Failed");
  });

  it("maps 'Completed, Errored' to Failed", () => {
    expect(mapTransferState("Completed, Errored")).toBe("Failed");
  });

  it("maps 'Completed, Rejected' to Failed", () => {
    expect(mapTransferState("Completed, Rejected")).toBe("Failed");
  });

  it("maps 'InProgress' to Downloading", () => {
    expect(mapTransferState("InProgress")).toBe("Downloading");
  });

  it("maps 'Queued' to Queued", () => {
    expect(mapTransferState("Queued")).toBe("Queued");
  });

  it("maps 'Initializing' to Queued", () => {
    expect(mapTransferState("Initializing")).toBe("Queued");
  });

  it("maps unknown state flags to Queued", () => {
    expect(mapTransferState("SomethingUnexpected")).toBe("Queued");
  });
});

describe("aggregateStatus", () => {
  it("returns Queued for an empty array", () => {
    expect(aggregateStatus([])).toBe("Queued");
  });

  it("returns Completed when all transfers are completed", () => {
    const transfers = [transfer("Completed, Succeeded"), transfer("Completed")];
    expect(aggregateStatus(transfers)).toBe("Completed");
  });

  it("returns Failed when any transfer has failed", () => {
    const transfers = [
      transfer("Completed, Succeeded"),
      transfer("Completed, Errored"),
    ];
    expect(aggregateStatus(transfers)).toBe("Failed");
  });

  it("returns Downloading when any transfer is in progress", () => {
    const transfers = [
      transfer("Completed, Succeeded"),
      transfer("InProgress"),
    ];
    expect(aggregateStatus(transfers)).toBe("Downloading");
  });

  it("returns Queued when any transfer is queued", () => {
    const transfers = [transfer("Completed, Succeeded"), transfer("Queued")];
    expect(aggregateStatus(transfers)).toBe("Queued");
  });

  it("prioritises Failed over Downloading", () => {
    const transfers = [
      transfer("InProgress"),
      transfer("Completed, Cancelled"),
    ];
    expect(aggregateStatus(transfers)).toBe("Failed");
  });

  it("prioritises Downloading over Queued", () => {
    const transfers = [transfer("InProgress"), transfer("Initializing")];
    expect(aggregateStatus(transfers)).toBe("Downloading");
  });
});
