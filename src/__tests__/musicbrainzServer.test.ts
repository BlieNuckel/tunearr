import { describe, it, expect } from "vitest";
import {
  effectiveMbRequestsPerSecond,
  isPublicMbHost,
  maxMbRequestsPerSecond,
  mbRequestsPerSecondError,
  mbServerKind,
  mbServerUrlError,
  normalizeMbServerUrl,
  resolveMbServerRoot,
  OFFICIAL_MB_ROOT,
} from "@shared/musicbrainzServer";

describe("normalizeMbServerUrl", () => {
  it("trims whitespace and trailing slashes", () => {
    expect(normalizeMbServerUrl("  http://mb.local:5000//  ")).toBe(
      "http://mb.local:5000"
    );
  });

  it("drops a pasted /ws/2 suffix", () => {
    expect(normalizeMbServerUrl("http://mb.local:5000/ws/2/")).toBe(
      "http://mb.local:5000"
    );
  });

  it("keeps a path prefix the server lives under", () => {
    expect(normalizeMbServerUrl("https://example.com/musicbrainz/")).toBe(
      "https://example.com/musicbrainz"
    );
  });
});

describe("mbServerUrlError", () => {
  it("accepts blank, meaning the public server", () => {
    expect(mbServerUrlError("")).toBeNull();
    expect(mbServerUrlError("   ")).toBeNull();
  });

  it("accepts http and https URLs", () => {
    expect(mbServerUrlError("http://mb.local:5000")).toBeNull();
    expect(mbServerUrlError("https://mb.example.com")).toBeNull();
  });

  it("rejects something that isn't a URL", () => {
    expect(mbServerUrlError("mb.local")).toMatch("full URL");
  });

  it("rejects other protocols", () => {
    expect(mbServerUrlError("ftp://mb.local")).toMatch("http://");
  });
});

describe("resolveMbServerRoot", () => {
  it("falls back to the public server when blank", () => {
    expect(resolveMbServerRoot("")).toBe(OFFICIAL_MB_ROOT);
  });

  it("uses the normalized custom URL", () => {
    expect(resolveMbServerRoot("http://mb.local/ws/2")).toBe("http://mb.local");
  });
});

describe("isPublicMbHost", () => {
  it.each([
    ["", true],
    ["https://musicbrainz.org", true],
    ["https://beta.musicbrainz.org", true],
    ["http://MusicBrainz.org/", true],
    ["http://mb.local:5000", false],
    ["https://notmusicbrainz.org", false],
    ["https://api.brainzmash.cc", false],
  ])("%s → %s", (url, expected) => {
    expect(isPublicMbHost(url)).toBe(expected);
  });

  it("names the kind after it", () => {
    expect(mbServerKind("")).toBe("official");
    expect(mbServerKind("http://mb.local")).toBe("custom");
  });
});

describe("maxMbRequestsPerSecond", () => {
  it("caps the public server at its documented limit", () => {
    expect(maxMbRequestsPerSecond("")).toBe(1);
  });

  it("lets a custom server go higher", () => {
    expect(maxMbRequestsPerSecond("http://mb.local")).toBe(100);
  });
});

describe("effectiveMbRequestsPerSecond", () => {
  it("holds a public host to 1 req/s whatever was saved", () => {
    expect(
      effectiveMbRequestsPerSecond({ serverUrl: "", requestsPerSecond: 10 })
    ).toBe(1);
  });

  it("never leaves a public host unpaced", () => {
    expect(
      effectiveMbRequestsPerSecond({ serverUrl: "", requestsPerSecond: 0 })
    ).toBe(1);
  });

  it("lets a public host go slower", () => {
    expect(
      effectiveMbRequestsPerSecond({ serverUrl: "", requestsPerSecond: 0.5 })
    ).toBe(0.5);
  });

  it("uses the saved pace for a custom server, 0 included", () => {
    expect(
      effectiveMbRequestsPerSecond({
        serverUrl: "http://mb.local",
        requestsPerSecond: 0,
      })
    ).toBe(0);
    expect(
      effectiveMbRequestsPerSecond({
        serverUrl: "http://mb.local",
        requestsPerSecond: 20,
      })
    ).toBe(20);
  });
});

describe("mbRequestsPerSecondError", () => {
  it("accepts 0 and positive numbers up to the cap", () => {
    expect(mbRequestsPerSecondError(0)).toBeNull();
    expect(mbRequestsPerSecondError(1)).toBeNull();
    expect(mbRequestsPerSecondError(100)).toBeNull();
  });

  it("rejects negatives, non-numbers and values past the cap", () => {
    expect(mbRequestsPerSecondError(-1)).toMatch("0 or more");
    expect(mbRequestsPerSecondError("2")).toMatch("0 or more");
    expect(mbRequestsPerSecondError(Number.NaN)).toMatch("0 or more");
    expect(mbRequestsPerSecondError(101)).toMatch("at most 100");
  });
});
