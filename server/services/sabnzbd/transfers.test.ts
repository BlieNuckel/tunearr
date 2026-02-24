import { describe, it, expect } from "vitest";
import type { SlskdTransfer, SlskdTransferGroup } from "../../api/slskd/types";
import {
  findMatchingTransfers,
  estimateTimeLeft,
  extractDirectoryName,
} from "./transfers";

function makeTransfer(overrides: Partial<SlskdTransfer> = {}): SlskdTransfer {
  return {
    username: "user1",
    direction: "Download",
    filename: "Music\\track.flac",
    size: 10000000,
    startOffset: 0,
    state: "InProgress",
    bytesTransferred: 5000000,
    averageSpeed: 100000,
    percentComplete: 50,
    id: "t1",
    ...overrides,
  };
}

describe("findMatchingTransfers", () => {
  it("finds transfers matching filenames for the given user", () => {
    const groups: SlskdTransferGroup[] = [
      {
        username: "user1",
        directories: [
          {
            directory: "Music",
            files: [
              makeTransfer({ filename: "Music\\track1.flac" }),
              makeTransfer({ filename: "Music\\track2.flac" }),
            ],
          },
        ],
      },
    ];

    const result = findMatchingTransfers(
      "user1",
      [{ filename: "Music\\track1.flac" }],
      groups
    );

    expect(result).toHaveLength(1);
    expect(result[0].filename).toBe("Music\\track1.flac");
  });

  it("skips transfers from other users", () => {
    const groups: SlskdTransferGroup[] = [
      {
        username: "other-user",
        directories: [
          {
            directory: "Music",
            files: [makeTransfer({ filename: "Music\\track.flac" })],
          },
        ],
      },
    ];

    const result = findMatchingTransfers(
      "user1",
      [{ filename: "Music\\track.flac" }],
      groups
    );

    expect(result).toHaveLength(0);
  });

  it("returns empty array when no matches", () => {
    const result = findMatchingTransfers(
      "user1",
      [{ filename: "no-match" }],
      []
    );
    expect(result).toHaveLength(0);
  });
});

describe("estimateTimeLeft", () => {
  it("estimates time for active downloads", () => {
    const transfers = [
      makeTransfer({
        state: "InProgress",
        size: 10000000,
        bytesTransferred: 5000000,
        averageSpeed: 100000,
      }),
    ];

    const result = estimateTimeLeft(transfers);
    expect(result).toBe("00:00:50");
  });

  it("returns 00:00:00 when no active transfers", () => {
    const transfers = [makeTransfer({ state: "Completed, Succeeded" })];

    expect(estimateTimeLeft(transfers)).toBe("00:00:00");
  });

  it("returns 99:99:99 when speed is zero", () => {
    const transfers = [makeTransfer({ state: "InProgress", averageSpeed: 0 })];

    expect(estimateTimeLeft(transfers)).toBe("99:99:99");
  });
});

describe("extractDirectoryName", () => {
  it("extracts directory name from path with backslashes", () => {
    expect(extractDirectoryName("Music\\Album\\track.flac")).toBe("Album");
  });

  it("extracts directory name from path with forward slashes", () => {
    expect(extractDirectoryName("Music/Album/track.flac")).toBe("Album");
  });

  it("returns filename when no directory", () => {
    expect(extractDirectoryName("track.flac")).toBe("track.flac");
  });

  it("returns top-level directory for shallow paths", () => {
    expect(extractDirectoryName("Album\\track.flac")).toBe("Album");
  });
});
