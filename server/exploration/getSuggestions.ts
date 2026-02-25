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

function filterGenericTags(
  tags: TagWeight[],
  genericTags: Set<string>
): TagWeight[] {
  return tags.filter((t) => !genericTags.has(t.name.toLowerCase()));
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
  const filtered = filterGenericTags(allTags, genericTags);

  if (filtered.length === 0) {
    return { suggestions: [], newTags: allTags };
  }

  const pickedTags = weightedRandomPick(
    filtered,
    (t) => t.count,
    Math.min(3, filtered.length)
  );

  const excludeSet = new Set(excludeMbids);
  const tagCandidatePairs: { tag: string; candidate: LastfmAlbumCandidate }[] =
    [];

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

  for (const { tag, candidates } of candidateResults) {
    const valid = filterCandidates(candidates, excludeSet, artistName);
    for (const candidate of valid) {
      tagCandidatePairs.push({ tag, candidate });
    }
  }

  const shuffled = shuffle(tagCandidatePairs);

  const suggestions: ExplorationSuggestion[] = [];
  const usedRgIds = new Set<string>();

  for (const { tag, candidate } of shuffled) {
    if (suggestions.length >= 3) break;

    if (excludeSet.has(candidate.mbid)) continue;

    try {
      const releaseGroup = await resolveCandidateToReleaseGroup(candidate);
      if (!releaseGroup) continue;
      if (usedRgIds.has(releaseGroup.id)) continue;
      if (excludeSet.has(releaseGroup.id)) continue;

      usedRgIds.add(releaseGroup.id);
      excludeSet.add(releaseGroup.id);
      suggestions.push({ releaseGroup, tag });
    } catch {
      continue;
    }
  }

  return { suggestions, newTags: allTags };
}
