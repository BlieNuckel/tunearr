import { getDataSource, WantedItem } from "../../db/index";
import { getReleaseGroupById } from "../../api/musicbrainz/releaseGroups";
import { createLogger } from "../../logger";

type AddWantedResult =
  { status: "added"; id: number } | { status: "already_wanted"; id: number };

type RemoveWantedResult = { status: "removed" } | { status: "not_found" };

const log = createLogger("wanted");

function getWantedRepo() {
  return getDataSource().getRepository(WantedItem);
}

async function resolveAlbumInfo(
  albumMbid: string
): Promise<{ artistName: string; albumTitle: string }> {
  const info = await getReleaseGroupById(albumMbid);
  if (!info) {
    throw new Error(
      `Could not resolve release group ${albumMbid} on MusicBrainz`
    );
  }
  return info;
}

export async function addWantedItem(
  userId: number,
  albumMbid: string
): Promise<AddWantedResult> {
  const repo = getWantedRepo();

  const existing = await repo.findOne({
    where: { user_id: userId, album_mbid: albumMbid },
  });

  if (existing) {
    return { status: "already_wanted", id: existing.id };
  }

  const { artistName, albumTitle } = await resolveAlbumInfo(albumMbid);

  const item = repo.create({
    user_id: userId,
    album_mbid: albumMbid,
    artist_name: artistName,
    album_title: albumTitle,
  });

  const saved = await repo.save(item);
  log.info(`User ${userId} added "${albumTitle}" to wanted list`);

  return { status: "added", id: saved.id };
}

export async function removeWantedItem(
  userId: number,
  albumMbid: string
): Promise<RemoveWantedResult> {
  const repo = getWantedRepo();

  const item = await repo.findOne({
    where: { user_id: userId, album_mbid: albumMbid },
  });

  if (!item) {
    return { status: "not_found" };
  }

  await repo.remove(item);
  log.info(`User ${userId} removed "${item.album_title}" from wanted list`);

  return { status: "removed" };
}

export async function getWantedItems(userId: number): Promise<WantedItem[]> {
  const repo = getWantedRepo();

  return repo.find({
    where: { user_id: userId },
    order: { created_at: "DESC" },
  });
}
