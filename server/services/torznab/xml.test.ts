import { describe, it, expect } from "vitest";
import type { GroupedSearchResult } from "../../api/slskd/types";
import {
  escapeXml,
  buildCapsXml,
  buildTestResultXml,
  buildResultsXml,
} from "./xml";

describe("escapeXml", () => {
  it("escapes all XML special characters", () => {
    expect(escapeXml("a & b < c > d \" e ' f")).toBe(
      "a &amp; b &lt; c &gt; d &quot; e &apos; f"
    );
  });

  it("returns plain string unchanged", () => {
    expect(escapeXml("hello world")).toBe("hello world");
  });
});

describe("buildCapsXml", () => {
  it("returns valid caps XML with categories", () => {
    const xml = buildCapsXml();
    expect(xml).toContain("<caps>");
    expect(xml).toContain('id="3000"');
    expect(xml).toContain('id="3010"');
    expect(xml).toContain('id="3040"');
    expect(xml).toContain("music-search");
  });
});

describe("buildTestResultXml", () => {
  it("returns RSS with test item", () => {
    const xml = buildTestResultXml();
    expect(xml).toContain("<rss");
    expect(xml).toContain("<item>");
    expect(xml).toContain("slskd indexer test");
    expect(xml).toContain('value="3000"');
  });
});

describe("buildResultsXml", () => {
  it("returns RSS with items and newznab:response", () => {
    const results: GroupedSearchResult[] = [
      {
        guid: "abc123",
        username: "user1",
        directory: "Music\\Radiohead\\OK Computer",
        files: [{ filename: "01.flac", size: 30000000 }],
        totalSize: 30000000,
        hasFreeUploadSlot: true,
        uploadSpeed: 1000,
        bitRate: 320,
        category: 3040,
        formatTag: "FLAC",
      },
    ];

    const xml = buildResultsXml(results, 1, 0, "http://localhost:3001");

    expect(xml).toContain("<rss");
    expect(xml).toContain('offset="0" total="1"');
    expect(xml).toContain("<item>");
    expect(xml).toContain("Radiohead - OK Computer [FLAC]");
    expect(xml).toContain('value="3040"');
    expect(xml).toContain("http://localhost:3001/api/torznab/download/abc123");
  });

  it("omits bitrate attr when bitRate is 0", () => {
    const results: GroupedSearchResult[] = [
      {
        guid: "abc",
        username: "u",
        directory: "Music\\Album",
        files: [{ filename: "a.flac", size: 1000 }],
        totalSize: 1000,
        hasFreeUploadSlot: true,
        uploadSpeed: 100,
        bitRate: 0,
        category: 3040,
        formatTag: "FLAC",
      },
    ];

    const xml = buildResultsXml(results, 1, 0, "http://localhost:3001");
    expect(xml).not.toContain("audio:bitrate");
  });
});
