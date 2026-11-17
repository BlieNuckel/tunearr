import { getDataSource } from "./index";
import { UserSignalEvent } from "./entity/UserSignalEvent";

/** A user eligible for signal ingestion: enabled and holding a Plex token. */
export type SignalIngestionUser = {
  userId: number;
  plexToken: string;
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
    `SELECT id AS user_id, plex_token
     FROM users
     WHERE plex_token IS NOT NULL AND enabled = 1`
  )) as { user_id: number; plex_token: string }[];

  return rows.map((row) => ({
    userId: row.user_id,
    plexToken: row.plex_token,
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
