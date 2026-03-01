const GENERIC_DIR_NAMES = new Set([
  "music",
  "downloads",
  "complete",
  "shared",
  "soulseek",
  "slsk",
  "incoming",
  "files",
  "media",
  "audio",
  "my music",
]);

export function buildReleaseTitle(
  directory: string,
  formatTag?: string
): string {
  const parts = directory.split(/[/\\]/).filter(Boolean);
  const lastPart = parts[parts.length - 1] || directory;
  const suffix = formatTag ? ` [${formatTag}]` : "";

  if (lastPart.includes(" - ")) return lastPart + suffix;

  for (let i = parts.length - 2; i >= 0; i--) {
    if (!GENERIC_DIR_NAMES.has(parts[i].toLowerCase())) {
      return `${parts[i]} - ${lastPart}${suffix}`;
    }
  }

  return lastPart + suffix;
}
