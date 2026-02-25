import { getAlbumTopTags, getTopAlbumsByTag } from "../api/lastfm/albums";
import { getArtistTopTags } from "../api/lastfm/artists";
import { getReleaseGroupIdFromRelease } from "../api/musicbrainz/releaseGroups";
import type { MusicBrainzReleaseGroup } from "../api/musicbrainz/types";
import { getConfigValue } from "../config";
import { weightedRandomPick, shuffle } from "../utils/random";
import type {
  TagWeight,
  ExplorationSuggestion,
  SuggestionsResponse,
} from "./types";

type LastfmAlbumCandidate = {
  name: string;
  mbid: string;
  artistName: string;
  artistMbid: string;
};

type ScoredCandidate = {
  candidate: LastfmAlbumCandidate;
  tags: string[];
};

async function fetchAlbumTags(
  artistName: string,
  albumName: string
): Promise<TagWeight[]> {
  let tags: TagWeight[] = [];
  try {
    tags = await getAlbumTopTags(artistName, albumName);
  } catch {
    tags = [];
  }

  if (tags.length < 3) {
    try {
      const artistTags = await getArtistTopTags(artistName);
      const existingNames = new Set(tags.map((t) => t.name.toLowerCase()));
      const supplemental = artistTags.filter(
        (t) => !existingNames.has(t.name.toLowerCase())
      );
      tags = [...tags, ...supplemental];
    } catch {
      // keep whatever we have
    }
  }

  return tags;
}

function mergeTags(
  existingTags: TagWeight[],
  newTags: TagWeight[]
): TagWeight[] {
  const map = new Map<string, TagWeight>();

  for (const tag of existingTags) {
    const key = tag.name.toLowerCase();
    const existing = map.get(key);
    if (existing) {
      existing.count += tag.count;
    } else {
      map.set(key, { name: tag.name, count: tag.count });
    }
  }

  for (const tag of newTags) {
    const key = tag.name.toLowerCase();
    const existing = map.get(key);
    if (existing) {
      existing.count += tag.count;
    } else {
      map.set(key, { name: tag.name, count: tag.count });
    }
  }

  return Array.from(map.values());
}

const YEAR_TAG_PATTERN = /^\d{4}$|^\d{2,4}s$/;

function filterNonGenreTags(
  tags: TagWeight[],
  genericTags: Set<string>
): TagWeight[] {
  return tags.filter(
    (t) =>
      !genericTags.has(t.name.toLowerCase()) &&
      !YEAR_TAG_PATTERN.test(t.name.trim())
  );
}

async function fetchCandidatesForTag(
  tag: string
): Promise<LastfmAlbumCandidate[]> {
  const page = String(Math.floor(Math.random() * 3) + 1);
  const result = await getTopAlbumsByTag(tag, page);
  return result.albums;
}

function filterCandidates(
  candidates: LastfmAlbumCandidate[],
  excludeMbids: Set<string>,
  sourceArtistName: string
): LastfmAlbumCandidate[] {
  return candidates.filter(
    (c) =>
      c.mbid &&
      !excludeMbids.has(c.mbid) &&
      c.artistName.toLowerCase() !== sourceArtistName.toLowerCase()
  );
}

async function resolveCandidateToReleaseGroup(
  candidate: LastfmAlbumCandidate
): Promise<MusicBrainzReleaseGroup | null> {
  const rgInfo = await getReleaseGroupIdFromRelease(candidate.mbid);
  if (!rgInfo) return null;

  return {
    id: rgInfo.id,
    score: 0,
    title: candidate.name,
    "primary-type": "Album",
    "first-release-date": rgInfo.firstReleaseDate,
    "artist-credit": [
      {
        name: candidate.artistName,
        artist: { id: candidate.artistMbid, name: candidate.artistName },
      },
    ],
  };
}

function scoreCandidatesByTagOverlap(
  candidateResults: { tag: string; candidates: LastfmAlbumCandidate[] }[],
  excludeSet: Set<string>,
  sourceArtistName: string
): ScoredCandidate[] {
  const candidateMap = new Map<string, ScoredCandidate>();

  for (const { tag, candidates } of candidateResults) {
    const valid = filterCandidates(candidates, excludeSet, sourceArtistName);
    for (const candidate of valid) {
      const existing = candidateMap.get(candidate.mbid);
      if (existing) {
        if (!existing.tags.includes(tag)) {
          existing.tags.push(tag);
        }
      } else {
        candidateMap.set(candidate.mbid, { candidate, tags: [tag] });
      }
    }
  }

  const scored = Array.from(candidateMap.values());
  scored.sort((a, b) => b.tags.length - a.tags.length);

  const grouped = new Map<number, ScoredCandidate[]>();
  for (const entry of scored) {
    const count = entry.tags.length;
    const group = grouped.get(count) ?? [];
    group.push(entry);
    grouped.set(count, group);
  }

  const result: ScoredCandidate[] = [];
  const tiers = Array.from(grouped.keys()).sort((a, b) => b - a);
  for (const tier of tiers) {
    result.push(...shuffle(grouped.get(tier)!));
  }

  return result;
}

export async function getSuggestions(
  artistName: string,
  albumName: string,
  excludeMbids: string[],
  accumulatedTags: TagWeight[]
): Promise<SuggestionsResponse> {
  const rawNewTags = await fetchAlbumTags(artistName, albumName);
  const allTags = mergeTags(accumulatedTags, rawNewTags);

  const config = getConfigValue("promotedAlbum");
  const genericTags = new Set(config.genericTags.map((t) => t.toLowerCase()));
  const filtered = filterNonGenreTags(allTags, genericTags);

  if (filtered.length === 0) {
    return { suggestions: [], newTags: allTags };
  }

  const pickedTags = weightedRandomPick(
    filtered,
    (t) => t.count,
    Math.min(5, filtered.length)
  );

  const excludeSet = new Set(excludeMbids);

  const candidateResults = await Promise.all(
    pickedTags.map(async (tag) => {
      try {
        const candidates = await fetchCandidatesForTag(tag.name);
        return { tag: tag.name, candidates };
      } catch {
        return { tag: tag.name, candidates: [] };
      }
    })
  );

  const ranked = scoreCandidatesByTagOverlap(
    candidateResults,
    excludeSet,
    artistName
  );

  const suggestions: ExplorationSuggestion[] = [];
  const usedRgIds = new Set<string>();

  for (const { candidate, tags } of ranked) {
    if (suggestions.length >= 3) break;

    if (excludeSet.has(candidate.mbid)) continue;

    try {
      const releaseGroup = await resolveCandidateToReleaseGroup(candidate);
      if (!releaseGroup) continue;
      if (usedRgIds.has(releaseGroup.id)) continue;
      if (excludeSet.has(releaseGroup.id)) continue;

      usedRgIds.add(releaseGroup.id);
      excludeSet.add(releaseGroup.id);
      suggestions.push({ releaseGroup, tags });
    } catch {
      continue;
    }
  }

  return { suggestions, newTags: allTags };
}
