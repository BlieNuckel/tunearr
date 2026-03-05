import { hasPermission, Permission } from "@shared/permissions";

export type SettingsTab = "general" | "integrations" | "recommendations" | "admin";

export const TAB_LABELS: Record<SettingsTab, string> = {
  general: "General",
  integrations: "Integrations",
  recommendations: "Recommendations",
  admin: "Users",
};

export type SettingsSection =
  | "account"
  | "theme"
  | "import"
  | "lidarrConnection"
  | "lidarrOptions"
  | "lastfm"
  | "plex"
  | "slskd"
  | "recommendations"
  | "users";

type SectionMeta = {
  label: string;
  tab: SettingsTab;
  keywords: string[];
  permission?: Permission;
};

export const SECTION_META: Record<SettingsSection, SectionMeta> = {
  account: {
    label: "Account",
    tab: "general",
    keywords: [
      "account",
      "user",
      "logout",
      "sign out",
      "username",
      "permissions",
    ],
  },
  theme: {
    label: "Theme",
    tab: "general",
    keywords: ["theme", "dark", "light", "mode", "appearance", "system"],
  },
  import: {
    label: "Manual Import",
    tab: "general",
    keywords: ["import", "path", "upload", "file", "manual"],
    permission: Permission.ADMIN,
  },
  lidarrConnection: {
    label: "Lidarr Connection",
    tab: "integrations",
    keywords: ["lidarr", "url", "api", "key", "connection", "test"],
    permission: Permission.ADMIN,
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
    permission: Permission.ADMIN,
  },
  lastfm: {
    label: "Last.fm",
    tab: "integrations",
    keywords: ["lastfm", "last.fm", "scrobble", "api", "key"],
    permission: Permission.ADMIN,
  },
  plex: {
    label: "Plex",
    tab: "integrations",
    keywords: ["plex", "media", "server", "login", "token"],
    permission: Permission.ADMIN,
  },
  slskd: {
    label: "slskd",
    tab: "integrations",
    keywords: ["slskd", "soulseek", "download", "api", "key", "path"],
    permission: Permission.ADMIN,
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
    permission: Permission.ADMIN,
  },
  users: {
    label: "User Management",
    tab: "admin",
    keywords: [
      "user",
      "users",
      "manage",
      "admin",
      "permission",
      "create",
      "delete",
      "role",
    ],
    permission: Permission.MANAGE_USERS,
  },
};

export function filterSections(
  query: string,
  userPermissions?: number
): SettingsSection[] {
  if (!query.trim()) return [];

  const lower = query.toLowerCase();
  return (Object.keys(SECTION_META) as SettingsSection[]).filter((section) => {
    const meta = SECTION_META[section];
    if (
      meta.permission !== undefined &&
      userPermissions !== undefined &&
      !hasPermission(userPermissions, meta.permission)
    ) {
      return false;
    }
    return (
      meta.label.toLowerCase().includes(lower) ||
      meta.keywords.some((kw) => kw.includes(lower))
    );
  });
}
