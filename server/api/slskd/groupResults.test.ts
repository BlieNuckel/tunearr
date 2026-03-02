import { describe, it, expect } from "vitest";
import type { SlskdSearchResponse, SlskdFile } from "./types";
import { groupSearchResults } from "./groupResults";

function makeFile(filename: string, overrides?: Partial<SlskdFile>): SlskdFile {
  return { filename, size: 10_000_000, ...overrides };
}

function makeResponse(
  username: string,
  files: SlskdFile[],
  overrides?: Partial<SlskdSearchResponse>
): SlskdSearchResponse {
  return {
    username,
    hasFreeUploadSlot: true,
    uploadSpeed: 100_000,
    fileCount: files.length,
    files,
    lockedFileCount: 0,
    lockedFiles: [],
    ...overrides,
  };
}

describe("groupSearchResults", () => {
  it("returns empty array for empty input", () => {
    expect(groupSearchResults([])).toEqual([]);
  });

  it("returns empty array when response has no files", () => {
    const response = makeResponse("user1", []);
    expect(groupSearchResults([response])).toEqual([]);
  });

  it("groups files by username and directory", () => {
    const response = makeResponse("user1", [
      makeFile("C:\\Music\\Album A\\01 - Track.flac"),
      makeFile("C:\\Music\\Album A\\02 - Track.flac"),
      makeFile("C:\\Music\\Album B\\01 - Track.flac"),
    ]);

    const results = groupSearchResults([response]);

    expect(results).toHaveLength(2);

    const albumA = results.find((r) => r.directory === "C:\\Music\\Album A");
    const albumB = results.find((r) => r.directory === "C:\\Music\\Album B");

    expect(albumA).toBeDefined();
    expect(albumA!.files).toHaveLength(2);
    expect(albumA!.username).toBe("user1");

    expect(albumB).toBeDefined();
    expect(albumB!.files).toHaveLength(1);
  });

  it("groups files from different responses by username", () => {
    const response1 = makeResponse("user1", [
      makeFile("C:\\Music\\Album\\01.flac"),
    ]);
    const response2 = makeResponse("user2", [
      makeFile("C:\\Music\\Album\\01.flac"),
    ]);

    const results = groupSearchResults([response1, response2]);

    expect(results).toHaveLength(2);
    expect(results.map((r) => r.username).sort()).toEqual(["user1", "user2"]);
  });

  it("filters out non-audio files", () => {
    const response = makeResponse("user1", [
      makeFile("C:\\Music\\Album\\01 - Track.flac"),
      makeFile("C:\\Music\\Album\\cover.jpg"),
      makeFile("C:\\Music\\Album\\info.nfo"),
      makeFile("C:\\Music\\Album\\notes.txt"),
      makeFile("C:\\Music\\Album\\02 - Track.mp3"),
    ]);

    const results = groupSearchResults([response]);

    expect(results).toHaveLength(1);
    expect(results[0].files).toHaveLength(2);
    expect(results[0].files.map((f) => f.filename)).toEqual([
      "C:\\Music\\Album\\01 - Track.flac",
      "C:\\Music\\Album\\02 - Track.mp3",
    ]);
  });

  it("excludes directories that contain only non-audio files", () => {
    const response = makeResponse("user1", [
      makeFile("C:\\Music\\Scans\\front.jpg"),
      makeFile("C:\\Music\\Scans\\back.jpg"),
    ]);

    expect(groupSearchResults([response])).toEqual([]);
  });

  it("categorizes all-FLAC directories as 3040 (lossless)", () => {
    const response = makeResponse("user1", [
      makeFile("C:\\Music\\Album\\01.flac"),
      makeFile("C:\\Music\\Album\\02.flac"),
    ]);

    const results = groupSearchResults([response]);
    expect(results[0].category).toBe(3040);
    expect(results[0].formatTag).toBe("FLAC");
  });

  it("categorizes other lossless formats as 3040", () => {
    const response = makeResponse("user1", [
      makeFile("D:\\Audio\\Album\\01.ape"),
      makeFile("D:\\Audio\\Album\\02.ape"),
      makeFile("D:\\Audio\\Album\\03.ape"),
    ]);

    const results = groupSearchResults([response]);
    expect(results[0].category).toBe(3040);
    expect(results[0].formatTag).toBe("APE");
  });

  it("tags FLAC 24bit when bitDepth >= 24", () => {
    const response = makeResponse("user1", [
      makeFile("C:\\Music\\Album\\01.flac", { bitDepth: 24 }),
      makeFile("C:\\Music\\Album\\02.flac", { bitDepth: 24 }),
    ]);

    const results = groupSearchResults([response]);
    expect(results[0].category).toBe(3040);
    expect(results[0].formatTag).toBe("FLAC 24bit");
  });

  it("categorizes all-MP3 directories as 3010", () => {
    const response = makeResponse("user1", [
      makeFile("C:\\Music\\Album\\01.mp3", { bitRate: 320 }),
      makeFile("C:\\Music\\Album\\02.mp3", { bitRate: 320 }),
    ]);

    const results = groupSearchResults([response]);
    expect(results[0].category).toBe(3010);
    expect(results[0].formatTag).toBe("MP3-320");
  });

  it("formats MP3 without bitrate as plain MP3", () => {
    const response = makeResponse("user1", [
      makeFile("C:\\Music\\Album\\01.mp3"),
      makeFile("C:\\Music\\Album\\02.mp3"),
    ]);

    const results = groupSearchResults([response]);
    expect(results[0].category).toBe(3010);
    expect(results[0].formatTag).toBe("MP3");
  });

  it("categorizes mixed audio directories as 3000", () => {
    const response = makeResponse("user1", [
      makeFile("C:\\Music\\Album\\01.flac"),
      makeFile("C:\\Music\\Album\\02.mp3"),
    ]);

    const results = groupSearchResults([response]);
    expect(results[0].category).toBe(3000);
  });

  it("categorizes non-lossless non-MP3 audio as 3000 with format tag", () => {
    const response = makeResponse("user1", [
      makeFile("C:\\Music\\Album\\01.ogg"),
      makeFile("C:\\Music\\Album\\02.ogg"),
    ]);

    const results = groupSearchResults([response]);
    expect(results[0].category).toBe(3000);
    expect(results[0].formatTag).toBe("OGG");
  });

  it("sorts results with free upload slots first", () => {
    const freeSlot = makeResponse(
      "free-user",
      [makeFile("C:\\Music\\Album1\\01.flac")],
      { hasFreeUploadSlot: true, uploadSpeed: 50_000 }
    );
    const noFreeSlot = makeResponse(
      "busy-user",
      [makeFile("C:\\Music\\Album2\\01.flac")],
      { hasFreeUploadSlot: false, uploadSpeed: 500_000 }
    );

    const results = groupSearchResults([noFreeSlot, freeSlot]);

    expect(results[0].username).toBe("free-user");
    expect(results[1].username).toBe("busy-user");
  });

  it("sorts by upload speed descending within same slot status", () => {
    const slow = makeResponse(
      "slow-user",
      [makeFile("C:\\Music\\Album1\\01.flac")],
      { uploadSpeed: 10_000 }
    );
    const fast = makeResponse(
      "fast-user",
      [makeFile("C:\\Music\\Album2\\01.flac")],
      { uploadSpeed: 500_000 }
    );
    const medium = makeResponse(
      "medium-user",
      [makeFile("C:\\Music\\Album3\\01.flac")],
      { uploadSpeed: 100_000 }
    );

    const results = groupSearchResults([slow, fast, medium]);

    expect(results.map((r) => r.username)).toEqual([
      "fast-user",
      "medium-user",
      "slow-user",
    ]);
  });

  it("computes average bitRate from files that have bitRate", () => {
    const response = makeResponse("user1", [
      makeFile("C:\\Music\\Album\\01.mp3", { bitRate: 320 }),
      makeFile("C:\\Music\\Album\\02.mp3", { bitRate: 256 }),
      makeFile("C:\\Music\\Album\\03.mp3"),
    ]);

    const results = groupSearchResults([response]);
    expect(results[0].bitRate).toBe(288);
  });

  it("returns bitRate 0 when no files have bitRate", () => {
    const response = makeResponse("user1", [
      makeFile("C:\\Music\\Album\\01.flac"),
      makeFile("C:\\Music\\Album\\02.flac"),
    ]);

    const results = groupSearchResults([response]);
    expect(results[0].bitRate).toBe(0);
  });

  it("computes totalSize as sum of all file sizes", () => {
    const response = makeResponse("user1", [
      makeFile("C:\\Music\\Album\\01.flac", { size: 30_000_000 }),
      makeFile("C:\\Music\\Album\\02.flac", { size: 25_000_000 }),
    ]);

    const results = groupSearchResults([response]);
    expect(results[0].totalSize).toBe(55_000_000);
  });

  it("generates a guid for each result", () => {
    const response = makeResponse("user1", [
      makeFile("C:\\Music\\Album\\01.flac"),
    ]);

    const results = groupSearchResults([response]);
    expect(results[0].guid).toBeDefined();
    expect(typeof results[0].guid).toBe("string");
    expect(results[0].guid.length).toBeGreaterThan(0);
  });
});
