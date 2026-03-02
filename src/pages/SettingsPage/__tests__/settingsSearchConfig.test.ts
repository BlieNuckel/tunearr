import { filterSections, SECTION_META } from "../settingsSearchConfig";

describe("filterSections", () => {
  it("returns empty array for empty query", () => {
    expect(filterSections("")).toEqual([]);
    expect(filterSections("   ")).toEqual([]);
  });

  it("matches by label", () => {
    const result = filterSections("Theme");
    expect(result).toContain("theme");
  });

  it("matches by keyword", () => {
    const result = filterSections("dark");
    expect(result).toContain("theme");
  });

  it("matches case insensitively", () => {
    const result = filterSections("LIDARR");
    expect(result).toContain("lidarrConnection");
    expect(result).toContain("lidarrOptions");
  });

  it("matches plex section", () => {
    const result = filterSections("plex");
    expect(result).toContain("plex");
  });

  it("matches slskd by soulseek keyword", () => {
    const result = filterSections("soulseek");
    expect(result).toContain("slskd");
  });

  it("matches account section by logout keyword", () => {
    const result = filterSections("logout");
    expect(result).toContain("account");
  });

  it("matches account section by label", () => {
    const result = filterSections("account");
    expect(result).toContain("account");
  });

  it("returns no matches for gibberish", () => {
    expect(filterSections("zzzzzzz")).toEqual([]);
  });
});

describe("SECTION_META", () => {
  it("assigns theme to general tab", () => {
    expect(SECTION_META.theme.tab).toBe("general");
  });

  it("assigns import to general tab", () => {
    expect(SECTION_META.import.tab).toBe("general");
  });

  it("assigns lidarrConnection to integrations tab", () => {
    expect(SECTION_META.lidarrConnection.tab).toBe("integrations");
  });

  it("assigns account to general tab", () => {
    expect(SECTION_META.account.tab).toBe("general");
  });

  it("assigns plex to integrations tab", () => {
    expect(SECTION_META.plex.tab).toBe("integrations");
  });
});
