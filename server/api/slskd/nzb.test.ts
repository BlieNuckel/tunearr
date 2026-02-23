import { describe, it, expect } from "vitest";
import type { NzbMetadata } from "./types";
import { encodeNzb, decodeNzb } from "./nzb";

const sampleMetadata: NzbMetadata = {
  username: "testuser",
  files: [
    { filename: "01 - Track One.flac", size: 30_000_000 },
    { filename: "02 - Track Two.flac", size: 25_000_000 },
  ],
};

describe("encodeNzb", () => {
  it("produces valid XML with the title and a base64-encoded slskd meta tag", () => {
    const xml = encodeNzb("My Album", sampleMetadata);

    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain('<meta type="title">My Album</meta>');
    expect(xml).toContain('<meta type="slskd">');

    const match = xml.match(/<meta type="slskd">([^<]+)<\/meta>/);
    expect(match).not.toBeNull();

    const decoded = JSON.parse(
      Buffer.from(match![1], "base64").toString("utf-8")
    );
    expect(decoded).toEqual(sampleMetadata);
  });

  it("escapes XML special characters in the title", () => {
    const xml = encodeNzb('Rock & Roll <Live> "2024"', sampleMetadata);

    expect(xml).toContain(
      '<meta type="title">Rock &amp; Roll &lt;Live&gt; &quot;2024&quot;</meta>'
    );
    expect(xml).toContain(
      'subject="Rock &amp; Roll &lt;Live&gt; &quot;2024&quot;"'
    );
    expect(xml).not.toContain("Rock & Roll <Live>");
  });
});

describe("decodeNzb", () => {
  it("round-trips: encoding then decoding returns the original metadata", () => {
    const xml = encodeNzb("Test Album", sampleMetadata);
    const result = decodeNzb(xml);

    expect(result).toEqual(sampleMetadata);
  });

  it("round-trips with a single file", () => {
    const metadata: NzbMetadata = {
      username: "another_user",
      files: [{ filename: "song.mp3", size: 5_000_000 }],
    };

    const xml = encodeNzb("Single Track", metadata);
    expect(decodeNzb(xml)).toEqual(metadata);
  });

  it("throws when the XML has no slskd meta tag", () => {
    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<nzb xmlns="http://www.newzbin.com/DTD/2003/nzb">',
      "  <head>",
      '    <meta type="title">No slskd here</meta>',
      "  </head>",
      "</nzb>",
    ].join("\n");

    expect(() => decodeNzb(xml)).toThrow("NZB does not contain slskd metadata");
  });

  it("throws when given completely unrelated XML", () => {
    expect(() => decodeNzb("<root><child /></root>")).toThrow(
      "NZB does not contain slskd metadata"
    );
  });
});
