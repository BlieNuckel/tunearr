import { getDataSource, UserLiveArtistState } from "./index";

/** The baseline columns a sweep writes; the rest are set by their own events. */
export type ArtistStateSnapshot = {
  closest_event_id: number | null;
  closest_distance_km: number | null;
  origin_lat: number | null;
  origin_lon: number | null;
  evaluated_at: string;
};

export type ArtistStateWrite = ArtistStateSnapshot & {
  notified_at?: string | null;
  dismissed_at?: string | null;
};

function repo() {
  return getDataSource().getRepository(UserLiveArtistState);
}

export async function listArtistStates(
  userId: number
): Promise<UserLiveArtistState[]> {
  return repo().find({ where: { user_id: userId } });
}

/**
 * Insert or overwrite one user's baseline for an artist. Only the fields given
 * are written on conflict, so a silent re-record keeps `notified_at` and
 * `dismissed_at` as they were.
 */
export async function saveArtistState(
  userId: number,
  artistMbid: string,
  write: ArtistStateWrite
): Promise<UserLiveArtistState> {
  await repo().upsert({ user_id: userId, artist_mbid: artistMbid, ...write }, [
    "user_id",
    "artist_mbid",
  ]);
  return repo().findOneOrFail({
    where: { user_id: userId, artist_mbid: artistMbid },
  });
}

/** Returns false when the row is not this user's. */
export async function dismissArtistState(
  userId: number,
  id: number,
  at: string
): Promise<boolean> {
  const result = await repo().update(
    { id, user_id: userId },
    { dismissed_at: at }
  );
  return (result.affected ?? 0) > 0;
}

/**
 * Forget every baseline whose follow is gone, so following an artist again
 * starts from a fresh, silent baseline rather than a stale one. Covers users
 * who unfollowed everything, whom the per-user pass no longer visits.
 */
export async function deleteUnfollowedArtistStates(): Promise<void> {
  await getDataSource().query(
    `DELETE FROM user_live_artist_state
     WHERE NOT EXISTS (
       SELECT 1 FROM followed_artists f
       WHERE f.user_id = user_live_artist_state.user_id
         AND f.artist_mbid = user_live_artist_state.artist_mbid
     )`
  );
}
