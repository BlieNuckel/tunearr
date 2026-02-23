import type { SettingsTab } from "./components/SettingsTabs";

export type SettingsSection =
  | "theme"
  | "import"
  | "lidarrConnection"
  | "lidarrOptions"
  | "lastfm"
  | "plex"
  | "slskd"
  | "recommendations";

type SectionMeta = {
  label: string;
  tab: SettingsTab;
  keywords: string[];
};

export const SECTION_META: Record<SettingsSection, SectionMeta> = {
  theme: {
    label: "Theme",
    tab: "general",
    keywords: ["theme", "dark", "light", "mode", "appearance", "system"],
  },
  import: {
    label: "Manual Import",
    tab: "general",
    keywords: ["import", "path", "upload", "file", "manual"],
  },
  lidarrConnection: {
    label: "Lidarr Connection",
    tab: "integrations",
    keywords: ["lidarr", "url", "api", "key", "connection", "test"],
  },
  lidarrOptions: {
    label: "Lidarr Options",
    tab: "integrations",
    keywords: [
      "lidarr",
      "quality",
      "profile",
      "root",
      "folder",
      "metadata",
      "path",
    ],
  },
  lastfm: {
    label: "Last.fm",
    tab: "integrations",
    keywords: ["lastfm", "last.fm", "scrobble", "api", "key"],
  },
  plex: {
    label: "Plex",
    tab: "integrations",
    keywords: ["plex", "media", "server", "login", "token"],
  },
  slskd: {
    label: "slskd",
    tab: "integrations",
    keywords: ["slskd", "soulseek", "download", "api", "key", "path"],
  },
  recommendations: {
    label: "Recommendations",
    tab: "recommendations",
    keywords: [
      "recommendation",
      "promoted",
      "algorithm",
      "cache",
      "tags",
      "discovery",
      "artist",
      "library",
      "preference",
      "generic",
    ],
  },
};

export function filterSections(query: string): SettingsSection[] {
  if (!query.trim()) return [];

  const lower = query.toLowerCase();
  return (Object.keys(SECTION_META) as SettingsSection[]).filter((section) => {
    const meta = SECTION_META[section];
    return (
      meta.label.toLowerCase().includes(lower) ||
      meta.keywords.some((kw) => kw.includes(lower))
    );
  });
}
