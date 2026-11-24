import type { MigrationInterface, QueryRunner } from "typeorm";

type HistoryRow = {
  id: number;
  user_id: number;
  payload: string;
  recorded_at: string;
};

type StoredEpisode = {
  ratingKey: string;
  viewedAt?: number;
  accountID?: number;
};

/** One history event split into the plays that are its user's and the ones that are not. */
type SplitRow = {
  row: HistoryRow;
  own: StoredEpisode[];
  foreign: StoredEpisode[];
};

type MovedBatch = { recordedAt: string; episodes: StoredEpisode[] };

/** The server reports its owner as this local account, never by plex.tv id. */
const OWNER_LOCAL_ACCOUNT_ID = 1;
const MAX_EPISODES_PER_EVENT = 2000;

const episodeKey = (episode: StoredEpisode): string =>
  `${episode.ratingKey}:${episode.viewedAt}`;

/**
 * A play belongs to the user it is stored under when it names their plex.tv account, or the
 * owner's local account `1`: only the owner's token can read the owner's plays, so whoever
 * stored a `1` held that token. A play with no account cannot be judged and stays.
 */
function belongsTo(episode: StoredEpisode, plexId: string | null): boolean {
  if (episode.accountID === undefined || episode.accountID === null) {
    return true;
  }
  return (
    episode.accountID === OWNER_LOCAL_ACCOUNT_ID ||
    String(episode.accountID) === plexId
  );
}

function splitRow(row: HistoryRow, plexId: string | null): SplitRow {
  const episodes: StoredEpisode[] =
    (JSON.parse(row.payload) as { episodes?: StoredEpisode[] }).episodes ?? [];
  return {
    row,
    own: episodes.filter((e) => belongsTo(e, plexId)),
    foreign: episodes.filter((e) => !belongsTo(e, plexId)),
  };
}

async function rewriteRow(
  queryRunner: QueryRunner,
  { row, own }: SplitRow
): Promise<void> {
  if (own.length === 0) {
    await queryRunner.query(`DELETE FROM "user_signal_events" WHERE "id" = ?`, [
      row.id,
    ]);
    return;
  }
  await queryRunner.query(
    `UPDATE "user_signal_events" SET "payload" = ? WHERE "id" = ?`,
    [JSON.stringify({ episodes: own }), row.id]
  );
}

async function appendMoved(
  queryRunner: QueryRunner,
  userId: number,
  batches: MovedBatch[],
  seen: Set<string>
): Promise<void> {
  for (const { recordedAt, episodes } of batches) {
    const fresh = episodes.filter((e) => !seen.has(episodeKey(e)));
    fresh.forEach((e) => seen.add(episodeKey(e)));
    for (let i = 0; i < fresh.length; i += MAX_EPISODES_PER_EVENT) {
      await queryRunner.query(
        `INSERT INTO "user_signal_events" ("user_id", "kind", "payload", "recorded_at")
         VALUES (?, 'plex_listen_history', ?, ?)`,
        [
          userId,
          JSON.stringify({
            episodes: fresh.slice(i, i + MAX_EPISODES_PER_EVENT),
          }),
          recordedAt,
        ]
      );
    }
  }
}

function collectMoves(
  splits: SplitRow[],
  userByPlexId: Map<string, number>
): Map<number, MovedBatch[]> {
  const moves = new Map<number, MovedBatch[]>();
  for (const { row, foreign } of splits) {
    const byTarget = new Map<number, StoredEpisode[]>();
    for (const episode of foreign) {
      const target = userByPlexId.get(String(episode.accountID));
      if (target === undefined) continue;
      byTarget.set(target, [...(byTarget.get(target) ?? []), episode]);
    }
    for (const [target, episodes] of byTarget) {
      moves.set(target, [
        ...(moves.get(target) ?? []),
        { recordedAt: row.recorded_at, episodes },
      ]);
    }
  }
  return moves;
}

function ownKeysByUser(splits: SplitRow[]): Map<number, Set<string>> {
  const keys = new Map<number, Set<string>>();
  for (const { row, own } of splits) {
    const set = keys.get(row.user_id) ?? new Set<string>();
    own.forEach((e) => set.add(episodeKey(e)));
    keys.set(row.user_id, set);
  }
  return keys;
}

/**
 * Play history used to be read with each user's own token and no account filter, and the
 * server owner's token returns every account's plays (#405). Each stored play names its
 * account, so the ones filed under the wrong user move to the user linked to that account,
 * skipping any that user already has, or are dropped when no user is linked to it. Moved
 * plays keep the timestamp of the event they came from.
 */
export class HistoryAccountCleanup1733000000000 implements MigrationInterface {
  name = "HistoryAccountCleanup1733000000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    const users = (await queryRunner.query(
      `SELECT "id", "plex_id" FROM "users"`
    )) as { id: number; plex_id: string | null }[];
    const plexIdByUser = new Map(users.map((u) => [u.id, u.plex_id]));
    const userByPlexId = new Map(
      users.filter((u) => u.plex_id).map((u) => [u.plex_id as string, u.id])
    );

    const rows = (await queryRunner.query(
      `SELECT "id", "user_id", "payload", "recorded_at" FROM "user_signal_events"
       WHERE "kind" = 'plex_listen_history' ORDER BY "recorded_at", "id"`
    )) as HistoryRow[];
    const splits = rows.map((row) =>
      splitRow(row, plexIdByUser.get(row.user_id) ?? null)
    );
    const misfiled = splits.filter((split) => split.foreign.length > 0);
    if (misfiled.length === 0) return;

    for (const split of misfiled) await rewriteRow(queryRunner, split);

    const ownKeys = ownKeysByUser(splits);
    for (const [userId, batches] of collectMoves(misfiled, userByPlexId)) {
      await appendMoved(
        queryRunner,
        userId,
        batches,
        ownKeys.get(userId) ?? new Set()
      );
    }
  }

  /** The moves are corrections; putting plays back under the wrong user restores nothing worth having. */
  async down(): Promise<void> {}
}
