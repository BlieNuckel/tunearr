import { getDataSource } from "../../../db/index";
import {
  recordArtistResolution,
  setUserLivePreferences,
  upsertSweptEvents,
} from "../../../db/liveEvents";
import type { SweptEvent } from "../../../db/liveEvents";

/** Seeding helpers for tests that run the tour logic against a real database. */

export const NOW = Date.parse("2026-11-20T12:00:00.000Z");
export const NOW_ISO = new Date(NOW).toISOString();

export const MALMO = { lat: 55.605, lon: 13.0038 };
export const COPENHAGEN = { lat: 55.6761, lon: 12.5683 };
export const BERLIN = { lat: 52.52, lon: 13.405 };
export const LYON = { lat: 45.764, lon: 4.8357 };

export type ShowSeed = {
  key: string;
  artist: string;
  date: string;
  at?: { lat: number; lon: number } | null;
  city?: string;
  status?: SweptEvent["event_status"];
};

export async function createUser(username: string): Promise<number> {
  await getDataSource().query("INSERT INTO users (username) VALUES (?)", [
    username,
  ]);
  const [{ id }] = (await getDataSource().query(
    "SELECT id FROM users WHERE username = ?",
    [username]
  )) as { id: number }[];
  return id;
}

/** A follow of an artist JamBase knows as `jambase:<artist>`. */
export async function follow(userId: number, artist: string): Promise<void> {
  await getDataSource().query(
    "INSERT INTO followed_artists (user_id, artist_mbid, artist_name) VALUES (?, ?, ?)",
    [userId, `mbid-${artist}`, artist]
  );
  await recordArtistResolution(`mbid-${artist}`, `jambase:${artist}`, NOW_ISO);
}

export async function unfollow(userId: number, artist: string): Promise<void> {
  await getDataSource().query(
    "DELETE FROM followed_artists WHERE user_id = ? AND artist_mbid = ?",
    [userId, `mbid-${artist}`]
  );
}

export async function locate(
  userId: number,
  at: { lat: number; lon: number } | null
): Promise<void> {
  await setUserLivePreferences(userId, {
    live_lat: at?.lat ?? null,
    live_lon: at?.lon ?? null,
  });
}

export async function sweep(shows: ShowSeed[]): Promise<void> {
  await upsertSweptEvents(
    shows.map((show) => ({
      event_key: show.key,
      name: `${show.artist} live`,
      event_date: show.date,
      previous_start_date: null,
      event_status: show.status ?? "scheduled",
      venue_name: `Venue ${show.key}`,
      venue_city: show.city ?? "Somewhere",
      venue_country: "SE",
      venue_lat: show.at === undefined ? MALMO.lat : (show.at?.lat ?? null),
      venue_lon: show.at === undefined ? MALMO.lon : (show.at?.lon ?? null),
      ticket_url: null,
      image_url: null,
      performers: [
        {
          artist_jambase_id: `jambase:${show.artist}`,
          artist_name: show.artist,
          is_headliner: true,
          performance_rank: 1,
        },
      ],
    })),
    NOW_ISO
  );
}

export async function eventId(key: string): Promise<number> {
  const [{ id }] = (await getDataSource().query(
    "SELECT id FROM live_events WHERE event_key = ?",
    [key]
  )) as { id: number }[];
  return id;
}

export async function changeStatus(
  key: string,
  status: SweptEvent["event_status"],
  changedAt: string
): Promise<void> {
  await getDataSource().query(
    "UPDATE live_events SET event_status = ?, status_changed_at = ? WHERE event_key = ?",
    [status, changedAt, key]
  );
}

export async function markGoing(userId: number, key: string): Promise<void> {
  await getDataSource().query(
    "INSERT INTO user_live_event_state (user_id, event_id, response, responded_at) VALUES (?, ?, 'going', ?)",
    [userId, await eventId(key), NOW_ISO]
  );
}

export async function artistState(userId: number, artist: string) {
  const [row] = (await getDataSource().query(
    "SELECT * FROM user_live_artist_state WHERE user_id = ? AND artist_mbid = ?",
    [userId, `mbid-${artist}`]
  )) as Record<string, unknown>[];
  return row ?? null;
}
