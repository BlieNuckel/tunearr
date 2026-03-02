import type {
  SlskdSearchResponse,
  SlskdFile,
  GroupedSearchResult,
} from "./types";

type DirectoryGroup = {
  username: string;
  directory: string;
  files: SlskdFile[];
  hasFreeUploadSlot: boolean;
  uploadSpeed: number;
};

const AUDIO_EXTENSIONS = new Set([
  ".flac",
  ".mp3",
  ".ogg",
  ".opus",
  ".m4a",
  ".aac",
  ".wma",
  ".wav",
  ".ape",
  ".wv",
  ".alac",
  ".aiff",
  ".aif",
]);

const LOSSLESS_EXTENSIONS = new Set([
  ".flac",
  ".ape",
  ".wv",
  ".wav",
  ".alac",
  ".aiff",
  ".aif",
]);

const CATEGORY_LOSSLESS = 3040;
const CATEGORY_MP3 = 3010;
const CATEGORY_OTHER_AUDIO = 3000;

const LOSSLESS_FORMAT_NAMES: Record<string, string> = {
  ".flac": "FLAC",
  ".wav": "WAV",
  ".ape": "APE",
  ".wv": "WavPack",
  ".alac": "ALAC",
  ".aiff": "AIFF",
  ".aif": "AIFF",
};

const OTHER_FORMAT_NAMES: Record<string, string> = {
  ".ogg": "OGG",
  ".opus": "Opus",
  ".m4a": "AAC",
  ".aac": "AAC",
  ".wma": "WMA",
};

export function groupSearchResults(
  responses: SlskdSearchResponse[]
): GroupedSearchResult[] {
  const groups = buildDirectoryGroups(responses);
  return groups.map(toGroupedResult).sort(compareResults);
}

function buildDirectoryGroups(
  responses: SlskdSearchResponse[]
): DirectoryGroup[] {
  const groupMap = new Map<string, DirectoryGroup>();

  for (const response of responses) {
    for (const file of response.files) {
      if (!isAudioFile(file.filename)) continue;

      const directory = extractDirectory(file.filename);
      const key = `${response.username}::${directory}`;

      let group = groupMap.get(key);
      if (!group) {
        group = {
          username: response.username,
          directory,
          files: [],
          hasFreeUploadSlot: response.hasFreeUploadSlot,
          uploadSpeed: response.uploadSpeed,
        };
        groupMap.set(key, group);
      }
      group.files.push(file);
    }
  }

  return Array.from(groupMap.values());
}

function toGroupedResult(group: DirectoryGroup): GroupedSearchResult {
  const totalSize = group.files.reduce((sum, f) => sum + f.size, 0);
  const avgBitRate = computeAverageBitRate(group.files);
  const category = categorizeFiles(group.files);

  return {
    guid: generateGuid(group.username, group.directory),
    username: group.username,
    directory: group.directory,
    files: group.files,
    totalSize,
    hasFreeUploadSlot: group.hasFreeUploadSlot,
    uploadSpeed: group.uploadSpeed,
    bitRate: avgBitRate,
    category,
    formatTag: buildFormatTag(group.files, category, avgBitRate),
  };
}

function compareResults(
  a: GroupedSearchResult,
  b: GroupedSearchResult
): number {
  if (a.hasFreeUploadSlot !== b.hasFreeUploadSlot) {
    return a.hasFreeUploadSlot ? -1 : 1;
  }
  return b.uploadSpeed - a.uploadSpeed;
}

function isAudioFile(filename: string): boolean {
  const ext = filename.slice(filename.lastIndexOf(".")).toLowerCase();
  return AUDIO_EXTENSIONS.has(ext);
}

function extractDirectory(filename: string): string {
  const lastSlash = Math.max(
    filename.lastIndexOf("\\"),
    filename.lastIndexOf("/")
  );
  return lastSlash === -1 ? "" : filename.slice(0, lastSlash);
}

function computeAverageBitRate(files: SlskdFile[]): number {
  const withBitRate = files.filter((f) => f.bitRate && f.bitRate > 0);
  if (withBitRate.length === 0) return 0;
  return Math.round(
    withBitRate.reduce((sum, f) => sum + f.bitRate!, 0) / withBitRate.length
  );
}

function categorizeFiles(files: SlskdFile[]): number {
  const allLossless = files.every((f) => {
    const ext = f.filename.slice(f.filename.lastIndexOf(".")).toLowerCase();
    return LOSSLESS_EXTENSIONS.has(ext);
  });
  if (allLossless) return CATEGORY_LOSSLESS;

  const allMp3 = files.every((f) => f.filename.toLowerCase().endsWith(".mp3"));
  if (allMp3) return CATEGORY_MP3;

  return CATEGORY_OTHER_AUDIO;
}

function getDominantExtension(files: SlskdFile[]): string {
  const counts = new Map<string, number>();
  for (const f of files) {
    const ext = f.filename.slice(f.filename.lastIndexOf(".")).toLowerCase();
    counts.set(ext, (counts.get(ext) ?? 0) + 1);
  }
  let best = "";
  let bestCount = 0;
  for (const [ext, count] of counts) {
    if (count > bestCount) {
      best = ext;
      bestCount = count;
    }
  }
  return best;
}

function buildFormatTag(
  files: SlskdFile[],
  category: number,
  bitRate: number
): string {
  if (category === CATEGORY_MP3) {
    return bitRate > 0 ? `MP3-${bitRate}` : "MP3";
  }

  const ext = getDominantExtension(files);

  if (category === CATEGORY_LOSSLESS) {
    const format = LOSSLESS_FORMAT_NAMES[ext] ?? "FLAC";
    const has24bit = files.some((f) => f.bitDepth != null && f.bitDepth >= 24);
    return has24bit ? `${format} 24bit` : format;
  }

  return OTHER_FORMAT_NAMES[ext] ?? "";
}

function generateGuid(username: string, directory: string): string {
  const input = `${username}::${directory}`;
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) - hash + input.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(36) + Date.now().toString(36);
}
