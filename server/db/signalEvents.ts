import { getDataSource } from "./index";
import { UserSignalEvent } from "./entity/UserSignalEvent";

/** A user eligible for signal ingestion: enabled and holding a Plex token. */
export type SignalIngestionUser = {
  userId: number;
  /** The name the rest of the app shows for this user, for log lines. */
  displayName: string;
  plexToken: string;
  /** The plex.tv account the user is linked to; null for a user who only holds a token. */
  plexAccountId: string | null;
};

/** An enabled user linked to a plex.tv account, for attributing server-wide reads. */
export type PlexLinkedUser = {
  userId: number;
  displayName: string;
  plexAccountId: string;
};

/**
 * Append many events of one kind in a single insert. Rows share a `recorded_at`, and
 * `getSignalEvents` breaks that tie on `id`, so insertion order is preserved on read —
 * which is what the last-write-wins folds depend on.
 */
export async function appendSignalEvents(
  userId: number,
  kind: string,
  payloads: unknown[]
): Promise<void> {
  if (payloads.length === 0) return;

  const repo = getDataSource().getRepository(UserSignalEvent);
  const recordedAt = new Date().toISOString();
  await repo.insert(
    payloads.map((payload) => ({
      user_id: userId,
      kind,
      payload: JSON.stringify(payload),
      recorded_at: recordedAt,
    }))
  );
}

/**
 * Every enabled user with a stored Plex token. Home servers have few users, so
 * a full sweep is cheap.
 */
export async function getSignalIngestionUsers(): Promise<
  SignalIngestionUser[]
> {
  const rows = (await getDataSource().query(
    `SELECT id AS user_id,
            COALESCE(username, plex_username, plex_email, 'unknown') AS display_name,
            plex_token,
            plex_id
     FROM users
     WHERE plex_token IS NOT NULL AND enabled = 1`
  )) as {
    user_id: number;
    display_name: string;
    plex_token: string;
    plex_id: string | null;
  }[];

  return rows.map((row) => ({
    userId: row.user_id,
    displayName: row.display_name,
    plexToken: row.plex_token,
    plexAccountId: row.plex_id,
  }));
}

/** Every enabled user linked to a plex.tv account, whether or not they hold a token. */
export async function getPlexLinkedUsers(): Promise<PlexLinkedUser[]> {
  const rows = (await getDataSource().query(
    `SELECT id AS user_id,
            COALESCE(username, plex_username, plex_email, 'unknown') AS display_name,
            plex_id
     FROM users
     WHERE plex_id IS NOT NULL AND enabled = 1`
  )) as { user_id: number; display_name: string; plex_id: string }[];

  return rows.map((row) => ({
    userId: row.user_id,
    displayName: row.display_name,
    plexAccountId: row.plex_id,
  }));
}

export async function getSignalEvents(
  userId: number,
  kind?: string
): Promise<UserSignalEvent[]> {
  const repo = getDataSource().getRepository(UserSignalEvent);
  return repo.find({
    where: kind ? { user_id: userId, kind } : { user_id: userId },
    order: { recorded_at: "ASC", id: "ASC" },
  });
}
